/* Hitri E2E test strani z jsdom (zaženi: node test-flow.js) */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const authJs = fs.readFileSync(path.join(__dirname, "auth.js"), "utf8");

const EDITOR_SESSION = {
  id: "editor-google-1",
  name: "Filip Knez",
  email: "filip.knez@gmail.com",
  avatar: "",
  provider: "google"
};

function makeFB() {
  return {
    cloud: {
      "cloud-1": {
        id: "cloud-1",
        title: "Novica iz oblaka",
        summary: "Ta članek prihaja iz Firebase Realtime Database.",
        content: "Vsebina članka iz oblaka.",
        image: "",
        category: "Vesolje",
        date: "2026-08-18",
        own: true
      }
    },
    isConfigured: () => true,
    comments: {},
    roles: {},
    users: {},
    siteProfile: null,
    async loadArticles() { return Object.values(this.cloud); },
    async saveArticle(a) { this.cloud[a.id] = { ...a }; },
    async deleteArticle(id) { delete this.cloud[id]; },
    async loadComments(articleId) { return Object.values(this.comments[articleId] || {}); },
    async saveComment(articleId, c) {
      this.comments[articleId] = this.comments[articleId] || {};
      this.comments[articleId][c.id] = { ...c };
    },
    async deleteComment(articleId, id) {
      if (this.comments[articleId]) delete this.comments[articleId][id];
    },
    async loadRoles() { return { ...this.roles }; },
    async saveRole(id, obj) { this.roles[id] = { ...obj }; },
    async saveUser(u) { if (u && u.id) this.users[u.id] = { ...u }; },
    async loadSiteProfile() { return this.siteProfile; },
    async saveSiteProfile(p) { this.siteProfile = { ...p }; }
  };
}

function dumpStorage(win) {
  const local = {};
  for (let i = 0; i < win.localStorage.length; i++) {
    const k = win.localStorage.key(i);
    local[k] = win.localStorage.getItem(k);
  }
  const session = {};
  for (let i = 0; i < win.sessionStorage.length; i++) {
    const k = win.sessionStorage.key(i);
    session[k] = win.sessionStorage.getItem(k);
  }
  return { local, session };
}

