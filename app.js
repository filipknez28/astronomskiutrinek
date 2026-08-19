/* ===== Astronomski Utrinek — app.js ===== */

/* ---------- Konstante ---------- */
const LS_KEY = "astronomski-utrinek-articles-v1";
const SESSION_KEY = "astronomski-utrinek-admin";
const ADMIN_CODE = "123456789";          // skrbniška koda
const TRIGGER_TAPS = 10;                  // število tapov na skriti sprožilec
const TAP_WINDOW_MS = 2500;               // max razmik med dvema tapoma

/* ---------- Začetni (semeni) članki — prikažejo se tudi brez interneta ---------- */
const seedArticles = [
  {
    id: "seed-1",
    title: "Falcon 9 ponoči izstrelil 22 satelitov Starlink",
    summary: "Raketa SpaceX je s Cape Canaverala dvignila novo serijo satelitov za globalni internet. Prva stopnja je uspešno pristala na plavajoči ploščadi.",
    content: "Podjetje SpaceX je v jasni noči uspešno izstrelilo raketo Falcon 9 s 22 sateliti Starlink. Vzlet je potekal brez zapletov, prva stopnja rakete pa je že nekaj minut po izstrelitvi mehko pristala na avtonomni plovbi v Atlantskem oceanu.\n\nTo je bila že osemnajsta misija te stopnje, kar znova potrjuje načrt ponovne uporabnosti, ki je ceno dostopa v orbito v zadnjem desetletju občutno znižala.\n\nKonstelacija Starlink zdaj šteje več kot šest tisoč delujočih satelitov, ki pokrivajo tudi odročne predele Slovenije.",
    image: "assets/seed-launch.jpg",
    category: "Rakete",
    date: "2026-08-14",
    own: false
  },
  {
    id: "seed-2",
    title: "Rover Perseverance našel sledi starodavnega jezera na Marsu",
    summary: "Nove analize vzorcev iz kraterja Jezero kažejo, da je nekoč tam vztrajalo mirno jezero — idealno okolje za morebitno mikrobno življenje.",
    content: "Rover Perseverance je v kraterju Jezero odkril sedimentne plasti, ki po mnenju znanstvenikov dokazujejo, da je na tem mestu nekoč dolgo časa vztrajalo mirno jezero.\n\nPlasti kažejo na mirno odlaganje usedlin, kakršno poznamo z dna zemeljskih jezer, kar pomeni, da je okolje ostalo stabilno morda milijone let — dovolj dolgo, da bi se lahko razvilo mikrobno življenje.\n\nVzorci so bili shranjeni v epruvete in čakajo na prihodnjo misijo, ki jih bo pripeljala nazaj na Zemljo v podrobno analizo.",
    image: "assets/seed-mars.jpg",
    category: "Planeti",
    date: "2026-08-11",
    own: false
  },
  {
    id: "seed-3",
    title: "Komet C/2026 A3 bo viden s prostim očesom",
    summary: "Konec meseca bo mimo Zemlje švignil komet, ki bo po napovedih dovolj svetel za opazovanje brez daljnogleda. Pripravite si jasno zahodno obzorje.",
    content: "Astronomi napovedujejo, da bo komet C/2026 A3 v zadnjem tednu avgusta dosegel največjo svetlost in bo viden s prostim očesom, če bo vreme sodelovalo.\n\nKomet bo najlepše viden okoli 21. ure, nizko nad zahodnim obzorjem, kjer mu bo rep kazal proč od Sonca. Za opazovanje izberite kraj brez svetlobnega onesnaženja in si vzemite vsaj deset minut, da se oči privadijo na temo.\n\nPriporočamo daljnogled — že majhna povečava razkrije podrobnosti kome in modrikast rep.",
    image: "assets/seed-comet.jpg",
    category: "Opazovanje",
    date: "2026-08-09",
    own: false
  },
  {
    id: "seed-4",
    title: "Webb razkril novorojene zvezde v meglici NGC 1333",
    summary: "Vesoljski teleskop James Webb je v meglici NGC 1333 posnel zvezde v najzgodnejših fazah nastanka, skrite v gostih oblakih prahu.",
    content: "Teleskop James Webb je v infrardeči svetlobi pogledal v meglico NGC 1333, oddaljeno približno tisoč svetlobnih let, in razkril na desetine novorojenih zvezd.\n\nInfrardeča svetloba prodre skozi prah, ki v vidni svetlobi popolnoma zakrije zvezdne zibelke. Na posnetkih so vidni tudi curki snovi, ki jih mlade zvezde izstreljujejo s svojih polov.\n\nTakšna opazovanja pomagajo razumeti, kako je pred 4,6 milijarde let nastalo tudi naše Sonce.",
    image: "assets/seed-nebula.jpg",
    category: "Vesolje",
    date: "2026-08-06",
    own: false
  },
  {
    id: "seed-5",
    title: "Redka polarna svetloba nad Slovenijo",
    summary: "Zaradi močnega sončevega izbruha so nočno nebo nad Alpami osvetlili rdečkasti in zeleni zastori polarne svetlobe — prizor, ki ga pri nas vidimo le redko.",
    content: "Močan izbruh na Soncu je v nočno nebo nad Slovenijo prinesel polarno svetlobo, ki je bila vidna celo s prostim očesom.\n\nFotografi po vsej državi so zabeležili rdečkaste in zelene zastore nad Julijskimi Alpami. Rdeča barva nastaja visoko v ozračju, kjer nabiti delci sončevega vetra trčijo ob kisikove atome.\n\nSončev cikel se bliža svojemu vrhu, zato lahko podobne prizore pričakujemo še v prihodnjih mesecih. Spremljajte napovedi geomagnetne aktivnosti!",
    image: "assets/seed-aurora.jpg",
    category: "Opazovanje",
    date: "2026-08-03",
    own: false
  },
  {
    id: "seed-6",
    title: "Vzorec z asteroida Bennu skriva gradnike življenja",
    summary: "Analiza vzorca, ki ga je na Zemljo prinesla sonda OSIRIS-REx, je potrdila aminokisline in minerale, nastale v prisotnosti vode.",
    content: "Znanstveniki so v vzorcu asteroida Bennu potrdili prisotnost številnih aminokislin — gradnikov beljakovin — ter mineralov, ki nastajajo le ob daljšem stiku s tekočo vodo.\n\nTo podpira zamisel, da so gradniki življenja v mlado Osončje prispeli z asteroidi in kometi ter 'posejali' planete, med njimi tudi Zemljo.\n\nVzorec je bil odvzet leta 2023 med drznim dotikom površja in je doslej največji tovor tujega materiala, ki ga je prinesla avtomatska sonda.",
    image: "assets/hero.jpg",
    category: "Raziskave",
    date: "2026-07-28",
    own: false
  }
];

