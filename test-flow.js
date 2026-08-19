/* Hitri E2E test strani z jsdom (zaženi: node test-flow.js) */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

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
    async loadArticles() { return Object.values(this.cloud); },
    async saveArticle(a) { this.cloud[a.id] = { ...a }; },
    async deleteArticle(id) { delete this.cloud[id]; }
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

  // 1. Začetni prikaz: 6 semenskih novic + 1 novica iz oblaka
  const cards = document.querySelectorAll("#feed .news-card");
  check(`Prikazanih ${cards.length} novic (pričakovano 7)`, cards.length === 7);
  check("Novica iz Firebase oblaka je vidna na strani",
    document.getElementById("feed").textContent.includes("Novica iz oblaka"));
  check("Izpostavljena novica ima naslov", document.getElementById("featuredTitle").textContent.length > 5);

  // 1b. Logotip in favicon
  const headerLogo = document.querySelector(".site-header .brand-logo");
  check("Logotip v glavi kaže na originalni assets/aqw.png",
    headerLogo && headerLogo.getAttribute("src") === "assets/aqw.png");
  check("Favicon uporablja assets/favicon-32.png",
    !!document.querySelector("link[rel='icon'][href='assets/favicon-32.png']"));
  check("Zunanji Spaceflight API je odstranjen",
    !appJs.includes("spaceflightnewsapi.net") && !appJs.includes("api.nasa.gov"));
  check("Na strani je urednik Filip Knez",
    document.getElementById("feed").textContent.includes("Filip Knez"));

  // 1c. Firebase + ločene strani
  const fbConfig = fs.readFileSync(path.join(__dirname, "firebase-config.js"), "utf8");
  check("firebase-config.js vsebuje URL prave baze",
    fbConfig.includes("astronomski-utrinek-2026-default-rtdb.europe-west1.firebasedatabase.app") &&
    !fbConfig.includes("VAS-PROJEKT"));
  check("Na domači strani ni razdelka 'O strani'", !document.getElementById("o-strani"));
  check("Tekoči pas novic je odstranjen", !document.querySelector(".ticker") && !document.getElementById("tickerTrack"));
  check("Na domači strani ni overlaya članka", !document.getElementById("articleModal"));
  const aboutHtml = fs.readFileSync(path.join(__dirname, "o-strani.html"), "utf8");
  check("O strani je lastna stran", aboutHtml.includes("id=\"o-strani\"") && aboutHtml.includes("data-page=\"about\""));

  // 2. Sprožilec: 9 tapov -> nič, 10. tap -> skrbniška stran
  const trigger = document.getElementById("secretTrigger");
  check("Sprožilec je zdaj na vrstici 'Vse pravice pridržane'",
    trigger && trigger.textContent.includes("Vse pravice pridržane"));
  check("Stari napis 'Astronomski trinek 2620C' je odstranjen",
    !document.body.textContent.includes("2620C"));
  const tap = () => trigger.dispatchEvent(new home.MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
  for (let i = 0; i < 9; i++) tap();
  await tick(30);
  check("Po 9 tapih ostaneš na domači strani", nav.url === "");
  tap();
  await tick(30);
  check("Po 10 tapih gre na skrbniško stran", nav.url === "admin.html");

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

  code.value = "123456789";
  adminWin.document.getElementById("submitCode").click();
  check("Pravilna koda -> prijava se zapre", adminWin.document.getElementById("loginModal").classList.contains("hidden"));
  check("Pravilna koda -> odpre se skrbniški meni", !adminWin.document.getElementById("adminPanel").classList.contains("hidden"));
  check("Uredniški profil kaže Filipa Kneza",
    adminWin.document.getElementById("profileName").textContent.includes("Filip Knez"));
  check("Urejevalnik ima orodja za slike in povezave",
    !!adminWin.document.getElementById("editorToolbar") &&
    !!adminWin.document.querySelector("[data-cmd='link']") &&
    !!adminWin.document.querySelector("[data-cmd='image-file']"));

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

  // 9. Iskanje in filter
  const search = homeAfterDelete.document.getElementById("searchInput");
  search.value = "NGC 1333";
  search.dispatchEvent(new homeAfterDelete.MouseEvent("input", { bubbles: true }));
  await tick(300);
  check("Iskanje 'NGC 1333' vrne 1 novico", homeAfterDelete.document.querySelectorAll("#feed .news-card").length === 1);
  search.value = "";
  search.dispatchEvent(new homeAfterDelete.MouseEvent("input", { bubbles: true }));
  await tick(300);
  const chipRakete = [...homeAfterDelete.document.querySelectorAll(".chip")].find((c) => c.dataset.filter === "Rakete");
  chipRakete.click();
  check("Filter 'Rakete' vrne 1 novico", homeAfterDelete.document.querySelectorAll("#feed .news-card").length === 1);
  homeAfterDelete.document.querySelector('.chip[data-filter="Vse"]').click();

  // 10. Sprožilec brez povratne informacije
  const before = trigger.getAttribute("style");
  tap();
  check("Tap na sprožilec ne spremeni elementa (brez animacije)", trigger.getAttribute("style") === before);

  console.log(`\nRezultat: ${pass} opravljenih, ${fail} neuspešnih`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("Napaka v testu:", e); process.exit(1); });
