/* Hitri E2E test strani z jsdom (zaženi: node test-flow.js) */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

// stubi za okolje, ki ga jsdom nima
window.confirm = () => true;
window.fetch = () => Promise.reject(new Error("offline")); // brez interneta -> semena
window.crypto = window.crypto || require("crypto").webcrypto;

// simuliran Firebase oblak (namesto pravega Firebase strežnika)
window.FB = {
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

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log("  ✔", name); }
  else { fail++; console.log("  ✘", name); }
};
const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log("▶ Zagon aplikacije…");
  window.eval(appJs);
  await tick(400); // počakamo na (spodleteli) API klic

  // 1. Začetni prikaz: 6 semenskih novic + 1 novica iz oblaka
  const cards = document.querySelectorAll("#feed .news-card");
  check(`Prikazanih ${cards.length} novic (pričakovano 7)`, cards.length === 7);
  check("Novica iz Firebase oblaka je vidna na strani",
    document.getElementById("feed").textContent.includes("Novica iz oblaka"));
  check("Izpostavljena novica ima naslov", document.getElementById("featuredTitle").textContent.length > 5);

  // 1b. Logotip v glavi
  const headerLogo = document.querySelector(".site-header .brand-logo");
  check("Logotip v glavi kaže na originalni assets/aqw.png",
    headerLogo && headerLogo.getAttribute("src") && /^assets\/aqw\.png(\?v=\d+)?$/.test(headerLogo.getAttribute("src")));
  check("Favicon uporablja assets/favicon-32.png",
    !!document.querySelector("link[rel='icon'][href^='assets/favicon-32.png']"));

  // 1c. Firebase konfiguracija vsebuje pravi URL baze
  const fbConfig = fs.readFileSync(path.join(__dirname, "firebase-config.js"), "utf8");
  check("firebase-config.js vsebuje URL prave baze",
    fbConfig.includes("astronomski-utrinek-2026-default-rtdb.europe-west1.firebasedatabase.app") &&
    !fbConfig.includes("VAS-PROJEKT"));

  // 2. Sprožilec: 9 tapov -> nič, 10. tap -> prijavno okno
  const trigger = document.getElementById("secretTrigger");
  check("Sprožilec je zdaj na vrstici 'Vse pravice pridržane'",
    trigger && trigger.textContent.includes("Vse pravice pridržane"));
  check("Stari napis 'Astronomski trinek 2620C' je odstranjen",
    !document.body.textContent.includes("2620C"));
  const tap = () => trigger.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
  for (let i = 0; i < 9; i++) tap();
  await tick(30);
  check("Po 9 tapih je prijavno okno še skrito", document.getElementById("loginModal").classList.contains("hidden"));
  tap();
  await tick(30);
  check("Po 10 tapih se prikaže prijavno okno", !document.getElementById("loginModal").classList.contains("hidden"));

  // 3. Napačna koda
  const code = document.getElementById("adminCode");
  code.value = "000000";
  document.getElementById("submitCode").click();
  check("Napačna koda -> sporočilo o napaki", !document.getElementById("loginError").classList.contains("hidden"));
  check("Napačna koda -> skrbniški meni ostane skrit", document.getElementById("adminPanel").classList.contains("hidden"));

  // 4. Pravilna koda
  code.value = "123456789";
  document.getElementById("submitCode").click();
  check("Pravilna koda -> prijavno okno se zapre", document.getElementById("loginModal").classList.contains("hidden"));
  check("Pravilna koda -> odpre se skrbniški meni", !document.getElementById("adminPanel").classList.contains("hidden"));

  // 5. Ustvarjanje članka
  document.getElementById("fTitle").value = "Testna novica iz admina";
  document.getElementById("fCategory").value = "Vesolje";
  document.getElementById("fSummary").value = "To je povzetek testne novice.";
  document.getElementById("fContent").value = "Prvi odstavek.\n\nDrugi odstavek.";
  document.getElementById("articleForm").dispatchEvent(new window.MouseEvent("submit", { bubbles: true, cancelable: true }));
  await tick(30);
  const feedText = document.getElementById("feed").textContent;
  check("Nov članek se pojavi na vrhu strani", feedText.includes("Testna novica iz admina"));
  check("Članek je shranjen v localStorage", JSON.parse(window.localStorage.getItem("astronomski-utrinek-articles-v1")).length === 2);
  check("Članek ima značko 'Uredniška'", feedText.includes("Uredniška"));
  check("Članek se zapiše tudi v Firebase oblak",
    Object.keys(window.FB.cloud).length === 2 &&
    Object.values(window.FB.cloud).some((a) => a.title === "Testna novica iz admina"));
  check("Status oblaka: povezano", document.getElementById("cloudStatus").textContent.includes("povezano"));

  // 6. Branje članka iz feeda
  const firstCard = document.querySelector("#feed .news-card");
  firstCard.click();
  check("Klik na kartico odpre članek", !document.getElementById("articleModal").classList.contains("hidden"));
  check("Naslov v članku se ujema", document.getElementById("articleModalTitle").textContent === "Testna novica iz admina");
  check("Odstavki so izpisani", document.querySelectorAll("#articleModalContent p").length === 2);
  document.getElementById("articleModal").classList.add("hidden");

  // 7. Urejanje iz admin panela
  document.querySelector(".admin-list-item").click();
  check("Klik na članek v adminu naloži v obrazec", document.getElementById("fTitle").value === "Testna novica iz admina");
  document.getElementById("fTitle").value = "Urejena testna novica";
  document.getElementById("articleForm").dispatchEvent(new window.MouseEvent("submit", { bubbles: true, cancelable: true }));
  await tick(30);
  check("Urejanje posodobi naslov na strani", document.getElementById("feed").textContent.includes("Urejena testna novica"));
  check("Urejanje posodobi članek tudi v oblaku",
    Object.values(window.FB.cloud).some((a) => a.title === "Urejena testna novica"));

  // 8. Brisanje
  document.querySelector(".admin-item-delete").click();
  await tick(30);
  check("Brisanje odstrani članek s strani", !document.getElementById("feed").textContent.includes("Urejena testna novica"));
  check("Novica iz oblaka ostane na strani", document.getElementById("feed").textContent.includes("Novica iz oblaka"));
  check("Brisanje posodobi localStorage (ostane le članek iz oblaka)", JSON.parse(window.localStorage.getItem("astronomski-utrinek-articles-v1")).length === 1);
  check("Brisanje odstrani članek tudi iz Firebase oblaka",
    Object.keys(window.FB.cloud).length === 1 &&
    !Object.values(window.FB.cloud).some((a) => a.title === "Urejena testna novica"));
  check("Admin lista še vedno prikazuje preostali članek iz oblaka", document.getElementById("adminListEmpty").classList.contains("hidden"));

  // 9. Iskanje in filter
  const search = document.getElementById("searchInput");
  search.value = "NGC 1333";
  search.dispatchEvent(new window.MouseEvent("input", { bubbles: true }));
  await tick(300);
  check("Iskanje 'NGC 1333' vrne 1 novico", document.querySelectorAll("#feed .news-card").length === 1);
  search.value = "";
  search.dispatchEvent(new window.MouseEvent("input", { bubbles: true }));
  await tick(300);
  const chipRakete = [...document.querySelectorAll(".chip")].find((c) => c.dataset.filter === "Rakete");
  chipRakete.click();
  check("Filter 'Rakete' vrne 1 novico", document.querySelectorAll("#feed .news-card").length === 1);
  document.querySelector('.chip[data-filter="Vse"]').click();

  // 10. Preverjanje, da sprožilec nima povratne informacije (noben stil se ne spremeni ob tapu)
  const before = trigger.getAttribute("style");
  tap();
  check("Tap na sprožilec ne spremeni elementa (brez animacije)", trigger.getAttribute("style") === before);

  console.log(`\nRezultat: ${pass} opravljenih, ${fail} neuspešnih`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("Napaka v testu:", e); process.exit(1); });