/* ---------- Stanje ---------- */
let ownArticles = loadArticles();
let apiArticles = [...seedArticles]; // privzeto: lokalna zbirka (dokler API ne odgovori)
let apiLive = false;
let featured = null;
let currentFilter = "Vse";
let searchTerm = "";
let editingId = null;

const CATEGORIES = ["Vesolje", "Planeti", "Rakete", "Opazovanje", "Raziskave"];

/* ---------- Pripomočki ---------- */
const $ = (id) => document.getElementById(id);

function loadArticles() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) { /* ignore */ }
  return [];
}
function saveArticles() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ownArticles)); } catch (e) { /* ignore */ }
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("sl-SI", { day: "numeric", month: "long", year: "numeric" });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function paragraphs(text) {
  return String(text ?? "")
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function makeId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) { /* ignore */ }
  return "a-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function guessCategory(title, summary) {
  const t = (title + " " + (summary || "")).toLowerCase();
  if (/mars|jupiter|saturn|vener|merkur|uran|neptun|pluto|lun|planet|exoplanet|proksim|bennu|asteroid|komet|comet|titan|evrop|encelad/.test(t)) return "Planeti";
  if (/raket|rocket|izstrel|launch|falcon|starship|ariane|soyuz|vulcan|new glenn|starlink|iss|postaja/.test(t)) return "Rakete";
  if (/teleskop|webb|hubble|observatorij|opazov|nebo|meteor|perzeid|mrk|eclipse|superlun|zvezda|auror|polarn/.test(t)) return "Opazovanje";
  if (/galaks|meglic|nebula|črna luknja|black hole|supernova|zvezda|kozm|dark matter|temna/.test(t)) return "Vesolje";
  return "Raziskave";
}

