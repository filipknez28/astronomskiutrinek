/* Hitri E2E test strani z jsdom (zaženi: node test-flow.js) */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const authJs = fs.readFileSync(path.join(__dirname, "auth.js"), "utf8");
const iconsJs = fs.readFileSync(path.join(__dirname, "icons.js"), "utf8");

const EDITOR_SESSION = {
  id: "editor-google-1",
  name: "Filip Knez",
  email: "filip.knez28@gmail.com",
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
    async deleteArticleComments(articleId) { delete this.comments[articleId]; },
    async deleteComment(articleId, id) {
      if (this.comments[articleId]) delete this.comments[articleId][id];
    },
    async loadAllComments() {
      const out = [];
      Object.entries(this.comments).forEach(([articleId, list]) => {
        Object.entries(list || {}).forEach(([id, c]) => out.push({ ...c, id, articleId }));
      });
      return out;
    },
    async loadUsers() { return Object.values(this.users || {}); },
    async deleteUser(id) { if (this.users) delete this.users[id]; },
    async deleteRole(id) { delete this.roles[id]; },
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
  window.eval(iconsJs);
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

/* Obkljukaj kategorije v obrazcu (članek jih lahko ima več). */
function setFormCats(win, cats) {
  const boxes = win.document.querySelectorAll("#fCats input[name='fCat']");
  boxes.forEach((b) => { b.checked = cats.includes(b.value); });
  return boxes.length;
}

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
  check("firebase-config.js definira popravljeni uredniški e-naslov (filip.knez28@gmail.com)",
    fbConfig.includes("EDITOR_EMAILS") && fbConfig.includes("filip.knez28@gmail.com"));
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
  check("AUAuth prepozna urednika po popravljenem e-naslovu",
    home.AUAuth.isEditor({ email: "Filip.Knez28@Gmail.com" }) === true);
  check("AUAuth prepozna urednika tudi po starem e-naslovu",
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

  const readerAdmin = boot("admin.html", "http://localhost/admin.html", {
    FB,
    storage: { local: { "astronomski-utrinek-user": JSON.stringify({
      id: "reader-google-1", name: "Bralec", email: "bralec@test.si", provider: "google"
    }) } },
    nav: { url: "" }
  });
  await tick(80);
  check("Google prijava bralca ne odpre uredniškega portala",
    readerAdmin.document.getElementById("adminPanel").classList.contains("hidden") &&
    !readerAdmin.document.body.classList.contains("portal-open"));

  // 4. Prijavljen urednik (Google seja) → meni se odpre sam
  const ownerAdmin = boot("admin.html", "http://localhost/admin.html", {
    FB,
    storage: { local: { "astronomski-utrinek-user": JSON.stringify(EDITOR_SESSION) } },
    nav: { url: "" }
  });
  await tick(120);
  check("Urednikova Google seja samodejno odpre nadzorno ploščo",
    !ownerAdmin.document.getElementById("adminPanel").classList.contains("hidden"));
  check("Google prijava odpre celozaslonski portal in zaklene drsenje ozadja",
    ownerAdmin.document.body.classList.contains("portal-open") &&
    ownerAdmin.document.querySelectorAll("#adminPanel .portal-panel").length === 5);
  check("Uredniški profil kaže Filipa Kneza",
    ownerAdmin.document.getElementById("profileName").textContent.includes("Filip Knez"));
  check("Prikazan je urednikov e-naslov",
    ownerAdmin.document.getElementById("ownerEmail").textContent === "filip.knez28@gmail.com");
  check("Urejevalnik ima orodja za slike in povezave",
    !!ownerAdmin.document.getElementById("editorToolbar") &&
    !!ownerAdmin.document.querySelector("[data-cmd='link']") &&
    !!ownerAdmin.document.querySelector("[data-cmd='image-file']"));

  // 5. Nova novica: shrani in objavi takoj
  ownerAdmin.document.getElementById("fTitle").value = "Testna novica iz admina";
  setFormCats(ownerAdmin, ["Vesolje"]);
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
  check("Kartica kaže kategorijo namesto značke 'Uredniška'",
    feedText.includes("Vesolje") && !feedText.includes("Uredniška"));

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
  check("Na članku je vidna kategorija (ne več značka 'Uredniška')",
    artWin.document.getElementById("articleModalBadge").textContent.trim() === "Vesolje");

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

  // 6b-2: komentar s priloženo sliko in povezavo
  check("Pod člankom je gumb za sliko ali povezavo", !!artWin.document.getElementById("toggleExtras"));
  artWin.document.getElementById("toggleExtras").click();
  check("Polji za sliko in povezavo se odpreta",
    !artWin.document.getElementById("commentExtras").classList.contains("hidden"));
  artWin.document.getElementById("commentText").value = "Moj posnetek kometa";
  artWin.document.getElementById("commentImage").value = "https://primer.si/komet.jpg";
  artWin.document.getElementById("commentLink").value = "https://primer.si/vir";
  artWin.document.getElementById("commentForm").dispatchEvent(new artWin.MouseEvent("submit", { bubbles: true, cancelable: true }));
  await tick(80);
  check("Komentar prikaže priloženo sliko",
    !!artWin.document.querySelector("#commentList .comment-media img"));
  check("Komentar prikaže priloženo povezavo",
    !!artWin.document.querySelector("#commentList .comment-media .c-link"));
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
  const uid = artWin.AUAuth.current().id;
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
  const openDrawer = (uid) => {
    roleAdmin.document.querySelector('.user-card[data-uid="' + uid + '"]').click();
    return roleAdmin.document.getElementById("userDrawer");
  };
  let drawer = openDrawer(uid);
  check("Klik na uporabnika odpre predal s profilom",
    !drawer.classList.contains("hidden") && drawer.textContent.includes("Zvezda"));
  drawer.querySelector('[data-action="moderator"]').click();
  await tick(30);
  check("Lastnik poviša Zvezdo v moderatorja",
    FB.roles[uid] && FB.roles[uid].role === "moderator" &&
    roleAdmin.document.getElementById("usersList").textContent.includes("Moderator"));
  drawer = openDrawer(uid);
  drawer.querySelector('[data-action="ban-7"]').click();
  await tick(30);
  check("Lastnik začasno banira Zvezdo",
    FB.roles[uid] && FB.roles[uid].bannedUntil > Date.now() &&
    roleAdmin.document.getElementById("usersList").textContent.includes("Banan"));
  // banan uporabnik (še z veljavno prijavo) ne more več komentirati
  const bannedArt = boot("clanek.html", "http://localhost/" + articleNav.url, {
    FB,
    storage: dumpStorage(artWin),
    nav: { url: "" }
  });
  await tick(200);
  check("Banan uporabnik ne more komentirati",
    bannedArt.document.getElementById("commentForm").classList.contains("hidden") &&
    bannedArt.document.getElementById("commentGate").textContent.includes("banani"));
  drawer = openDrawer(uid);
  drawer.querySelector('[data-action="unban"]').click();
  await tick(30);
  check("Preklic bana ponastavi bannedUntil", !FB.roles[uid].bannedUntil);
  drawer = openDrawer(uid);
  drawer.querySelector('[data-action="admin"]').click();
  await tick(30);
  check("Lastnik poviša Zvezdo v admina",
    FB.roles[uid] && FB.roles[uid].role === "admin" &&
    roleAdmin.document.getElementById("usersList").textContent.includes("Admin"));


  // ===== Skrbniški portal: overlay, zavihki, uradni odgovori, uporabniki =====
  const panel = roleAdmin.document.getElementById("adminPanel");
  check("Skrbniški portal je celozaslonski overlay",
    panel.classList.contains("portal") && !panel.classList.contains("hidden"));
  check("Portal ima stransko navigacijo s petimi zavihki",
    roleAdmin.document.querySelectorAll(".portal-nav-btn").length === 5);
  check("Pregled prikaže statistične kartice",
    roleAdmin.document.querySelectorAll("#statGrid .stat-card").length === 4);
  check("Pregled prikaže zadnje komentarje",
    roleAdmin.document.getElementById("dashComments").textContent.includes("Zvezda"));

  const goTab = (t) => roleAdmin.document.querySelector('.portal-nav-btn[data-tab="' + t + '"]').click();
  goTab("articles");
  check("Zavihek Novice vsebuje urejevalnik člankov",
    roleAdmin.document.querySelector('.portal-panel[data-panel="articles"]').classList.contains("is-active") &&
    !!roleAdmin.document.getElementById("articleForm"));

  goTab("comments");
  await tick(30);
  check("Zavihek Komentarji prikaže niti bralcev",
    roleAdmin.document.querySelectorAll("#adminComments .thread").length >= 1);
  check("Nit prikaže sliko in povezavo iz komentarja",
    !!roleAdmin.document.querySelector("#adminComments .c-media img") &&
    !!roleAdmin.document.querySelector("#adminComments .c-media .c-link"));
  const replyForm = roleAdmin.document.querySelector("#adminComments .c-reply-form");
  replyForm.querySelector("input").value = "Hvala za posnetek, Zvezda!";
  replyForm.dispatchEvent(new roleAdmin.MouseEvent("submit", { bubbles: true, cancelable: true }));
  await tick(80);
  check("Uradni odgovor se pojavi v niti",
    roleAdmin.document.getElementById("adminComments").textContent.includes("Hvala za posnetek"));
  check("Uradni odgovor ima značko uredništva",
    !!roleAdmin.document.querySelector("#adminComments .badge-official"));
  const officialSaved = Object.values(FB.comments)
    .flatMap((list) => Object.values(list))
    .find((c) => c.text === "Hvala za posnetek, Zvezda!");
  check("Uradni odgovor se shrani v oblak z oznako official",
    !!officialSaved && officialSaved.official === true && officialSaved.name === "Filip Knez");

  goTab("users");
  await tick(30);
  const card = roleAdmin.document.querySelector("#usersList .user-card");
  check("Uporabniki so prikazani kot kartice", !!card && card.textContent.includes("Zvezda"));
  check("Kartica šteje komentarje, slike in povezave",
    card.querySelectorAll(".u-chip").length >= 3);
  const drawer2 = openDrawer(uid);
  check("Predal prikaže galerijo slik in povezave",
    !!roleAdmin.document.querySelector("#userDrawer .drawer-gallery img") &&
    !!roleAdmin.document.querySelector("#userDrawer .drawer-links .c-link"));
  check("Predal prikaže komentarje uporabnika",
    drawer2.textContent.includes("Moj posnetek kometa"));
  roleAdmin.document.getElementById("drawerClose").click();
  check("Predal se zapre", roleAdmin.document.getElementById("userDrawer").classList.contains("hidden"));

  goTab("profile");
  await tick(30);
  check("Moj profil ima značko uradnega profila",
    !!roleAdmin.document.querySelector('.portal-panel[data-panel="profile"] .verified-chip'));
  check("Moj profil našteje uradne odgovore",
    roleAdmin.document.getElementById("profileReplies").textContent.includes("Hvala za posnetek"));
  check("Moj profil vsebuje razdelek skupnosti",
    roleAdmin.document.getElementById("profileUsers").textContent.includes("Zvezda"));

  // uradni odgovor je viden tudi bralcem pod člankom
  const readerWin = boot("clanek.html", "http://localhost/" + articleNav.url, {
    FB, storage: { local: {}, session: {} }, nav: { url: "" }
  });
  await tick(300);
  check("Bralci vidijo uradni odgovor pod člankom",
    readerWin.document.getElementById("commentList").textContent.includes("Hvala za posnetek"));
  check("Uradni odgovor je posebej označen pri članku",
    !!readerWin.document.querySelector("#commentList .comment.is-official"));

  // 10. Odjava s skrbniške strani vrne na prijavo z Google
  roleAdmin.document.getElementById("adminLogout").click();
  await tick(30);
  check("Po odjavi je spet prijava z Google",
    !roleAdmin.document.getElementById("loginModal").classList.contains("hidden") &&
    roleAdmin.document.getElementById("adminPanel").classList.contains("hidden"));

  check("Odjava odstrani tudi zaklep drsenja portala",
    !roleAdmin.document.body.classList.contains("portal-open"));
  ownerAdmin.document.getElementById("adminLogout").click();
  await tick(30);
  check("Odjava urednika odstrani Google sejo in skrije portal",
    !ownerAdmin.AUAuth.current() &&
    ownerAdmin.document.getElementById("adminPanel").classList.contains("hidden") &&
    !ownerAdmin.document.body.classList.contains("portal-open"));

  // 11. Brisanje članka
  editAdmin.document.querySelector(".admin-item-delete").click();
  await tick(60);
  const storageAfterDelete = dumpStorage(editAdmin);
  check("Brisanje odstrani članek iz localStorage",
    !JSON.parse(storageAfterDelete.local["astronomski-utrinek-articles-v1"]).some((a) => a.id === created.id));
  check("Brisanje odstrani članek tudi iz Firebase oblaka",
    Object.keys(FB.cloud).length === 1 &&
    !Object.values(FB.cloud).some((a) => a.title === "Urejena testna novica"));
  check("Admin lista še vedno prikazuje preostali članek iz oblaka", editAdmin.document.getElementById("adminListEmpty").classList.contains("hidden"));
  check("Brisanje članka pobriše tudi njegove komentarje iz oblaka",
    !FB.comments[created.id] || Object.keys(FB.comments[created.id]).length === 0);
  check("Komentarji izbrisanega članka izginejo tudi iz brskalnika",
    !JSON.parse(storageAfterDelete.local["astronomski-utrinek-comments-v1"] || "{}")[created.id]);

  // 8b. Gumb za čiščenje ostankov starih (že izbrisanih) člankov
  FB.comments["stara-novica"] = {
    "c-smet": { id: "c-smet", name: "Zvezda", userId: "u-x", text: "Komentar pri izbrisani novici", date: new Date().toISOString() }
  };
  const purgeWin = boot("admin.html", "http://localhost/admin.html", {
    FB, storage: { local: {}, session: { "astronomski-utrinek-admin": "1" } }, nav: { url: "" }
  });
  await tick(200);
  purgeWin.document.querySelector('.portal-nav-btn[data-tab="comments"]').click();
  await tick(50);
  const purgeBtn = purgeWin.document.getElementById("purgeOrphans");
  check("Portal opozori na komentarje izbrisanih novic",
    purgeBtn && !purgeBtn.classList.contains("hidden") && purgeBtn.textContent.includes("(1)"));
  purgeBtn.click();
  await tick(150);
  check("Čiščenje odstrani osirotele komentarje iz oblaka", !FB.comments["stara-novica"]);

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

  // 14. Brisanje uporabnika iz portala
  FB.users["u-brisi"] = { id: "u-brisi", name: "Za brisanje", email: "brisi@test.si", avatar: "" };
  FB.roles["u-brisi"] = { role: "moderator", bannedUntil: null };
  FB.comments["cloud-1"] = {
    "c-brisi": { id: "c-brisi", name: "Za brisanje", userId: "u-brisi", text: "Komentar za brisanje", date: new Date().toISOString() }
  };
  const delWin = boot("admin.html", "http://localhost/admin.html", {
    FB, storage: { local: {}, session: { "astronomski-utrinek-admin": "1" } }, nav: { url: "" }
  });
  await tick(250);
  delWin.document.querySelector('.portal-nav-btn[data-tab="users"]').click();
  await tick(60);
  const delCard = [...delWin.document.querySelectorAll("#usersList .user-card")]
    .find((c) => c.dataset.uid === "u-brisi");
  check("Uporabnik je viden v portalu pred brisanjem", !!delCard);
  const delUid = delCard.dataset.uid;
  const commentsBefore = Object.values(FB.comments).flatMap((l) => Object.values(l)).filter((c) => c.userId === delUid).length;
  check("Uporabnik ima komentarje v oblaku", commentsBefore > 0);
  delCard.click();
  await tick(40);
  check("Predal ponuja brisanje uporabnika", !!delWin.document.getElementById("deleteUserBtn"));
  delWin.document.getElementById("deleteUserBtn").click();
  await tick(250);
  check("Uporabnik izgine iz seznama",
    !delWin.document.querySelector('.user-card[data-uid="' + delUid + '"]'));
  check("Uporabnik je izbrisan iz oblaka", !FB.users[delUid]);
  check("Vloga uporabnika je izbrisana", !FB.roles[delUid]);
  check("Komentarji izbrisanega uporabnika izginejo iz oblaka",
    Object.values(FB.comments).flatMap((l) => Object.values(l)).filter((c) => c.userId === delUid).length === 0);

  // 15. Drsenje v portalu (zavihek Novice je najvišji)
  const css = fs.readFileSync(path.join(__dirname, "styles.css"), "utf8");
  check("Vsebina portala ima lasten drsnik",
    /\.portal-scroll\s*\{[^}]*overflow-y:\s*auto/.test(css));
  check("Vsebina portala se sme skrčiti (min-height: 0)",
    /\.portal-scroll\s*\{[^}]*min-height:\s*0/.test(css) && /\.portal-main\s*\{[^}]*min-height:\s*0/.test(css));
  check("Mreža portala dovoli krčenje stolpcev",
    css.includes("grid-template-columns: 254px minmax(0, 1fr)") &&
    css.includes("grid-template-columns: 300px minmax(0, 1fr)"));
  check("Seznam člankov v portalu ne lovi drsenja",
    /\.portal-panel \.admin-list,\s*\.portal-panel \.cat-list \{[^}]*max-height:\s*none/.test(css));
  check("Razdelek Novice ni obrezan (overflow: visible)",
    /\.portal-panel \.admin-layout \{[^}]*overflow:\s*visible/.test(css));


  console.log("▶ Takojšen prikaz, več kategorij in izbor urednika…");

  // 16. Predpomnilnik brskalnika: pravi prikaz takoj ob osvežitvi
  const silentFB = makeFB();
  silentFB.cloud = {};
  silentFB.loadArticles = () => new Promise(() => {}); // oblak "molči"
  const cached = [{
    id: "cached-1", title: "Predpomnjena novica", summary: "Iz predpomnilnika.",
    content: "Vsebina.", image: "", category: "Planeti", date: "2026-09-10",
    own: true, status: "published"
  }];
  const instantWin = boot("index.html", "http://localhost/index.html", {
    FB: silentFB,
    storage: { local: { "astronomski-utrinek-articles-v1": JSON.stringify(cached) } },
    nav: { url: "" }
  });
  await tick(120);
  check("Ob osvežitvi se novice izrišejo takoj iz predpomnilnika (brez čakanja na Firebase)",
    instantWin.document.getElementById("feed").textContent.includes("Predpomnjena novica"));
  check("Izbor urednika se izriše takoj iz predpomnilnika",
    instantWin.document.getElementById("featuredTitle").textContent === "Predpomnjena novica");
  check("Števec novic takoj pokaže pravo število",
    /1 novica/.test(instantWin.document.getElementById("feedInfo").textContent));

  const loadingWin = boot("index.html", "http://localhost/index.html", { FB: silentFB, nav: { url: "" } });
  await tick(120);
  check("Brez predpomnilnika stran med nalaganjem ne trdi, da novic ni",
    loadingWin.document.getElementById("feedInfo").textContent.includes("Nalagam") &&
    loadingWin.document.getElementById("feedStatus").classList.contains("hidden"));

  // 17. Več kategorij na en članek (kljukice namesto spustnega seznama)
  const catFB = makeFB();
  const catAdmin = boot("admin.html", "http://localhost/admin.html", {
    FB: catFB,
    storage: { local: { "astronomski-utrinek-user": JSON.stringify(EDITOR_SESSION) } },
    nav: { url: "" }
  });
  await tick(150);
  check("V obrazcu so kljukice za kategorije (spustnega seznama ni več)",
    !catAdmin.document.getElementById("fCategory") &&
    catAdmin.document.querySelectorAll("#fCats input[name='fCat']").length >= 5);
  check("Privzeto je obkljukana natanko ena kategorija",
    catAdmin.document.querySelectorAll("#fCats input[name='fCat']:checked").length === 1);
  catAdmin.document.getElementById("fTitle").value = "Raketa in vesolje hkrati";
  catAdmin.document.getElementById("fSummary").value = "Povzetek dveh kategorij.";
  catAdmin.document.getElementById("fContent").value = "Vsebina.";
  setFormCats(catAdmin, ["Vesolje", "Rakete"]);
  catAdmin.document.getElementById("articleForm")
    .dispatchEvent(new catAdmin.MouseEvent("submit", { bubbles: true, cancelable: true }));
  await tick(100);
  const multi = Object.values(catFB.cloud).find((a) => a.title === "Raketa in vesolje hkrati");
  check("Članek se shrani z dvema kategorijama (in glavno kategorijo)",
    multi && multi.categories.join(",") === "Vesolje,Rakete" && multi.category === "Vesolje");

  const catHome = boot("index.html", "http://localhost/index.html", {
    FB: catFB, storage: dumpStorage(catAdmin), nav: { url: "" }
  });
  await tick(400);
  const multiCard = [...catHome.document.querySelectorAll("#feed .news-card")]
    .find((c) => c.textContent.includes("Raketa in vesolje hkrati"));
  check("Kartica pokaže obe kategoriji",
    multiCard && multiCard.querySelectorAll(".card-badges .badge").length === 2);
  const chip = (name) => [...catHome.document.querySelectorAll("#chips .chip")]
    .find((c) => c.dataset.filter === name);
  chip("Rakete").click();
  await tick(40);
  check("Bralec najde članek tudi pod drugo njegovo kategorijo",
    catHome.document.getElementById("feed").textContent.includes("Raketa in vesolje hkrati"));
  chip("Planeti").click();
  await tick(40);
  check("Pod kategorijo, ki je članek nima, ga ni",
    !catHome.document.getElementById("feed").textContent.includes("Raketa in vesolje hkrati"));

  const raketeInput = catAdmin.document.querySelector(".cat-item[data-cat='Rakete'] .cat-item-name");
  raketeInput.value = "Izstrelki";
  raketeInput.dispatchEvent(new catAdmin.Event("change", { bubbles: true }));
  await tick(100);
  const renamed = Object.values(catFB.cloud).find((a) => a.title === "Raketa in vesolje hkrati");
  check("Preimenovanje kategorije se prenese na članek (tudi v oblaku)",
    renamed && renamed.categories.join(",") === "Vesolje,Izstrelki" && renamed.category === "Vesolje");
  catAdmin.document.querySelector("[data-cat-delete='Izstrelki']").click();
  await tick(100);
  const afterDelete = Object.values(catFB.cloud).find((a) => a.title === "Raketa in vesolje hkrati");
  check("Brisanje kategorije se prenese na članek",
    afterDelete && afterDelete.categories.join(",") === "Vesolje");

  // 18. ⭐ Izbor urednika
  const starAdmin = boot("admin.html", "http://localhost/admin.html", {
    FB: catFB, storage: dumpStorage(catAdmin), nav: { url: "" }
  });
  await tick(200);
  check("Vsak članek v meniju ima zvezdico za izbor urednika",
    starAdmin.document.querySelectorAll("#adminList [data-feature]").length === 2);
  const starOf = (title) => [...starAdmin.document.querySelectorAll("#adminList [data-feature]")]
    .find((b) => b.closest(".admin-list-item").textContent.includes(title));
  starOf("Novica iz oblaka").click();
  await tick(100);
  const flagged = Object.values(catFB.cloud).filter((a) => a.featured);
  check("Klik na zvezdico označi članek kot izbor urednika (tudi v oblaku)",
    flagged.length === 1 && flagged[0].title === "Novica iz oblaka");
  check("Označen članek je v meniju označen",
    starAdmin.document.querySelectorAll("#adminList .admin-item-star.is-on").length === 1);
  starOf("Raketa in vesolje hkrati").click();
  await tick(100);
  const flagged2 = Object.values(catFB.cloud).filter((a) => a.featured);
  check("Prejšnja izbira se samodejno odznači (izbor urednika je samo en)",
    flagged2.length === 1 && flagged2[0].title === "Raketa in vesolje hkrati");
  const starHome = boot("index.html", "http://localhost/index.html", {
    FB: catFB, storage: dumpStorage(starAdmin), nav: { url: "" }
  });
  await tick(400);
  check("Naslovnica pokaže označeno novico kot izbor urednika",
    starHome.document.getElementById("featuredTitle").textContent === "Raketa in vesolje hkrati" &&
    starHome.document.getElementById("featuredBadge").textContent === "Izbor urednika");

  console.log(`\nRezultat: ${pass} opravljenih, ${fail} neuspešnih`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("Napaka v testu:", e); process.exit(1); });
