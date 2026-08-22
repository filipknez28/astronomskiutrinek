/* Hitri E2E test strani z jsdom (zaženi: node test-flow.js) */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const authJs = fs.readFileSync(path.join(__dirname, "auth.js"), "utf8");
const iconsJs = fs.readFileSync(path.join(__dirname, "icons.js"), "utf8");

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
    users: {},
    async loadRoles() { return { ...this.roles }; },
    async saveRole(id, obj) { this.roles[id] = { ...obj }; },
    async saveUser(u) { this.users = this.users || {}; if (u && u.id) this.users[u.id] = { ...u }; }
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
  const aboutCopy = fs.readFileSync(path.join(__dirname, "o-strani.html"), "utf8");
  check("O strani piše Nova luna in Altair",
    aboutCopy.includes("Nova luna") && aboutCopy.includes("Altair") &&
    !aboutCopy.includes("Nov luna") && !aboutCopy.includes("Atair"));

  // 1b. Logotip in favicon
  const headerLogo = document.querySelector(".site-header .brand-logo");
  check("Logotip v glavi je brez črnega okvirja",
    headerLogo && headerLogo.getAttribute("src") === "assets/logo-clean.png");
  // Google zahteva ikono, ki je večkratnik 48px (48, 96, 144 ...), zato 16/32/64 ne uporabljamo.
  check("Favicon uporablja /assets/favicon-48.png",
    !!document.querySelector("link[rel='icon'][href='/assets/favicon-48.png']"));

  check("Na voljo je večja ikona za Google (144px ali več)",
    !!document.querySelector("link[rel='icon'][href='/assets/favicon-144.png']") &&
    !!document.querySelector("link[rel='icon'][href='/assets/favicon-512.png']"));

  check("Ni ikon, ki niso večkratnik 48px (16/32/64)",
    [...document.querySelectorAll("link[rel='icon']")]
      .every((l) => !/favicon-(16|32|64)\.png/.test(l.getAttribute("href") || "")));
  check("Zunanji Spaceflight API je odstranjen",
    !appJs.includes("spaceflightnewsapi.net") && !appJs.includes("api.nasa.gov"));
  check("Na strani je urednik Filip Knez",
    document.getElementById("feed").textContent.includes("Filip Knez"));

  // 1c. Firebase + ločene strani
  const fbConfig = fs.readFileSync(path.join(__dirname, "firebase-config.js"), "utf8");
  check("firebase-config.js vsebuje URL prave baze",
    fbConfig.includes("astronomski-utrinek-2026-default-rtdb.europe-west1.firebasedatabase.app") &&
    !fbConfig.includes("VAS-PROJEKT"));
  check("firebase-config.js ima Google apiKey in Analytics",
    fbConfig.includes("AIzaSyDWbGOIuQWVIduOUoFYai9qi8N1zaqnL5s") &&
    fbConfig.includes("G-MC6BYYG33W"));
  check("robots.txt in sitemap obstajata",
    fs.existsSync(path.join(__dirname, "robots.txt")) &&
    fs.existsSync(path.join(__dirname, "sitemap.xml")) &&
    fs.readFileSync(path.join(__dirname, "robots.txt"), "utf8").includes("astronomskiutrinek.top"));
  check("Naslovnica ima SEO opis in canonical",
    !!document.querySelector("meta[name='description']") &&
    !!document.querySelector("link[rel='canonical']"));
  check("Na domači strani ni razdelka 'O strani'", !document.getElementById("o-strani"));
  check("Tekoči pas novic je odstranjen", !document.querySelector(".ticker") && !document.getElementById("tickerTrack"));
  check("Na domači strani ni overlaya članka", !document.getElementById("articleModal"));
  const aboutHtml = fs.readFileSync(path.join(__dirname, "o-strani.html"), "utf8");
  check("O strani je lastna stran", aboutHtml.includes("id=\"o-strani\"") && aboutHtml.includes("data-page=\"about\""));
  check("Podporni e-poštni naslov je na dnu strani",
    !!document.querySelector(".footer-support[href='mailto:filip.knez28@gmail.com']"));

  // 2. Sprožilec: 2 tapova -> nič, 3. tap -> skrbniška stran
  const trigger = document.getElementById("secretTrigger");
  check("Sprožilec je zdaj na vrstici 'Vse pravice pridržane'",
    trigger && trigger.textContent.includes("Vse pravice pridržane"));
  check("Stari napis 'Astronomski trinek 2620C' je odstranjen",
    !document.body.textContent.includes("2620C"));
  const tap = () => trigger.dispatchEvent(new home.MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
  for (let i = 0; i < 2; i++) tap();
  await tick(30);
  check("Po 2 tapih ostaneš na domači strani", nav.url === "");
  tap();
  await tick(30);
  check("Po 3 tapih gre na skrbniško stran", nav.url === "admin.html");

  // 3–4. Prijava na lastni strani
  const adminWin = boot("admin.html", "http://localhost/admin.html", { FB, nav: { url: "" } });
  await tick(80);
  check("Na skrbniški strani je prijavni obrazec viden", !adminWin.document.getElementById("loginModal").classList.contains("hidden"));
  check("Skrbniški meni je pred prijavo skrit", adminWin.document.getElementById("adminPanel").classList.contains("hidden"));

  const code = adminWin.document.getElementById("adminCode");
  code.value = "000000";
  adminWin.document.getElementById("submitCode").click();
  check("Napačna koda -> sporočilo o napaki", !adminWin.document.getElementById("loginError").classList.contains("hidden"));
  check("Napačna koda -> skrbniški meni ostane skrit", adminWin.document.getElementById("adminPanel").classList.contains("hidden"));

  code.value = "1237";
  adminWin.document.getElementById("submitCode").click();
  check("Pravilna koda -> prijava se zapre", adminWin.document.getElementById("loginModal").classList.contains("hidden"));
  check("Pravilna koda -> odpre se skrbniški meni", !adminWin.document.getElementById("adminPanel").classList.contains("hidden"));
  check("Uredniški profil kaže Filipa Kneza",
    adminWin.document.getElementById("profileName").textContent.includes("Filip Knez"));
  check("Urejevalnik ima orodja za slike in povezave",
    !!adminWin.document.getElementById("editorToolbar") &&
    !!adminWin.document.querySelector("[data-cmd='link']") &&
    !!adminWin.document.querySelector("[data-cmd='image-file']"));
  check("Studio za izrez naslovne slike je v uredništvu",
    !!adminWin.document.getElementById("cropStudio") &&
    !!adminWin.document.getElementById("cropZoom"));
  check("Admin ima gumb 'Shrani osnutek'",
    !!adminWin.document.getElementById("saveDraftBtn"));
  check("Admin ima način objave in datum za načrtovano objavo",
    !!adminWin.document.getElementById("fStatus") &&
    !!adminWin.document.getElementById("fPublishAt"));

  // 5. Ustvarjanje članka
  adminWin.document.getElementById("fTitle").value = "Testna novica iz admina";
  adminWin.document.getElementById("fCategory").value = "Vesolje";
  adminWin.document.getElementById("fSummary").value = "To je povzetek testne novice.";
  adminWin.document.getElementById("fContent").value = "Prvi odstavek.\n\nDrugi odstavek.";
  adminWin.document.getElementById("articleForm").dispatchEvent(new adminWin.MouseEvent("submit", { bubbles: true, cancelable: true }));
  await tick(30);
  const storageAfterCreate = dumpStorage(adminWin);
  check("Članek je shranjen v localStorage", JSON.parse(storageAfterCreate.local["astronomski-utrinek-articles-v1"]).length === 2);
  check("Članek se zapiše tudi v Firebase oblak",
    Object.keys(FB.cloud).length === 2 &&
    Object.values(FB.cloud).some((a) => a.title === "Testna novica iz admina"));
  check("Status oblaka: povezano", adminWin.document.getElementById("cloudStatus").textContent.includes("povezano"));

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
  const created = JSON.parse(storageAfterCreate.local["astronomski-utrinek-articles-v1"])
    .find((a) => a.title === "Testna novica iz admina");
  const artWin = boot("clanek.html", "http://localhost/" + articleNav.url, {
    FB,
    storage: dumpStorage(homeAfterCreate),
    nav: { url: "" }
  });
  await tick(400);
  check("Naslov v članku se ujema", artWin.document.getElementById("articleModalTitle").textContent === "Testna novica iz admina");
  check("Odstavki so izpisani", artWin.document.querySelectorAll("#articleModalContent p").length === 2);
  check("Članek je celostranski, ne overlay", artWin.document.body.dataset.page === "article" && !artWin.document.querySelector(".modal-backdrop"));
  check("Na članku so komentarji", !!artWin.document.getElementById("commentsBox"));

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
  check("Na komentarju je gumb za odgovor", !!zvezdinComment.querySelector(`[data-reply]`));
  zvezdinComment.querySelector(`[data-reply]`).click();
  await tick(30);
  check("Odgovor odpre vnosno polje", !!artWin.document.getElementById("replyArea-" + cid));
  artWin.document.getElementById("replyArea-" + cid).value = "Odgovor na Zvezdin komentar";
  artWin.document.getElementById("replyForm-" + cid).dispatchEvent(new artWin.MouseEvent("submit", { bubbles: true, cancelable: true }));
  await tick(60);
  check("Odgovor se prikaže kot vgnezdeni komentar",
    artWin.document.querySelectorAll(".comment.is-reply").length > 0 &&
    artWin.document.getElementById("commentList").textContent.includes("Odgovor na Zvezdin komentar"));
  // urejanje lastnega komentarja
  zvezdinComment.querySelector(`[data-edit]`).click();
  await tick(30);
  artWin.document.getElementById("editArea-" + cid).value = "Zvezdin urejen komentar";
  artWin.document.getElementById("editSave-" + cid).click();
  await tick(60);
  check("Uporabnik uredi svoj komentar",
    artWin.document.getElementById("commentList").textContent.includes("Zvezdin urejen komentar"));
  check("Urejen komentar je označen kot 'urejeno'",
    artWin.document.getElementById("commentList").textContent.includes("(urejeno)"));

  // 6c. Vloge in bani: lastnik poviša v moderatorja/admina in začasno banira
  const roleAdmin = boot("admin.html", "http://localhost/admin.html", {
    FB,
    storage: { local: dumpStorage(artWin).local, session: { "astronomski-utrinek-admin": "1" } },
    nav: { url: "" }
  });
  await tick(100);
  check("Lastnik vidi seznam uporabnikov", !!roleAdmin.document.getElementById("usersList"));
  check("Zvezda je v seznamu uporabnikov",
    roleAdmin.document.getElementById("usersList").textContent.includes("Zvezda"));
  const openDrawer = (uid) => {
    roleAdmin.document.querySelector('.user-card[data-uid="' + uid + '"]').click();
    return roleAdmin.document.getElementById("userDrawer");
  };
  const uid = roleAdmin.document.querySelector(".user-card[data-uid]").dataset.uid;
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

  // 7. Urejanje iz admin panela
  adminWin.document.querySelector(".admin-list-item").click();
  check("Klik na članek v adminu naloži v obrazec", adminWin.document.getElementById("fTitle").value === "Testna novica iz admina");
  adminWin.document.getElementById("fTitle").value = "Urejena testna novica";
  adminWin.document.getElementById("articleForm").dispatchEvent(new adminWin.MouseEvent("submit", { bubbles: true, cancelable: true }));
  await tick(30);
  const storageAfterEdit = dumpStorage(adminWin);
  const homeAfterEdit = boot("index.html", "http://localhost/index.html", { FB, storage: storageAfterEdit, nav: { url: "" } });
  await tick(400);
  check("Urejanje posodobi naslov na strani", homeAfterEdit.document.getElementById("feed").textContent.includes("Urejena testna novica"));
  check("Urejanje posodobi članek tudi v oblaku",
    Object.values(FB.cloud).some((a) => a.title === "Urejena testna novica"));

  // 8. Brisanje
  adminWin.document.querySelector(".admin-item-delete").click();
  await tick(30);
  const storageAfterDelete = dumpStorage(adminWin);
  const homeAfterDelete = boot("index.html", "http://localhost/index.html", { FB, storage: storageAfterDelete, nav: { url: "" } });
  await tick(400);
  check("Brisanje odstrani članek s strani", !homeAfterDelete.document.getElementById("feed").textContent.includes("Urejena testna novica"));
  check("Novica iz oblaka ostane na strani", homeAfterDelete.document.getElementById("feed").textContent.includes("Novica iz oblaka"));
  check("Brisanje posodobi localStorage (ostane le članek iz oblaka)", JSON.parse(storageAfterDelete.local["astronomski-utrinek-articles-v1"]).length === 1);
  check("Brisanje odstrani članek tudi iz Firebase oblaka",
    Object.keys(FB.cloud).length === 1 &&
    !Object.values(FB.cloud).some((a) => a.title === "Urejena testna novica"));
  check("Admin lista še vedno prikazuje preostali članek iz oblaka", adminWin.document.getElementById("adminListEmpty").classList.contains("hidden"));
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

  // 9. Iskanje in filter
  const search = homeAfterDelete.document.getElementById("searchInput");
  search.value = "oblaka";
  search.dispatchEvent(new homeAfterDelete.MouseEvent("input", { bubbles: true }));
  await tick(300);
  check("Iskanje 'oblaka' vrne 1 novico", homeAfterDelete.document.querySelectorAll("#feed .news-card").length === 1);
  search.value = "";
  search.dispatchEvent(new homeAfterDelete.MouseEvent("input", { bubbles: true }));
  await tick(300);
  const chipVesolje = [...homeAfterDelete.document.querySelectorAll(".chip")].find((c) => c.dataset.filter === "Vesolje");
  chipVesolje.click();
  check("Filter 'Vesolje' vrne 1 novico", homeAfterDelete.document.querySelectorAll("#feed .news-card").length === 1);
  homeAfterDelete.document.querySelector('.chip[data-filter="Vse"]').click();

  const authWin = boot("prijava.html", "http://localhost/prijava.html", { FB, nav: { url: "" } });
  await tick(50);
  check("Stran za prijavo obstaja", !!authWin.document.getElementById("loginForm"));
  check("Lahko ustvariš svoj profil", !!authWin.document.getElementById("registerForm"));
  check("Gumb za Google prijavo je tu", !!authWin.document.getElementById("googleBtn"));
  check("V profilu lahko spremeniš ime",
    !!authWin.document.getElementById("meNameInput") &&
    !!authWin.document.getElementById("saveNameBtn"));

  // 10b. Osnutki in načrtovane objave niso javno vidne
  const draftWin = boot("admin.html", "http://localhost/admin.html", {
    FB,
    storage: { local: {}, session: { "astronomski-utrinek-admin": "1" } },
    nav: { url: "" }
  });
  await tick(80);
  draftWin.document.getElementById("fTitle").value = "Skrit osnutek";
  draftWin.document.getElementById("fCategory").value = "Vesolje";
  draftWin.document.getElementById("fSummary").value = "Osnutek.";
  draftWin.document.getElementById("fContent").value = "Vsebina osnutka.";
  draftWin.document.getElementById("saveDraftBtn").click();
  await tick(40);
  const draftStorage = dumpStorage(draftWin);
  const draftSaved = JSON.parse(draftStorage.local["astronomski-utrinek-articles-v1"])
    .find((a) => a.title === "Skrit osnutek");
  check("Gumb 'Shrani osnutek' shrani kot osnutek", draftSaved && draftSaved.status === "draft");
  const homeWithDraft = boot("index.html", "http://localhost/index.html", { FB, storage: draftStorage, nav: { url: "" } });
  await tick(400);
  check("Osnutek ni viden na javni strani",
    !homeWithDraft.document.getElementById("feed").textContent.includes("Skrit osnutek"));

  const schedWin = boot("admin.html", "http://localhost/admin.html", {
    FB,
    storage: draftStorage,
    nav: { url: "" }
  });
  await tick(80);
  schedWin.document.getElementById("fTitle").value = "Načrtovana novica";
  schedWin.document.getElementById("fCategory").value = "Vesolje";
  schedWin.document.getElementById("fSummary").value = "Načrtovana.";
  schedWin.document.getElementById("fContent").value = "Vsebina načrtovane novice.";
  schedWin.document.getElementById("fStatus").value = "scheduled";
  const future = new Date(Date.now() + 7 * 864e5);
  const p = (n) => String(n).padStart(2, "0");
  schedWin.document.getElementById("fPublishAt").value =
    `${future.getFullYear()}-${p(future.getMonth() + 1)}-${p(future.getDate())}T${p(future.getHours())}:${p(future.getMinutes())}`;
  schedWin.document.getElementById("articleForm").dispatchEvent(
    new schedWin.MouseEvent("submit", { bubbles: true, cancelable: true })
  );
  await tick(40);
  const schedStorage = dumpStorage(schedWin);
  const schedSaved = JSON.parse(schedStorage.local["astronomski-utrinek-articles-v1"])
    .find((a) => a.title === "Načrtovana novica");
  check("Načrtovana objava se shrani z datumom", schedSaved && schedSaved.status === "scheduled" && !!schedSaved.publishAt);
  const homeWithSched = boot("index.html", "http://localhost/index.html", { FB, storage: schedStorage, nav: { url: "" } });
  await tick(400);
  check("Načrtovana objava ni viden na javni strani pred datumom",
    !homeWithSched.document.getElementById("feed").textContent.includes("Načrtovana novica"));

  // 10. Sprožilec brez povratne informacije
  const before = trigger.getAttribute("style");
  tap();
  check("Tap na sprožilec ne spremeni elementa (brez animacije)", trigger.getAttribute("style") === before);

  // 10c. Brisanje uporabnika iz portala
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

  // 11. Drsenje v portalu (zavihek Novice je najvišji)
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

  console.log(`\nRezultat: ${pass} opravljenih, ${fail} neuspešnih`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("Napaka v testu:", e); process.exit(1); });