/* ---------- Zvezdno nebo (subtilno) ---------- */
function buildStarfield() {
  const el = $("starfield");
  if (!el) return;
  const n = Math.min(48, Math.floor(window.innerWidth / 28));
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    const size = Math.random() * 1.2 + 0.5;
    s.style.width = size + "px";
    s.style.height = size + "px";
    s.style.left = Math.random() * 100 + "vw";
    s.style.top = Math.random() * 100 + "vh";
    s.style.animationDelay = (Math.random() * 8).toFixed(2) + "s";
    s.style.animationDuration = (5 + Math.random() * 6).toFixed(2) + "s";
    frag.appendChild(s);
  }
  el.appendChild(frag);
}

function initChrome() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("is-scrolled", (window.scrollY || 0) > 12);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ---------- Tekoči pas novic (ticker) ---------- */
function fillTicker() {
  const track = $("tickerTrack");
  if (!track) return;
  const titles = allArticles().slice(0, 12).map((a) => a.title);
  if (!titles.length) {
    track.closest(".ticker").classList.add("hidden");
    return;
  }
  const items = titles
    .map((t) => `<span class="ticker-item">${escapeHtml(t)}</span>`)
    .join("");
  track.innerHTML = items + items; // podvojeno za neskončno zankanje
}

/* ---------- Prikaz ob prihodu (scroll reveal) ---------- */
let revealObserver = null;
function initReveal() {
  const els = document.querySelectorAll(".reveal:not(.is-visible)");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            revealObserver.unobserve(en.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -24px 0px" }
    );
  }
  els.forEach((el) => revealObserver.observe(el));
}