function boot(htmlFile, url, { FB, storage, nav } = {}) {
  const html = fs.readFileSync(path.join(__dirname, htmlFile), "utf8");
  const dom = new JSDOM(html, { url, runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom;
  window.confirm = () => true;
  window.fetch = () => Promise.reject(new Error("offline"));
  window.crypto = window.crypto || require("crypto").webcrypto;
  window.FB = FB;
  window.__navigate = (u) => { nav.url = u; };
  if (storage) {
    Object.entries(storage.local || {}).forEach(([k, v]) => window.localStorage.setItem(k, v));
    Object.entries(storage.session || {}).forEach(([k, v]) => window.sessionStorage.setItem(k, v));
  }
  window.eval(authJs);
  window.eval(appJs);
  return window;
}

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log("  ✔", name); }
  else { fail++; console.log("  ✘", name); }
};
const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log("▶ Zagon aplikacije…");
  const FB = makeFB();
  const nav = { url: "" };
  const home = boot("index.html", "http://localhost/index.html", { FB, nav });
  const document = home.document;
  await tick(400);

  // 1. Začetni prikaz: samo novica iz oblaka (semena so izbrisana)
  const cards = document.querySelectorAll("#feed .news-card");
  check(`Prikazanih ${cards.length} novic (pričakovano 1)`, cards.length === 1);
  check("Novica iz Firebase oblaka je vidna na strani",
    document.getElementById("feed").textContent.includes("Novica iz oblaka"));
  check("Izpostavljena novica ima naslov", document.getElementById("featuredTitle").textContent.length > 5);
  check("Števec novic ni več nalaganje",
    !document.getElementById("feedInfo").textContent.includes("Nalagam"));

  // 1a. Preprost števec: vse objavljene novice so uredniške
  const infoText = document.getElementById("feedInfo").textContent;
  check("Števec piše '1 novica • Filip Knez'", /1 novica • Filip Knez/.test(infoText));
  check("Ni več 'od tega … uredniška' v števcu", !infoText.includes("od tega"));

  // Logotip v glavi
  const headerLogo = document.querySelector(".site-header .brand-logo");
  check("Logotip v glavi kaže na assets/logo-clean.png",
    headerLogo && headerLogo.getAttribute("src") === "assets/logo-clean.png");

  // 1b. Skriti sprožilec je odstranjen
  check("Noga nima več skritega sprožilca (secretTrigger)", !document.getElementById("secretTrigger"));
  check("V kodi ni skrbniške kode ADMIN_CODE", !appJs.includes("1237") && !appJs.includes("ADMIN_CODE"));
  check("V app.js ni več initSecretTrigger", !appJs.includes("initSecretTrigger"));

  // 1c. Firebase + ločene strani
  const fbConfig = fs.readFileSync(path.join(__dirname, "firebase-config.js"), "utf8");
  check("firebase-config.js vsebuje URL prave baze",
    fbConfig.includes("astronomski-utrinek-2026-default-rtdb.europe-west1.firebasedatabase.app") &&
    !fbConfig.includes("VAS-PROJEKT"));
  check("firebase-config.js definira uredniški e-naslov",
    fbConfig.includes("EDITOR_EMAILS") && fbConfig.includes("filip.knez@gmail.com"));
  check("robots.txt in sitemap obstajata",
    fs.existsSync(path.join(__dirname, "robots.txt")) &&
    fs.existsSync(path.join(__dirname, "sitemap.xml")) &&
    fs.readFileSync(path.join(__dirname, "robots.txt"), "utf8").includes("astronomskiutrinek.top"));
  check("Naslovnica ima SEO opis in canonical",
    !!document.querySelector("meta[name='description']") &&
    !!document.querySelector("link[rel='canonical']"));
  check("Tekoči pas novic je odstranjen", !document.querySelector(".ticker") && !document.getElementById("tickerTrack"));
  check("Na domači strani ni overlaya članka", !document.getElementById("articleModal"));

  // 2. Google prijava: urednik prepoznan, drug uporabnik ne
  check("AUAuth prepozna urednika po e-pošti",
    home.AUAuth.isEditor({ email: "Filip.Knez@Gmail.com" }) === true);
  check("Obiskovalec ni urednik",
    home.AUAuth.isEditor({ email: "nekdo@drugo.si" }) === false);

  console.log("▶ Uredništvo (nadzorna plošča)…");

  // 3. Admin stran brez seje: prijava z Google, brez kode
  const adminWin = boot("admin.html", "http://localhost/admin.html", { FB, nav: { url: "" } });
  await tick(80);
  check("Na skrbniški strani je prijava z Google",
    !!adminWin.document.getElementById("googleLoginBtn"));
  check("Vnos za skrbniško kodo je odstranjen",
    !adminWin.document.getElementById("adminCode") && !adminWin.document.getElementById("submitCode"));
  check("Skrbniški meni je pred prijavo skrit", adminWin.document.getElementById("adminPanel").classList.contains("hidden"));

  // 4. Prijavljen urednik (Google seja) → meni se odpre sam
  const ownerAdmin = boot("admin.html", "http://localhost/admin.html", {
    FB,
    storage: { local: { "astronomski-utrinek-user": JSON.stringify(EDITOR_SESSION) } },
    nav: { url: "" }
  });
  await tick(120);
  check("Urednikova Google seja samodejno odpre nadzorno ploščo",
    !ownerAdmin.document.getElementById("adminPanel").classList.contains("hidden"));
  check("Uredniški profil kaže Filipa Kneza",
    ownerAdmin.document.getElementById("profileName").textContent.includes("Filip Knez"));
  check("Prikazan je urednikov e-naslov",
    ownerAdmin.document.getElementById("ownerEmail").textContent === "filip.knez@gmail.com");
  check("Urejevalnik ima orodja za slike in povezave",
    !!ownerAdmin.document.getElementById("editorToolbar") &&
    !!ownerAdmin.document.querySelector("[data-cmd='link']") &&
    !!ownerAdmin.document.querySelector("[data-cmd='image-file']"));

  // 5. Nova novica: shrani in objavi takoj
  ownerAdmin.document.getElementById("fTitle").value = "Testna novica iz admina";
  ownerAdmin.document.getElementById("fCategory").value = "Vesolje";
  ownerAdmin.document.getElementById("fSummary").value = "To je povzetek testne novice.";
  ownerAdmin.document.getElementById("fContent").value = "Prvi odstavek.\n\nDrugi odstavek.";
  ownerAdmin.document.getElementById("articleForm").dispatchEvent(new ownerAdmin.MouseEvent("submit", { bubbles: true, cancelable: true }));
  await tick(60);
  const storageAfterCreate = dumpStorage(ownerAdmin);
  const created = JSON.parse(storageAfterCreate.local["astronomski-utrinek-articles-v1"])
    .find((a) => a.title === "Testna novica iz admina");
  check("Članek je shranjen v localStorage", JSON.parse(storageAfterCreate.local["astronomski-utrinek-articles-v1"]).length === 2);
  check("Nova novica je takoj objavljena (status published)", created && created.status === "published");
  check("Nova novica dobi današnji datum", created && created.date === new Date().toISOString().slice(0, 10));
  check("Članek se zapiše tudi v Firebase oblak",
    Object.keys(FB.cloud).length === 2 &&
    Object.values(FB.cloud).some((a) => a.title === "Testna novica iz admina"));
  check("Status oblaka: povezano", ownerAdmin.document.getElementById("cloudStatus").textContent.includes("povezano"));
  check("Objavljeni članek je v meniju nadzorne plošče",
    ownerAdmin.document.getElementById("adminList").textContent.includes("Testna novica iz admina"));

  const homeAfterCreate = boot("index.html", "http://localhost/index.html", { FB, storage: storageAfterCreate, nav: { url: "" } });
  await tick(400);
  const feedText = homeAfterCreate.document.getElementById("feed").textContent;
  check("Nov članek se pojavi na vrhu strani", feedText.includes("Testna novica iz admina"));
  check("Članek ima značko 'Uredniška'", feedText.includes("Uredniška"));

  // 6. Branje članka na lastni strani
  const articleNav = { url: "" };
  const firstCard = homeAfterCreate.document.querySelector("#feed .news-card");
  homeAfterCreate.__navigate = (u) => { articleNav.url = u; };
  firstCard.click();
  check("Klik na kartico odpre stran članka", /clanek\.html\?id=/.test(articleNav.url));
  const artWin = boot("clanek.html", "http://localhost/" + articleNav.url, {
    FB,
    storage: dumpStorage(homeAfterCreate),
    nav: { url: "" }
  });
  await tick(400);
  check("Naslov v članku se ujema", artWin.document.getElementById("articleModalTitle").textContent === "Testna novica iz admina");
  check("Odstavki so izpisani", artWin.document.querySelectorAll("#articleModalContent p").length === 2);

  // 6b. Komentarji: prijava, objava, odgovor, urejanje lastnega komentarja
  await artWin.AUAuth.register({ name: "Zvezda", email: "zvezda@test.si", password: "geslo123" });
  await tick(40);
  check("Prijavljen uporabnik lahko komentira",
    !artWin.document.getElementById("commentForm").classList.contains("hidden"));
  artWin.document.getElementById("commentText").value = "Prvi komentar Zvezde";
  artWin.document.getElementById("commentForm").dispatchEvent(new artWin.MouseEvent("submit", { bubbles: true, cancelable: true }));
  await tick(60);
  check("Komentar se prikaže v seznamu",
    artWin.document.getElementById("commentList").textContent.includes("Prvi komentar Zvezde"));
  const zvezdinComment = artWin.document.querySelector(".comment[data-cid]");
  const cid = zvezdinComment.dataset.cid;

  // 7. Popravek objavljene novice: datum in komentarji ostanejo, gumb je 'Popravi'
  const editAdmin = boot("admin.html", "http://localhost/admin.html", {
    FB,
    storage: { local: dumpStorage(artWin).local, session: { "astronomski-utrinek-admin": "1" } },
    nav: { url: "" }
  });
  await tick(120);
  editAdmin.document.querySelector(".admin-list-item").click();
  check("Klik na članek ga naloži v obrazec", editAdmin.document.getElementById("fTitle").value === "Testna novica iz admina");
  check("Pri urejanju se gumb preimenuje v 'Popravi'",
    editAdmin.document.getElementById("publishBtn").textContent === "Popravi");
  check("Možnost osnutka/načrtovanja je odstranjena iz obrazca",
    !editAdmin.document.getElementById("fStatus") && !editAdmin.document.getElementById("saveDraftBtn"));
  editAdmin.document.getElementById("fTitle").value = "Urejena testna novica";
  editAdmin.document.getElementById("articleForm").dispatchEvent(new editAdmin.MouseEvent("submit", { bubbles: true, cancelable: true }));
  await tick(60);
  const storageAfterEdit = dumpStorage(editAdmin);
  const edited = JSON.parse(storageAfterEdit.local["astronomski-utrinek-articles-v1"]).find((a) => a.id === created.id);
  check("Popravek ohrani isti ID (komentarji ostanejo)", edited && edited.id === created.id);
  check("Popravek ohrani izvirni datum objave", edited && edited.date === created.date);
  check("Popravek je označen (editedAt)", edited && !!edited.editedAt);
  check("Urejen naslov je v oblaku", Object.values(FB.cloud).some((a) => a.id === created.id && a.title === "Urejena testna novica"));

  const artAfterEdit = boot("clanek.html", "http://localhost/clanek.html?id=" + encodeURIComponent(created.id), {
    FB,
    storage: storageAfterEdit,
    nav: { url: "" }
  });
  await tick(400);
  check("Komentarji preživijo popravek (isti članek)",
    artAfterEdit.document.getElementById("commentList").textContent.includes("Prvi komentar Zvezde"));

  // 8. Osnutek (star podatek) ni ne v meniju ne javno
  const draftStorage = dumpStorage(editAdmin);
  const withDraft = JSON.parse(draftStorage.local["astronomski-utrinek-articles-v1"]);
  withDraft.push({
    id: "draft-1", title: "Skrit osnutek", summary: "Osnutek.", content: "Vsebina osnutka.",
    category: "Vesolje", date: new Date().toISOString().slice(0, 10), own: true, status: "draft"
  });
  draftStorage.local["astronomski-utrinek-articles-v1"] = JSON.stringify(withDraft);
  const draftAdmin = boot("admin.html", "http://localhost/admin.html", {
    FB, storage: { local: draftStorage.local, session: { "astronomski-utrinek-admin": "1" } }, nav: { url: "" }
  });
  await tick(120);
  check("Osnutek ni v meniju nadzorne plošče (samo objavljeno)",
    !draftAdmin.document.getElementById("adminList").textContent.includes("Skrit osnutek") &&
    draftAdmin.document.getElementById("adminList").textContent.includes("Urejena testna novica"));
  const homeWithDraft = boot("index.html", "http://localhost/index.html", { FB, storage: draftStorage, nav: { url: "" } });
  await tick(400);
  check("Osnutek ni viden na javni strani",
    !homeWithDraft.document.getElementById("feed").textContent.includes("Skrit osnutek"));

  // 9. Vloge in bani: lastnik upravlja uporabnike
  const uid = "u-" + Buffer.from("zvezda@test.si").toString("hex").slice(0, 8);
  FB.roles[uid] = { role: "user", bannedUntil: null };
  const roleAdmin = boot("admin.html", "http://localhost/admin.html", {
    FB,
    storage: {
      local: { ...draftStorage.local, "astronomski-utrinek-users-v1": JSON.stringify([{ id: uid, name: "Zvezda", email: "zvezda@test.si", pass: "" }]) },
      session: { "astronomski-utrinek-admin": "1" }
    },
    nav: { url: "" }
  });
  await tick(120);
  check("Lastnik vidi seznam uporabnikov",
    roleAdmin.document.getElementById("usersList").textContent.includes("Zvezda"));
  let row = roleAdmin.document.querySelector('.user-item[data-uid="' + uid + '"]');
  row.querySelector('[data-action="moderator"]').click();
  await tick(30);
  check("Lastnik poviša Zvezdo v moderatorja",
    FB.roles[uid] && FB.roles[uid].role === "moderator");
  row = roleAdmin.document.querySelector('.user-item[data-uid="' + uid + '"]');
  row.querySelector('[data-action="ban-7"]').click();
  await tick(30);
  check("Lastnik začasno banira Zvezdo",
    FB.roles[uid] && FB.roles[uid].bannedUntil > Date.now() &&
    roleAdmin.document.getElementById("usersList").textContent.includes("Banan"));
  row = roleAdmin.document.querySelector('.user-item[data-uid="' + uid + '"]');
  row.querySelector('[data-action="unban"]').click();
  await tick(30);
  check("Preklic bana ponastavi bannedUntil", !FB.roles[uid].bannedUntil);

  // 10. Odjava s skrbniške strani vrne na prijavo z Google
  roleAdmin.document.getElementById("adminLogout").click();
  await tick(30);
  check("Po odjavi je spet prijava z Google",
    !roleAdmin.document.getElementById("loginModal").classList.contains("hidden") &&
    roleAdmin.document.getElementById("adminPanel").classList.contains("hidden"));

  // 11. Brisanje članka
  editAdmin.document.querySelector(".admin-item-delete").click();
  await tick(60);
  const storageAfterDelete = dumpStorage(editAdmin);
  check("Brisanje odstrani članek iz localStorage",
    !JSON.parse(storageAfterDelete.local["astronomski-utrinek-articles-v1"]).some((a) => a.id === created.id));
  check("Brisanje odstrani članek tudi iz Firebase oblaka",
    !Object.values(FB.cloud).some((a) => a.id === created.id));

  // 12. Iskanje in filter (na končnem stanju: ostane samo novica iz oblaka)
  const homeFinal = boot("index.html", "http://localhost/index.html", { FB, storage: storageAfterDelete, nav: { url: "" } });
  await tick(400);
  const search = homeFinal.document.getElementById("searchInput");
  search.value = "oblaka";
  search.dispatchEvent(new homeFinal.MouseEvent("input", { bubbles: true }));
  await tick(300);
  check("Iskanje 'oblaka' vrne 1 novico", homeFinal.document.querySelectorAll("#feed .news-card").length === 1);
  search.value = "";
  search.dispatchEvent(new homeFinal.MouseEvent("input", { bubbles: true }));
  await tick(300);
  const chipVesolje = [...homeFinal.document.querySelectorAll(".chip")].find((c) => c.dataset.filter === "Vesolje");
  chipVesolje.click();
  check("Filter 'Vesolje' vrne 1 novico", homeFinal.document.querySelectorAll("#feed .news-card").length === 1);

  // 13. Prijava za obiskovalce (ostane kot je, z Google)
  const authWin = boot("prijava.html", "http://localhost/prijava.html", { FB, nav: { url: "" } });
  await tick(50);
  check("Stran za prijavo obstaja", !!authWin.document.getElementById("loginForm"));
  check("Gumb za Google prijavo je tu", !!authWin.document.getElementById("googleBtn"));
  check("V profilu lahko spremeniš ime",
    !!authWin.document.getElementById("meNameInput") &&
    !!authWin.document.getElementById("saveNameBtn"));

  console.log(`\nRezultat: ${pass} opravljenih, ${fail} neuspešnih`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("Napaka v testu:", e); process.exit(1); });