/* ---------- Viri novic (API + zaloga) ---------- */
async function fetchJson(url, ms = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadFeatured() {
  // Slika dneva (NASA APOD) — če ne uspe, uporabimo lokalno sliko.
  try {
    const d = await fetchJson("https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY");
    if (d && d.media_type === "image" && d.url) {
      featured = {
        id: "apod",
        title: d.title,
        summary: d.explanation,
        content: d.explanation,
        image: d.url,
        category: "Vesolje",
        date: d.date || new Date().toISOString().slice(0, 10),
        own: false,
        sourceUrl: d.hdurl || d.url,
        sourceLabel: "NASA APOD"
      };
      return;
    }
  } catch (e) { /* internet ni na voljo */ }
  featured = {
    id: "seed-featured",
    title: "Zemlja ponoči iz vesolja",
    summary: "Naš planet z orbite: tanek modri pas ozračja, svetlobe mest in Rimska cesta nad obzorjem. Vesolje je bližje, kot se zdi.",
    content: "Pogled na Zemljo z nizke orbite razkrije tanek modri pas ozračja, ki nas varuje pred sovražnim vesoljem.\n\nPod njim se lesketajo luči mest, nad njim pa se razpenja Rimska cesta. Vsaka od teh zvezd je sonce — mnoge imajo svoje planete.\n\nTa prizor vsak dan opazujejo astronavti na Mednarodni vesoljski postaji, ki Zemljo obkroži vsake 92 minut.",
    image: "assets/hero.jpg",
    category: "Vesolje",
    date: new Date().toISOString().slice(0, 10),
    own: false
  };
}

async function loadApiNews() {
  try {
    const data = await fetchJson(
      "https://api.spaceflightnewsapi.net/v4/articles/?limit=36&ordering=-published_at"
    );
    const items = (data && data.results) || [];
    apiArticles = items
      .filter((a) => a && a.title)
      .map((a) => ({
        id: "api-" + a.id,
        title: a.title,
        summary: a.summary || "",
        content: a.summary || a.title,
        image: a.image_url || "assets/hero.jpg",
        category: guessCategory(a.title, a.summary),
        date: (a.published_at || "").slice(0, 10),
        own: false,
        sourceUrl: a.url || null,
        sourceLabel: a.news_site || "Vir"
      }));
    apiLive = true;
  } catch (e) {
    // Internet ni na voljo — uporabimo lokalno zbirko člankov.
    apiArticles = [...seedArticles];
    apiLive = false;
  }
}

function allArticles() {
  return [...ownArticles, ...apiArticles].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ---------- Prikaz novic ---------- */
function matchesFilters(a) {
  if (currentFilter === "Uredniške" && !a.own) return false;
  if (CATEGORIES.includes(currentFilter) && a.category !== currentFilter) return false;
  if (searchTerm) {
    const hay = (a.title + " " + a.summary + " " + a.content).toLowerCase();
    if (!hay.includes(searchTerm)) return false;
  }
  return true;
}

function renderFeed() {
  const feed = $("feed");
  const list = allArticles().filter(matchesFilters);
  const info = $("feedInfo");

  if (list.length === 0) {
    feed.innerHTML = "";
    $("feedStatus").classList.remove("hidden");
    $("feedStatus").innerHTML =
      "Ni zadetkov za izbrani filter ali iskalni niz.";
    return;
  }
  $("feedStatus").classList.add("hidden");

  feed.innerHTML = list
    .map((a) => {
      const badges =
        `<span class="badge">${escapeHtml(a.category)}</span>` +
        (a.own ? `<span class="badge badge-own">✍ Uredniška</span>` : "");
      const img = a.image
        ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" loading="lazy"
               onerror="this.parentElement.classList.add('no-img'); this.remove();" />`
        : "";
      return `
      <article class="news-card reveal" data-id="${escapeHtml(a.id)}" tabindex="0" role="button"
               aria-label="Preberi: ${escapeHtml(a.title)}">
        <div class="card-img ${img ? "" : "no-img"}">
          ${img}
          ${badges}
        </div>
        <div class="card-body">
          <time>${formatDate(a.date)}</time>
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml(a.summary)}</p>
          <button class="read-more">Preberi več →</button>
        </div>
      </article>`;
    })
    .join("");

  const ownCount = list.filter((a) => a.own).length;
  const srcText = apiLive ? "vir: Spaceflight News API" : "lokalna zbirka novic";
  const nPlural = (n) => (n === 1 ? "novica" : n === 2 ? "novici" : n === 3 || n === 4 ? "novice" : "novic");
  const oPlural = (n) => (n === 1 ? "ka" : n === 2 ? "ki" : n === 3 || n === 4 ? "ke" : "kih");
  info.textContent = `${list.length} ${nPlural(list.length)}${ownCount ? ` (od tega ${ownCount} uredniš${oPlural(ownCount)})` : ""} • ${srcText}`;

  feed.querySelectorAll(".news-card").forEach((card) => {
    const open = () => openArticle(card.dataset.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });

  initReveal();
}

function renderFeatured() {
  if (!featured) return;
  $("featuredImg").src = featured.image;
  $("featuredTitle").textContent = featured.title;
  $("featuredMeta").textContent = featured.date
    ? formatDate(featured.date) + (featured.own ? " • Uredniška novica" : "")
    : "";
  const card = $("featuredCard");
  card.onclick = () => openArticle(featured.id);
  card.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openArticle(featured.id); }
  };
}

function openArticle(id) {
  const a =
    allArticles().find((x) => x.id === id) ||
    (featured && featured.id === id ? featured : null);
  if (!a) return;
  $("articleModalImg").src = a.image || "assets/hero.jpg";
  $("articleModalImg").alt = a.title;
  $("articleModalBadge").textContent = a.own ? "✍ Uredniška" : a.category;
  $("articleModalDate").textContent = formatDate(a.date);
  $("articleModalTitle").textContent = a.title;
  $("articleModalSummary").textContent = a.summary || "";
  $("articleModalContent").innerHTML = paragraphs(a.content);
  const link = $("articleModalLink");
  if (a.sourceUrl) {
    link.href = a.sourceUrl;
    link.textContent = a.sourceLabel ? `Preberi izvirni vir: ${a.sourceLabel} ↗` : "Preberi izvirni vir ↗";
    link.classList.remove("hidden");
  } else {
    link.classList.add("hidden");
  }
  showModal("articleModal");
}

/* ---------- Modali (prikažejo se takoj, brez animacij) ---------- */
function showModal(id) {
  const el = $(id);
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function hideModal(id) {
  const el = $(id);
  el.classList.add("hidden");
  el.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.addEventListener("click", (e) => {
  const closer = e.target.closest("[data-close]");
  if (closer) hideModal(closer.dataset.close);
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  ["articleModal", "loginModal", "adminPanel"].forEach((id) => {
    if (!$(id).classList.contains("hidden")) hideModal(id);
  });
});

/* ---------- Skriti sprožilec: 10 tapov, brez povratne informacije ---------- */
let tapCount = 0;
let lastTapAt = 0;

function initSecretTrigger() {
  const trigger = $("secretTrigger");
  trigger.addEventListener("pointerdown", (e) => {
    e.preventDefault(); // brez kakršnekoli animacije ali označevanja
    const now = Date.now();
    if (now - lastTapAt > TAP_WINDOW_MS) tapCount = 0;
    lastTapAt = now;
    tapCount += 1;
    if (tapCount >= TRIGGER_TAPS) {
      tapCount = 0;
      if (isAdmin()) openAdmin();
      else {
        showModal("loginModal");
        $("adminCode").focus();
      }
    }
  });
}

/* ---------- Skrbniški dostop ---------- */
function isAdmin() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

function initLogin() {
  const codeInput = $("adminCode");
  const err = $("loginError");

  const tryLogin = () => {
    if (codeInput.value.trim() === ADMIN_CODE) {
      sessionStorage.setItem(SESSION_KEY, "1");
      codeInput.value = "";
      err.classList.add("hidden");
      hideModal("loginModal");
      openAdmin();
    } else {
      err.classList.remove("hidden");
      codeInput.select();
    }
  };

  $("submitCode").addEventListener("click", tryLogin);
  codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); tryLogin(); }
  });
}

/* ---------- Firebase oblak (opcijsko — glej firebase.js) ---------- */
let cloudStatus = "not-configured";

function fbReady() {
  try {
    return typeof FB !== "undefined" && typeof FB.isConfigured === "function" && FB.isConfigured();
  } catch (e) {
    return false;
  }
}

function setCloudStatus(state) {
  cloudStatus = state;
  const el = $("cloudStatus");
  if (!el) return;
  el.classList.remove("is-online", "is-offline");
  const messages = {
    online: "☁ Oblačna shramba (Firebase): povezano — članki so vidni vsem obiskovalcem.",
    offline: "Oblačna shramba: ni na voljo — članki so shranjeni samo v tem brskalniku.",
    "not-configured": "Oblačna shramba: ni nastavljena — članki se shranjujejo samo v tem brskalniku."
  };
  el.textContent = messages[state] || messages["not-configured"];
  if (state === "online") el.classList.add("is-online");
  if (state === "offline") el.classList.add("is-offline");
}

/* Ob zagonu preberi članke iz oblaka in jih združi z lokalnimi */
async function syncFromCloud() {
  if (!fbReady()) {
    setCloudStatus("not-configured");
    return;
  }
  try {
    const remote = await FB.loadArticles();
    if (Array.isArray(remote) && remote.length) {
      const map = new Map(remote.map((a) => [a.id, a]));
      // lokalni članki, ki jih še ni v oblaku, ostanejo
      ownArticles.forEach((a) => {
        if (!map.has(a.id)) map.set(a.id, a);
      });
      ownArticles = [...map.values()];
      saveArticles();
    }
    setCloudStatus("online");
  } catch (e) {
    setCloudStatus("offline");
  }
}

async function saveToCloud(article) {
  if (!fbReady()) {
    setCloudStatus("not-configured");
    return;
  }
  try {
    await FB.saveArticle(article);
    setCloudStatus("online");
  } catch (e) {
    setCloudStatus("offline");
  }
}

async function deleteFromCloud(id) {
  if (!fbReady()) {
    setCloudStatus("not-configured");
    return;
  }
  try {
    await FB.deleteArticle(id);
    setCloudStatus("online");
  } catch (e) {
    setCloudStatus("offline");
  }
}

/* ---------- Skrbniški meni: pisanje in upravljanje člankov ---------- */
function openAdmin() {
  editingId = null;
  resetForm();
  renderAdminList();
  showModal("adminPanel");
  setCloudStatus(cloudStatus);
  $("fTitle").focus();
}

function renderAdminList() {
  const ul = $("adminList");
  const sorted = [...ownArticles].sort((a, b) => (a.date < b.date ? 1 : -1));
  ul.innerHTML = sorted
    .map(
      (a) => `
      <li class="admin-list-item ${a.id === editingId ? "is-editing" : ""}" data-id="${escapeHtml(a.id)}">
        <div class="admin-item-text">
          <h5>${escapeHtml(a.title)}</h5>
          <p>${escapeHtml(a.category)} • ${formatDate(a.date)}</p>
        </div>
        <button class="admin-item-delete" data-delete="${escapeHtml(a.id)}"
                title="Izbriši članek" aria-label="Izbriši članek">🗑</button>
      </li>`
    )
    .join("");
  $("adminListEmpty").classList.toggle("hidden", sorted.length > 0);

  ul.querySelectorAll(".admin-list-item").forEach((li) => {
    li.addEventListener("click", (e) => {
      if (e.target.closest("[data-delete]")) return; // klik na koš za brisanje
      loadIntoForm(li.dataset.id);
    });
  });
}

function loadIntoForm(id) {
  const a = ownArticles.find((x) => x.id === id);
  if (!a) return;
  editingId = a.id;
  $("formTitle").textContent = "Urejanje: " + a.title;
  $("fTitle").value = a.title;
  $("fCategory").value = CATEGORIES.includes(a.category) ? a.category : "Vesolje";
  $("fImage").value = a.image || "";
  $("fSummary").value = a.summary || "";
  $("fContent").value = a.content || "";
  renderAdminList();
  $("fTitle").focus();
}

function resetForm() {
  editingId = null;
  $("formTitle").textContent = "Nova novica";
  $("fTitle").value = "";
  $("fCategory").value = "Vesolje";
  $("fImage").value = "";
  $("fSummary").value = "";
  $("fContent").value = "";
  renderAdminList();
}

function initAdmin() {
  $("newArticle").addEventListener("click", resetForm);
  $("resetForm").addEventListener("click", resetForm);
  $("adminClose").addEventListener("click", () => hideModal("adminPanel"));
  $("adminLogout").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    hideModal("adminPanel");
  });

  $("articleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("fTitle").value.trim();
    const summary = $("fSummary").value.trim();
    const content = $("fContent").value.trim();
    if (!title || !summary || !content) return;

    const data = {
      title,
      summary,
      content,
      image: $("fImage").value.trim() || "",
      category: $("fCategory").value,
      date: new Date().toISOString().slice(0, 10),
      own: true
    };

    let article;
    if (editingId) {
      const idx = ownArticles.findIndex((x) => x.id === editingId);
      if (idx !== -1) {
        ownArticles[idx] = { ...ownArticles[idx], ...data };
        article = ownArticles[idx];
      }
    } else {
      article = { id: makeId(), ...data };
      ownArticles.unshift(article);
    }
    saveArticles();
    resetForm();
    renderAdminList();
    renderFeed();
    if (article) await saveToCloud(article);
  });

  // Izbriši članek (gumb v seznamu admin panela)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-delete]");
    if (!btn) return;
    const id = btn.dataset.delete;
    if (!confirm("Ali res želite izbrisati ta članek?")) return;
    ownArticles = ownArticles.filter((x) => x.id !== id);
    saveArticles();
    if (editingId === id) resetForm();
    else renderAdminList();
    renderFeed();
    await deleteFromCloud(id);
  });
}

/* ---------- Filtri in iskanje ---------- */
function initFilters() {
  $("chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    currentFilter = chip.dataset.filter;
    document.querySelectorAll(".chip").forEach((c) =>
      c.classList.toggle("is-active", c === chip)
    );
    renderFeed();
  });

  let debounce;
  $("searchInput").addEventListener("input", (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      searchTerm = e.target.value.trim().toLowerCase();
      renderFeed();
    }, 180);
  });
}

/* ---------- Zagon ---------- */
async function init() {
  buildStarfield();
  initChrome();
  initSecretTrigger();
  initLogin();
  initAdmin();
  initFilters();
  renderFeed();
  fillTicker();
  initReveal();

  await Promise.all([loadFeatured(), loadApiNews(), syncFromCloud()]);
  renderFeatured();
  renderFeed();
  fillTicker();
}

init();
