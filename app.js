/* ===== Astronomski Utrinek — app.js ===== */

/* ---------- Konstante ---------- */
const LS_KEY = "astronomski-utrinek-articles-v1";
const SESSION_KEY = "astronomski-utrinek-admin";
const ADMIN_CODE = "1237";               // skrbniška koda
const TRIGGER_TAPS = 3;                   // število tapov na skriti sprožilec
const TAP_WINDOW_MS = 2500;               // max razmik med dvema tapoma

/* Ni privzetih člankov — arhiv napolni uredništvo. */
const seedArticles = [];

/* ---------- Stanje ---------- */
let ownArticles = loadArticles();
let featured = null;
const PROFILE_KEY = "astronomski-utrinek-profile-v1";
const DEFAULT_PROFILE = {
  name: "Filip Knez",
  role: "Urednik",
  avatar: "assets/filip-knez.jpg"
};
let currentFilter = "Vse";
let searchTerm = "";
let editingId = null;

const CAT_KEY = "astronomski-utrinek-categories-v1";
const DEFAULT_CATEGORIES = ["Vesolje", "Planeti", "Rakete", "Opazovanje", "Raziskave"];
let categoriesUpdatedAt = 0;
let categories = loadCategories();
const OPEN_KEY = "astronomski-utrinek-open";
const PAGE = (document.body && document.body.dataset.page) || "home";
const SITE_URL = String(window.SITE_URL || "https://astronomskiutrinek.top").replace(/\/+$/, "");

function absUrl(path) {
  if (!path) return SITE_URL + "/assets/hero.jpg";
  if (/^https?:\/\//i.test(path)) return path;
  return SITE_URL + "/" + String(path).replace(/^\//, "");
}

function upsertMeta(key, content, attr) {
  if (!content) return;
  attr = attr || "name";
  let el = document.head.querySelector("meta[" + attr + "=\"" + key + "\"]");
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector("link[rel=\"" + rel + "\"]");
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function applySeo(opts) {
  opts = opts || {};
  if (opts.title) {
    document.title = opts.title;
    upsertMeta("og:title", opts.title, "property");
    upsertMeta("twitter:title", opts.title);
  }
  if (opts.description) {
    upsertMeta("description", opts.description);
    upsertMeta("og:description", opts.description, "property");
    upsertMeta("twitter:description", opts.description);
  }
  const img = absUrl(opts.image || "assets/hero.jpg");
  upsertMeta("og:image", img, "property");
  upsertMeta("twitter:image", img);
  upsertMeta("og:url", SITE_URL + (opts.path || "/"), "property");
  upsertMeta("og:type", opts.type || "website", "property");
  upsertLink("canonical", SITE_URL + (opts.path || "/"));
  if (opts.jsonLd) upsertJsonLd("jsonld-dynamic", opts.jsonLd);
}

function orgJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: "Astronomski Utrinek",
    url: SITE_URL + "/",
    logo: absUrl("assets/favicon-512.png"),
    founder: { "@type": "Person", name: "Filip Knez" },
    inLanguage: "sl"
  };
}

function initPublicSeo() {
  if (PAGE === "home") {
    applySeo({
      title: "Astronomski Utrinek — novice iz vesolja",
      description: "Uredniške novice iz vesolja v slovenščini: odkritja, rakete, planeti in opazovanje nočnega neba.",
      path: "/",
      image: "assets/hero.jpg",
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          orgJsonLd(),
          {
            "@type": "WebSite",
            name: "Astronomski Utrinek",
            url: SITE_URL + "/",
            inLanguage: "sl",
            potentialAction: {
              "@type": "SearchAction",
              target: SITE_URL + "/novice?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }
        ]
      }
    });
  } else if (PAGE === "news") {
    applySeo({
      title: "Novice — Astronomski Utrinek",
      description: "Arhiv uredniških astronomskih novic v slovenščini.",
      path: "/novice",
      image: "assets/hero.jpg"
    });
  } else if (PAGE === "about") {
    applySeo({
      title: "O strani — Astronomski Utrinek",
      description: "O uredništvu Astronomski Utrinek. Piše Filip Knez.",
      path: "/o-strani",
      image: "assets/filip-knez.jpg"
    });
  }
}

/* ---------- Pripomočki ---------- */
const $ = (id) => document.getElementById(id);

function ico(name, cls) {
  return window.AUIcons && AUIcons.svg ? AUIcons.svg(name, cls) : "";
}

function catIconName(name) {
  const n = String(name || "").toLowerCase();
  if (n === "vse") return "grid";
  if (/planet/.test(n)) return "planet";
  if (/raket|izstrel/.test(n)) return "rocket";
  if (/opaz/.test(n)) return "scope";
  if (/razisk/.test(n)) return "atom";
  if (/vesolj/.test(n)) return "orbit";
  return "star";
}

function navigate(url) {
  if (typeof window.__navigate === "function") {
    window.__navigate(url);
    return;
  }
  window.location.href = url;
}

function articleUrl(id) {
  return "clanek.html?id=" + encodeURIComponent(id);
}

function rememberOpen(article) {
  try { sessionStorage.setItem(OPEN_KEY, JSON.stringify(article)); } catch (e) { /* ignore */ }
}

function recalledOpen() {
  try {
    const raw = sessionStorage.getItem(OPEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

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

function sanitizeCatName(name) {
  name = String(name || "").trim().replace(/\s+/g, " ");
  if (!name || name.length > 40) return "";
  if (/^(vse|urednišk\w*|uredništvo)$/i.test(name)) return "";
  return name;
}

function normalizeCats(items) {
  const out = [];
  (Array.isArray(items) ? items : []).forEach((n) => {
    const name = sanitizeCatName(n);
    if (name && !out.some((x) => x.toLowerCase() === name.toLowerCase())) out.push(name);
  });
  return out.length ? out : DEFAULT_CATEGORIES.slice();
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CAT_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : data && data.items;
      if (Array.isArray(items) && items.length) {
        categoriesUpdatedAt = Number((data && data.updatedAt) || 0);
        return normalizeCats(items);
      }
    }
  } catch (e) { /* ignore */ }
  return DEFAULT_CATEGORIES.slice();
}

function saveCategoriesLocal() {
  try {
    localStorage.setItem(CAT_KEY, JSON.stringify({
      items: categories,
      updatedAt: categoriesUpdatedAt
    }));
  } catch (e) { /* ignore */ }
}

function paintChips() {
  const box = $("chips");
  if (!box) return;
  if (currentFilter !== "Vse" && !categories.includes(currentFilter)) currentFilter = "Vse";
  const all = ["Vse"].concat(categories);
  box.innerHTML = all.map((name) =>
    `<button type="button" class="chip${name === currentFilter ? " is-active" : ""}" data-filter="${escapeHtml(name)}">${escapeHtml(name)}</button>`
  ).join("");
}

function paintCategorySelect(selected) {
  const sel = $("fCategory");
  if (!sel) return;
  const cur = selected || sel.value || categories[0] || "Vesolje";
  const opts = categories.slice();
  if (cur && !opts.includes(cur)) opts.unshift(cur);
  sel.innerHTML = opts.map((c) =>
    `<option value="${escapeHtml(c)}"${c === cur ? " selected" : ""}>${escapeHtml(c)}</option>`
  ).join("");
}

function renderCatList() {
  const ul = $("catList");
  if (!ul) return;
  ul.innerHTML = categories.map((c) => `
    <li class="cat-item" data-cat="${escapeHtml(c)}">
      <input class="text-input cat-item-name" value="${escapeHtml(c)}" aria-label="Ime kategorije" />
      <button type="button" class="admin-item-delete" data-cat-delete="${escapeHtml(c)}"
              title="Izbriši kategorijo" aria-label="Izbriši kategorijo">${ico("remove")}</button>
    </li>`).join("");
}

function paintCategoriesUI() {
  paintChips();
  paintCategorySelect();
  renderCatList();
}

async function persistCategories(next, opts) {
  opts = opts || {};
  categories = normalizeCats(next);
  categoriesUpdatedAt = Date.now();
  saveCategoriesLocal();
  if (opts.rename && opts.rename.from && opts.rename.to && opts.rename.from !== opts.rename.to) {
    const from = opts.rename.from;
    const to = opts.rename.to;
    const touched = [];
    ownArticles = ownArticles.map((a) => {
      if (a.category !== from) return a;
      const nextA = { ...a, category: to };
      touched.push(nextA);
      return nextA;
    });
    if (touched.length) {
      saveArticles();
      renderAdminList();
      renderFeed();
      for (let i = 0; i < touched.length; i++) await saveToCloud(touched[i]);
    }
  }
  paintCategoriesUI();
  if (fbReady() && FB.saveSiteCategories) {
    try {
      await FB.saveSiteCategories({ items: categories, updatedAt: categoriesUpdatedAt });
    } catch (e) { /* offline */ }
  }
}

async function syncCategoriesFromCloud() {
  let remote = null;
  if (fbReady() && FB.loadSiteCategories) {
    try { remote = await FB.loadSiteCategories(); } catch (e) { /* offline */ }
  }
  const remoteItems = remote && (Array.isArray(remote.items) ? remote.items : remote);
  const remoteTs = Number(remote && remote.updatedAt || 0);
  if (Array.isArray(remoteItems) && remoteItems.length && remoteTs >= categoriesUpdatedAt) {
    categories = normalizeCats(remoteItems);
    categoriesUpdatedAt = remoteTs;
    saveCategoriesLocal();
  } else if (categoriesUpdatedAt && fbReady() && FB.saveSiteCategories) {
    try {
      await FB.saveSiteCategories({ items: categories, updatedAt: categoriesUpdatedAt });
    } catch (e) { /* ignore */ }
  }
  paintCategoriesUI();
}

function initCatAdmin() {
  const form = $("catForm");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "1";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = $("catName");
      const name = sanitizeCatName(input && input.value);
      if (!name) return;
      if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
        if (input) input.value = "";
        return;
      }
      if (input) input.value = "";
      await persistCategories(categories.concat(name));
    });
  }
  if (document.body.dataset.catAdmin) return;
  document.body.dataset.catAdmin = "1";
  document.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-cat-delete]");
    if (!del) return;
    const name = del.getAttribute("data-cat-delete");
    if (!name) return;
    const used = ownArticles.filter((a) => a.category === name).length;
    const msg = used
      ? `Kategorija „${name}“ je na ${used} člankih. Izbrisati? Članki ostanejo, le filter izgine.`
      : `Izbrisati kategorijo „${name}“?`;
    if (!confirm(msg)) return;
    if (categories.length <= 1) {
      alert("Vsaj ena kategorija mora ostati.");
      return;
    }
    await persistCategories(categories.filter((c) => c !== name));
  });
  document.addEventListener("change", async (e) => {
    const input = e.target.closest(".cat-item-name");
    if (!input) return;
    const li = input.closest("[data-cat]");
    const from = li && li.getAttribute("data-cat");
    const to = sanitizeCatName(input.value);
    if (!from || !to || to === from) {
      input.value = from || "";
      return;
    }
    if (categories.some((c) => c.toLowerCase() === to.toLowerCase() && c !== from)) {
      alert("Ta kategorija že obstaja.");
      input.value = from;
      return;
    }
    await persistCategories(categories.map((c) => (c === from ? to : c)), { rename: { from, to } });
  });
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

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.name) return { ...DEFAULT_PROFILE, ...p };
    }
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_PROFILE };
}
function saveProfile(p) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
}
let profile = loadProfile();

function paintPublicProfile() {
  document.querySelectorAll("[data-editor-avatar]").forEach((img) => {
    img.src = profile.avatar || DEFAULT_PROFILE.avatar;
    img.alt = profile.name || DEFAULT_PROFILE.name;
  });
  paintProfile();
}

async function persistProfile(next) {
  profile = { ...DEFAULT_PROFILE, ...next, updatedAt: Date.now() };
  saveProfile(profile);
  paintPublicProfile();
  if (fbReady() && FB.saveSiteProfile) {
    try {
      await FB.saveSiteProfile({
        name: profile.name,
        role: profile.role,
        avatar: profile.avatar,
        updatedAt: profile.updatedAt
      });
    } catch (e) { /* offline */ }
  }
}

async function syncProfileFromCloud() {
  let remote = null;
  if (fbReady() && FB.loadSiteProfile) {
    try { remote = await FB.loadSiteProfile(); } catch (e) { /* offline */ }
  }
  const local = loadProfile();
  const localTs = Number(local.updatedAt || 0);
  const remoteTs = Number(remote && remote.updatedAt || 0);
  const localCustom = !!(local.avatar && local.avatar !== DEFAULT_PROFILE.avatar);
  const remoteCustom = !!(remote && remote.avatar && remote.avatar !== DEFAULT_PROFILE.avatar);

  if (remoteCustom && remoteTs >= localTs) {
    profile = { ...DEFAULT_PROFILE, ...remote };
    saveProfile(profile);
  } else if (localCustom) {
    profile = local;
    if (fbReady() && FB.saveSiteProfile) {
      try {
        const avatar = window.AUEditor && AUEditor.squeezeDataUrl && String(local.avatar).startsWith("data:")
          ? await AUEditor.squeezeDataUrl(local.avatar, 480, 0.84)
          : local.avatar;
        profile = { ...local, avatar, updatedAt: localTs || Date.now() };
        saveProfile(profile);
        await FB.saveSiteProfile({
          name: profile.name,
          role: profile.role,
          avatar: profile.avatar,
          updatedAt: profile.updatedAt
        });
      } catch (e) { /* ignore */ }
    }
  } else if (remote && remote.name) {
    profile = { ...DEFAULT_PROFILE, ...remote };
    saveProfile(profile);
  }
  paintPublicProfile();
}

function renderRich(raw) {
  if (window.AUEditor) return AUEditor.toHtml(raw);
  return paragraphs(raw);
}

function authorOf(a) {
  return (a && a.author) || profile.name || "Filip Knez";
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
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", (window.scrollY || 0) > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
  initMobileNav();
  paintAuthNav();
  window.addEventListener("au-auth", paintAuthNav);
}

function initMobileNav() {
  const header = document.querySelector(".site-header");
  const btn = document.querySelector(".nav-toggle");
  const nav = document.getElementById("mainNav");
  if (!header || !btn || !nav) return;

  const home = header.querySelector(".header-inner");
  let scrim = document.querySelector(".nav-scrim");
  if (!scrim) {
    scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "nav-scrim";
    scrim.setAttribute("aria-label", "Zapri meni");
    document.body.appendChild(scrim);
  }

  const isMobile = () => {
    try {
      return !!(window.matchMedia && window.matchMedia("(max-width: 860px)").matches);
    } catch (e) {
      return false;
    }
  };

  const placeNav = () => {
    if (isMobile()) {
      if (nav.parentElement !== document.body) document.body.appendChild(nav);
    } else if (home && nav.parentElement !== home) {
      home.appendChild(nav);
    }
  };

  const setOpen = (open) => {
    open = !!open && isMobile();
    header.classList.toggle("nav-open", open);
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-lock", open);
    scrim.classList.toggle("is-on", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Zapri meni" : "Odpri meni");
  };

  placeNav();
  window.addEventListener("resize", () => {
    placeNav();
    if (!isMobile()) setOpen(false);
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!header.classList.contains("nav-open"));
  });
  scrim.addEventListener("click", () => setOpen(false));
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

function paintAuthNav() {
  const nav = document.querySelector(".main-nav");
  if (!nav) return;
  let slot = nav.querySelector(".auth-slot");
  if (!slot) {
    slot = document.createElement("span");
    slot.className = "auth-slot";
    nav.appendChild(slot);
  }
  const u = window.AUAuth && AUAuth.current && AUAuth.current();
  if (u) {
    const av = u.avatar
      ? `<img src="${escapeHtml(u.avatar)}" alt="">`
      : "";
    slot.innerHTML = `<a class="nav-user" href="prijava.html">${av}<span>${escapeHtml(u.name)}</span></a>`;
  } else {
    slot.innerHTML = `<a href="prijava.html">Prijava</a>`;
  }
}

function imageFocus(a) {
  return {
    x: Number(a && a.imageX != null ? a.imageX : 50),
    y: Number(a && a.imageY != null ? a.imageY : 50),
    z: Number(a && a.imageZ != null ? a.imageZ : 1)
  };
}

function applyFocus(el, a) {
  if (!el) return;
  const f = imageFocus(a || {});
  el.style.objectPosition = f.x + "% " + f.y + "%";
  el.style.transform = "scale(" + f.z + ")";
  el.style.transformOrigin = f.x + "% " + f.y + "%";
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

function pickFeatured() {
  featured = allArticles().find(isPublicVisible) || null;
}

function allArticles() {
  const map = new Map();
  seedArticles.forEach((a) => map.set(a.id, a));
  ownArticles.forEach((a) => map.set(a.id, a));
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ---------- Prikaz novic ---------- */
// Osnutki in načrtovane objave (v prihodnosti) niso javno vidne.
function isPublicVisible(a) {
  if (!a) return false;
  if (a.status === "draft") return false;
  if (a.status === "scheduled") {
    const t = new Date(a.publishAt || "").getTime();
    if (!t || t > Date.now()) return false;
    return true;
  }
  return true;
}
function matchesFilters(a) {
  if (currentFilter !== "Vse" && a.category !== currentFilter) return false;
  if (searchTerm) {
    const hay = (a.title + " " + a.summary + " " + a.content).toLowerCase();
    if (!hay.includes(searchTerm)) return false;
  }
  return true;
}

function renderFeed() {
  const feed = $("feed");
  if (!feed) return;
  const list = allArticles().filter(isPublicVisible).filter(matchesFilters);
  const info = $("feedInfo");

  if (list.length === 0) {
    feed.innerHTML = "";
    const total = allArticles().length;
    const emptyMsg = total
      ? "Ni zadetkov za izbrani filter ali iskalni niz."
      : "Še ni objavljenih novic. Uredništvo jih bo kmalu dodalo.";
    if (info) info.textContent = total ? emptyMsg : "uredništvo · Filip Knez";
    if ($("feedStatus")) {
      $("feedStatus").classList.remove("hidden");
      const art = window.AUIcons && AUIcons.decoEmpty ? AUIcons.decoEmpty() : "";
      $("feedStatus").innerHTML = art + "<p>" + emptyMsg + "</p>";
    }
    return;
  }
  if ($("feedStatus")) $("feedStatus").classList.add("hidden");

  feed.innerHTML = list
    .map((a) => {
      const badges =
        `<span class="badge">${escapeHtml(a.category)}</span>` +
        (a.own ? `<span class="badge badge-own">${ico("comet")} Uredniška</span>` : "");
      const focus = imageFocus(a);
      const img = a.image
        ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" loading="lazy"
               style="object-position:${focus.x}% ${focus.y}%;transform:scale(${focus.z});transform-origin:${focus.x}% ${focus.y}%"
               onerror="this.parentElement.classList.add('no-img'); this.remove();" />`
        : "";
      return `
      <a class="news-card reveal" data-id="${escapeHtml(a.id)}" href="${articleUrl(a.id)}"
         aria-label="Preberi: ${escapeHtml(a.title)}">
        <div class="card-img ${img ? "" : "no-img"}">
          ${img}
          ${badges}
        </div>
        <div class="card-body">
          <time>${formatDate(a.date)}</time>
          <p class="card-byline">${escapeHtml(authorOf(a))}</p>
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml(a.summary)}</p>
          <span class="read-more">Preberi zgodbo</span>
        </div>
      </a>`;
    })
    .join("");

  const ownCount = list.filter((a) => a.own).length;
  const srcText = "uredništvo · Filip Knez";
  const nPlural = (n) => (n === 1 ? "novica" : n === 2 ? "novici" : n === 3 || n === 4 ? "novice" : "novic");
  const oPlural = (n) => (n === 1 ? "ka" : n === 2 ? "ki" : n === 3 || n === 4 ? "ke" : "kih");
  if (info) {
    info.textContent = `${list.length} ${nPlural(list.length)}${ownCount ? ` (od tega ${ownCount} uredniš${oPlural(ownCount)})` : ""} • ${srcText}`;
  }

  feed.querySelectorAll(".news-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      openArticle(card.dataset.id);
    });
  });

  initReveal();
}

function renderFeatured() {
  if (!$("featuredTitle")) return;
  const card = $("featuredCard");
  if (!featured) {
    if ($("featuredImg")) $("featuredImg").src = "assets/hero.jpg";
    $("featuredTitle").textContent = "Astronomski Utrinek";
    if ($("featuredBadge")) $("featuredBadge").textContent = "Novice iz vesolja";
    if ($("featuredMeta")) $("featuredMeta").textContent = "Uredništvo Filipa Kneza";
    if (card) {
      card.onclick = null;
      card.onkeydown = null;
      card.removeAttribute("tabindex");
      card.removeAttribute("role");
      card.setAttribute("aria-label", "Astronomski Utrinek");
    }
    return;
  }
  $("featuredImg").src = featured.image || "assets/hero.jpg";
  applyFocus($("featuredImg"), featured);
  $("featuredTitle").textContent = featured.title;
  if ($("featuredBadge")) $("featuredBadge").textContent = "Izbor urednika";
  $("featuredMeta").textContent = featured.date
    ? formatDate(featured.date) + " · " + authorOf(featured)
    : authorOf(featured);
  if (!card) return;
  card.setAttribute("tabindex", "0");
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", "Odpri izbrano novico");
  card.onclick = () => openArticle(featured.id);
  card.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openArticle(featured.id); }
  };
}

function findArticle(id) {
  return (
    allArticles().find((x) => x.id === id) ||
    (featured && featured.id === id ? featured : null) ||
    null
  );
}

function paintArticle(a) {
  if (!a || !$("articleModalTitle")) return;
  applySeo({
    title: a.title + " — Astronomski Utrinek",
    description: String(a.summary || a.title).slice(0, 160),
    path: "/clanek?id=" + encodeURIComponent(a.id),
    image: a.image || "assets/hero.jpg",
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: a.title,
      description: a.summary || a.title,
      image: [absUrl(a.image || "assets/hero.jpg")],
      datePublished: a.date,
      author: { "@type": "Person", name: authorOf(a) },
      publisher: orgJsonLd(),
      mainEntityOfPage: SITE_URL + "/clanek?id=" + encodeURIComponent(a.id),
      inLanguage: "sl"
    }
  });
  if ($("articleModalImg")) {
    $("articleModalImg").src = a.image || "assets/hero.jpg";
    $("articleModalImg").alt = a.title;
    applyFocus($("articleModalImg"), a);
  }
  if ($("articleModalBadge")) {
    $("articleModalBadge").innerHTML = a.own
      ? ico("comet") + " Uredniška"
      : escapeHtml(a.category || "");
  }
  if ($("articleModalDate")) $("articleModalDate").textContent = formatDate(a.date);
  $("articleModalTitle").textContent = a.title;
  if ($("articleModalSummary")) $("articleModalSummary").textContent = a.summary || "";
  if ($("articleModalContent")) $("articleModalContent").innerHTML = renderRich(a.content);
  paintByline(a);
  const link = $("articleModalLink");
  if (link) {
    if (a.sourceUrl) {
      link.href = a.sourceUrl;
      link.textContent = a.sourceLabel ? `Vir: ${a.sourceLabel}` : "Vir";
      link.classList.remove("hidden");
    } else {
      link.classList.add("hidden");
    }
  }
}


function avatarOf(a) {
  const name = authorOf(a);
  if (name === profile.name && profile.avatar) return profile.avatar;
  return (a && a.authorImage) || profile.avatar || DEFAULT_PROFILE.avatar;
}

function paintByline(a) {
  const box = $("articleByline");
  if (!box) return;
  const name = authorOf(a);
  const avatar = avatarOf(a);
  box.innerHTML = `
    <img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" />
    <div>
      <strong>${escapeHtml(name)}</strong>
      <span>${escapeHtml(a.category || "")} · ${escapeHtml(formatDate(a.date))}</span>
    </div>`;
}

function openArticle(id) {
  const a = findArticle(id);
  if (!a) return;
  rememberOpen(a);
  if (PAGE === "article") {
    paintArticle(a);
    window.scrollTo(0, 0);
    return;
  }
  navigate(articleUrl(id));
}

async function renderArticlePage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const cached = recalledOpen();
  if (cached && (!id || cached.id === id)) paintArticle(cached);
  pickFeatured();
  await syncFromCloud();
  pickFeatured();
  const a = (id && findArticle(id)) || (cached && findArticle(cached.id)) || cached;
  if (a) {
    paintArticle(a);
    await initComments(a.id);
  } else if ($("articleModalTitle")) {
    $("articleModalTitle").textContent = "Članka ni mogoče najti";
    if ($("articleModalSummary")) {
      $("articleModalSummary").textContent = "Vrni se k novicam in izberi drugo zgodbo.";
    }
  }
}

function showModal(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden", "false");
}
function hideModal(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add("hidden");
  el.setAttribute("aria-hidden", "true");
}

/* ---------- Skriti sprožilec: 3 dotiki, brez povratne informacije ---------- */
let tapCount = 0;
let lastTapAt = 0;

function initSecretTrigger() {
  const trigger = $("secretTrigger");
  if (!trigger) return;
  trigger.addEventListener("pointerdown", (e) => {
    e.preventDefault(); // brez kakršnekoli animacije ali označevanja
    const now = Date.now();
    if (now - lastTapAt > TAP_WINDOW_MS) tapCount = 0;
    lastTapAt = now;
    tapCount += 1;
    if (tapCount >= TRIGGER_TAPS) {
      tapCount = 0;
      if (PAGE === "admin") {
        if (isAdmin()) openAdmin();
        else if ($("adminCode")) $("adminCode").focus();
      } else {
        navigate("admin.html");
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
  if (!codeInput || !$("submitCode")) return;

  const tryLogin = () => {
    if (codeInput.value.trim() === ADMIN_CODE) {
      sessionStorage.setItem(SESSION_KEY, "1");
      codeInput.value = "";
      if (err) err.classList.add("hidden");
      hideModal("loginModal");
      openAdmin();
    } else {
      if (err) err.classList.remove("hidden");
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
    online: ico("cloudOn") + " Oblačna shramba (Firebase): povezano — članki so vidni vsem obiskovalcem.",
    offline: ico("cloudOff") + " Oblačna shramba ni na voljo — članki so shranjeni samo v tem brskalniku.",
    "not-configured": ico("cloud") + " Oblačna shramba ni nastavljena — članki se shranjujejo samo v tem brskalniku."
  };
  el.innerHTML = messages[state] || messages["not-configured"];
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
  hideModal("loginModal");
  showModal("adminPanel");
  resetForm();
  renderAdminList();
  setCloudStatus(cloudStatus);
  if ($("fTitle")) $("fTitle").focus();
}

function statusMeta(a) {
  if (!a) return { label: "", cls: "" };
  if (a.status === "draft") return { label: "Osnutek", cls: "status-draft" };
  if (a.status === "scheduled") {
    const t = new Date(a.publishAt || "").getTime();
    const future = !t || t > Date.now();
    return { label: future ? "Načrtovano" : "Načrtovano (pripravljeno)", cls: "status-scheduled" };
  }
  return { label: "Objavljeno", cls: "status-published" };
}

function renderAdminList() {
  const ul = $("adminList");
  if (!ul) return;
  const sorted = [...ownArticles].sort((a, b) => (a.date < b.date ? 1 : -1));
  ul.innerHTML = sorted
    .map((a) => {
      const st = statusMeta(a);
      const badge = st.label ? `<span class="admin-status ${st.cls}">${st.label}</span>` : "";
      return `
      <li class="admin-list-item ${a.id === editingId ? "is-editing" : ""}" data-id="${escapeHtml(a.id)}">
        <div class="admin-item-text">
          <h5>${escapeHtml(a.title)} ${badge}</h5>
          <p>${escapeHtml(a.category)} • ${formatDate(a.date)}</p>
        </div>
        <button class="admin-item-delete" data-delete="${escapeHtml(a.id)}"
                title="Izbriši članek" aria-label="Izbriši članek">${ico("trash")}</button>
      </li>`;
    })
    .join("");
  if ($("adminListEmpty")) $("adminListEmpty").classList.toggle("hidden", sorted.length > 0);

  ul.querySelectorAll(".admin-list-item").forEach((li) => {
    li.addEventListener("click", (e) => {
      if (e.target.closest("[data-delete]")) return; // klik na koš za brisanje
      loadIntoForm(li.dataset.id);
    });
  });
}

function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function syncSchedWrap() {
  const sel = $("fStatus");
  const wrap = $("schedWrap");
  if (!sel || !wrap) return;
  wrap.classList.toggle("hidden", sel.value !== "scheduled");
}

function loadIntoForm(id) {
  const a = ownArticles.find((x) => x.id === id);
  if (!a) return;
  editingId = a.id;
  $("formTitle").textContent = "Urejanje: " + a.title;
  $("fTitle").value = a.title;
  paintCategorySelect(a.category);
  $("fImage").value = a.image || "";
  if ($("fImageX")) $("fImageX").value = imageFocus(a).x;
  if ($("fImageY")) $("fImageY").value = imageFocus(a).y;
  if ($("fImageZ")) $("fImageZ").value = imageFocus(a).z;
  $("fSummary").value = a.summary || "";
  $("fContent").value = a.content || "";
  if (window.__rich) window.__rich.set(a.content || "");
  const st = a.status || "published";
  if ($("fStatus")) {
    $("fStatus").value = st === "draft" ? "draft" : (st === "scheduled" ? "scheduled" : "published");
    syncSchedWrap();
  }
  if ($("fPublishAt")) {
    $("fPublishAt").value = toLocalInputValue(a.publishAt || "");
  }
  updateCoverPreview(a.image || "", imageFocus(a));
  renderAdminList();
  $("fTitle").focus();
}

function resetForm() {
  editingId = null;
  if ($("formTitle")) $("formTitle").textContent = "Nova novica";
  if ($("fTitle")) $("fTitle").value = "";
  if ($("fCategory")) $("fCategory").value = "Vesolje";
  if ($("fImage")) $("fImage").value = "";
  if ($("fImageX")) $("fImageX").value = "50";
  if ($("fImageY")) $("fImageY").value = "50";
  if ($("fImageZ")) $("fImageZ").value = "1";
  if ($("fSummary")) $("fSummary").value = "";
  if ($("fContent")) $("fContent").value = "";
  if (window.__rich) window.__rich.set("");
  if ($("fStatus")) { $("fStatus").value = "published"; syncSchedWrap(); }
  if ($("fPublishAt")) $("fPublishAt").value = "";
  updateCoverPreview("");
  renderAdminList();
}


function updateCoverPreview(src, focus) {
  const img = $("coverPreview");
  const studio = $("cropStudio");
  if (!img) return;
  if (src) {
    img.src = src;
    img.classList.remove("hidden");
    if (studio) studio.classList.remove("hidden");
    applyFocus(img, focus || {
      imageX: $("fImageX") && $("fImageX").value,
      imageY: $("fImageY") && $("fImageY").value,
      imageZ: $("fImageZ") && $("fImageZ").value
    });
  } else {
    img.removeAttribute("src");
    if (studio) studio.classList.add("hidden");
  }
}

function initCrop() {
  const stage = $("cropStage");
  const img = $("coverPreview");
  const zoom = $("cropZoom");
  if (!stage || !img) return;
  let drag = null;
  const read = () => ({
    x: Number(($("fImageX") && $("fImageX").value) || 50),
    y: Number(($("fImageY") && $("fImageY").value) || 50),
    z: Number(($("fImageZ") && $("fImageZ").value) || 1)
  });
  const write = (f) => {
    if ($("fImageX")) $("fImageX").value = String(Math.max(0, Math.min(100, f.x)));
    if ($("fImageY")) $("fImageY").value = String(Math.max(0, Math.min(100, f.y)));
    if ($("fImageZ")) $("fImageZ").value = String(f.z);
    if (zoom) zoom.value = String(Math.round(f.z * 100));
    applyFocus(img, { imageX: f.x, imageY: f.y, imageZ: f.z });
  };
  stage.addEventListener("pointerdown", (e) => {
    if (!img.getAttribute("src")) return;
    const f = read();
    drag = { sx: e.clientX, sy: e.clientY, x: f.x, y: f.y, z: f.z };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.sx) / Math.max(stage.clientWidth, 1) * 100;
    const dy = (e.clientY - drag.sy) / Math.max(stage.clientHeight, 1) * 100;
    write({ x: drag.x - dx, y: drag.y - dy, z: drag.z });
  });
  const stop = () => { drag = null; };
  stage.addEventListener("pointerup", stop);
  stage.addEventListener("pointercancel", stop);
  if (zoom) {
    zoom.addEventListener("input", () => {
      const f = read();
      write({ x: f.x, y: f.y, z: Number(zoom.value) / 100 });
    });
  }
}

function paintProfile() {
  if ($("profileName")) $("profileName").textContent = profile.name;
  if ($("profileAvatar")) $("profileAvatar").src = profile.avatar;
}

function initComposer() {
  const area = $("fContent");
  const surface = $("richEditor");
  const bar = $("editorToolbar");
  if (area && surface && window.AUEditor) {
    window.__rich = AUEditor.bind(area, surface, bar);
  }
  initCrop();
  const cover = $("fImage");
  if (cover) {
    cover.addEventListener("input", () => updateCoverPreview(cover.value.trim()));
  }
  const file = $("coverFile");
  if (file) {
    file.addEventListener("change", () => {
      const f = file.files && file.files[0];
      file.value = "";
      if (!f) return;
      const run = async () => {
        const src = window.AUEditor && AUEditor.compressImage
          ? await AUEditor.compressImage(f)
          : await new Promise((res) => {
              const r = new FileReader();
              r.onload = () => res(r.result);
              r.readAsDataURL(f);
            });
        if (cover) cover.value = src;
        updateCoverPreview(src);
      };
      run();
    });
  }
  const photo = $("profilePhoto");
  if (photo) {
    photo.addEventListener("change", () => {
      const f = photo.files && photo.files[0];
      photo.value = "";
      if (!f) return;
      const run = async () => {
        const src = window.AUEditor && AUEditor.compressImage
          ? await AUEditor.compressImage(f, { max: 480, quality: 0.84 })
          : await new Promise((res) => {
              const r = new FileReader();
              r.onload = () => res(r.result);
              r.readAsDataURL(f);
            });
        await persistProfile({ ...profile, avatar: src });
      };
      run();
    });
  }
}

function initAdmin() {
  if (!$("articleForm")) return;
  initComposer();
  initCatAdmin();
  paintProfile();
  paintCategoriesUI();
  if ($("newArticle")) $("newArticle").addEventListener("click", resetForm);
  if ($("resetForm")) $("resetForm").addEventListener("click", resetForm);
  if ($("adminClose")) {
    $("adminClose").addEventListener("click", (e) => {
      e.preventDefault();
      navigate("index.html");
    });
  }
  if ($("adminLogout")) {
    $("adminLogout").addEventListener("click", () => {
      sessionStorage.removeItem(SESSION_KEY);
      hideModal("adminPanel");
      showModal("loginModal");
      if ($("adminCode")) $("adminCode").focus();
    });
  }

  if ($("fStatus")) $("fStatus").addEventListener("change", syncSchedWrap);
  if ($("saveDraftBtn")) {
    $("saveDraftBtn").addEventListener("click", () => {
      if ($("fStatus")) $("fStatus").value = "draft";
      syncSchedWrap();
      $("articleForm").requestSubmit();
    });
  }

  $("articleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (window.__rich) {
      const html = window.__rich.get();
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      if ((tmp.textContent || "").trim()) $("fContent").value = html;
    }
    const title = $("fTitle").value.trim();
    const summary = $("fSummary").value.trim();
    const content = $("fContent").value.trim();
    if (!title || !summary || !content) return;

    const status = ($("fStatus") && $("fStatus").value) || "published";
    let publishAt = "";
    if (status === "scheduled") {
      publishAt = $("fPublishAt") && $("fPublishAt").value;
      if (!publishAt) {
        alert("Za načrtovano objavo izberi datum in čas objave.");
        if ($("fPublishAt")) $("fPublishAt").focus();
        return;
      }
      // normaliziraj na lokalni ISO (datetime-local vrne brez časovnega pasu)
      const iso = new Date(publishAt.replace("T", "T") + ":00");
      publishAt = isNaN(iso.getTime()) ? publishAt : iso.toISOString();
    }

    const data = {
      title,
      summary,
      content,
      image: $("fImage").value.trim() || "",
      imageX: Number(($("fImageX") && $("fImageX").value) || 50),
      imageY: Number(($("fImageY") && $("fImageY").value) || 50),
      imageZ: Number(($("fImageZ") && $("fImageZ").value) || 1),
      category: $("fCategory").value,
      date: new Date().toISOString().slice(0, 10),
      own: true,
      author: profile.name,
      authorImage: profile.avatar,
      status,
      publishAt: status === "scheduled" ? publishAt : ""
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
  if (!$("chips") || !$("searchInput")) return;
  paintChips();
  try {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      $("searchInput").value = q;
      searchTerm = q.trim().toLowerCase();
    }
  } catch (e) { /* ignore */ }
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


/* ---------- Komentarji ---------- */
const COMMENTS_KEY = "astronomski-utrinek-comments-v1";
let currentArticleId = null;

function loadLocalComments(articleId) {
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || "{}");
    return Array.isArray(all[articleId]) ? all[articleId] : [];
  } catch (e) { return []; }
}
function saveLocalComments(articleId, list) {
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || "{}");
    all[articleId] = list;
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
  } catch (e) { /* ignore */ }
}

function renderCommentList(list) {
  const box = $("commentList");
  if (!box) return;
  if (!list.length) {
    box.innerHTML = "<p class=\"comment-empty\">Še ni komentarjev. Bodi prvi.</p>";
    return;
  }
  box.innerHTML = list.map((c) => `
    <article class="comment">
      <img src="${escapeHtml(c.avatar || "assets/filip-knez.jpg")}" alt="">
      <div>
        <strong>${escapeHtml(c.name || "Anonimnež")}</strong>
        <time>${escapeHtml(formatDate((c.date || "").slice(0, 10)))}</time>
        <p>${escapeHtml(c.text)}</p>
      </div>
    </article>`).join("");
}

async function initComments(articleId) {
  currentArticleId = articleId;
  if (!$("commentsBox")) return;
  const user = window.AUAuth && AUAuth.current && AUAuth.current();
  if ($("commentForm")) $("commentForm").classList.toggle("hidden", !user);
  if ($("commentGate")) $("commentGate").classList.toggle("hidden", !!user);
  let list = loadLocalComments(articleId);
  if (fbReady() && FB.loadComments) {
    try {
      const remote = await FB.loadComments(articleId);
      if (remote.length) {
        const map = new Map(list.map((c) => [c.id, c]));
        remote.forEach((c) => map.set(c.id, c));
        list = [...map.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
        saveLocalComments(articleId, list);
      }
    } catch (e) { /* offline */ }
  }
  renderCommentList(list);
  const form = $("commentForm");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "1";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = AUAuth.current();
      const text = ($("commentText").value || "").trim();
      if (!u || !text || !currentArticleId) return;
      const comment = {
        id: makeId(),
        name: u.name,
        avatar: u.avatar || "",
        userId: u.id,
        text,
        date: new Date().toISOString()
      };
      const next = loadLocalComments(currentArticleId).concat(comment);
      saveLocalComments(currentArticleId, next);
      renderCommentList(next);
      $("commentText").value = "";
      if (fbReady() && FB.saveComment) {
        try { await FB.saveComment(currentArticleId, comment); } catch (err) { /* ignore */ }
      }
    });
  }
}

function initAuthPage() {
  if (PAGE !== "auth") return;
  const showErr = (msg) => {
    const el = $("authError");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("hidden", !msg);
  };
  const paint = () => {
    const u = AUAuth.current();
    if ($("authGuest")) $("authGuest").classList.toggle("hidden", !!u);
    if ($("authUser")) $("authUser").classList.toggle("hidden", !u);
    if (u) {
      if ($("meName")) $("meName").textContent = u.name;
      if ($("meEmail")) $("meEmail").textContent = u.email || "";
      if ($("meNameInput")) $("meNameInput").value = u.name || "";
      if ($("meAvatar")) {
        $("meAvatar").src = u.avatar || "assets/filip-knez.jpg";
        $("meAvatar").classList.remove("hidden");
      }
    }
    paintAuthNav();
  };
  document.querySelectorAll("[data-auth-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-auth-tab]").forEach((b) => b.classList.toggle("is-active", b === btn));
      const tab = btn.dataset.authTab;
      if ($("loginForm")) $("loginForm").classList.toggle("hidden", tab !== "login");
      if ($("registerForm")) $("registerForm").classList.toggle("hidden", tab !== "register");
    });
  });
  if ($("loginForm")) {
    $("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await AUAuth.login($("loginEmail").value, $("loginPass").value);
        showErr("");
        paint();
      } catch (err) { showErr(err.message); }
    });
  }
  let avatar = "";
  if ($("regPhoto")) {
    $("regPhoto").addEventListener("change", () => {
      const f = $("regPhoto").files && $("regPhoto").files[0];
      if (!f) return;
      const run = async () => {
        avatar = window.AUEditor && AUEditor.compressImage
          ? await AUEditor.compressImage(f, { max: 480, quality: 0.84 })
          : await new Promise((res) => {
              const r = new FileReader();
              r.onload = () => res(r.result);
              r.readAsDataURL(f);
            });
        if ($("regPreview")) {
          $("regPreview").src = avatar;
          $("regPreview").classList.remove("hidden");
        }
      };
      run();
    });
  }
  if ($("mePhoto")) {
    $("mePhoto").addEventListener("change", async () => {
      const f = $("mePhoto").files && $("mePhoto").files[0];
      $("mePhoto").value = "";
      if (!f || !AUAuth.updateAvatar) return;
      try {
        const src = window.AUEditor && AUEditor.compressImage
          ? await AUEditor.compressImage(f, { max: 480, quality: 0.84 })
          : await new Promise((res) => {
              const r = new FileReader();
              r.onload = () => res(r.result);
              r.readAsDataURL(f);
            });
        await AUAuth.updateAvatar(src);
        showErr("");
        paint();
      } catch (err) { showErr(err.message); }
    });
  }
  if ($("registerForm")) {
    $("registerForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await AUAuth.register({
          name: $("regName").value,
          email: $("regEmail").value,
          password: $("regPass").value,
          avatar
        });
        showErr("");
        paint();
      } catch (err) { showErr(err.message); }
    });
  }
  if ($("googleBtn")) {
    $("googleBtn").addEventListener("click", async () => {
      try {
        await AUAuth.loginGoogle();
        showErr("");
        paint();
      } catch (err) { showErr(err.message); }
    });
  }
  if ($("saveNameBtn") && $("meNameInput")) {
    $("saveNameBtn").addEventListener("click", async () => {
      try {
        await AUAuth.updateName($("meNameInput").value);
        showErr("");
        paint();
      } catch (err) { showErr(err.message); }
    });
    $("meNameInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); $("saveNameBtn").click(); }
    });
  }
  if ($("logoutBtn")) $("logoutBtn").addEventListener("click", () => { AUAuth.logout(); paint(); });
  paint();
}

/* ---------- Zagon ---------- */
async function init() {
  buildStarfield();
  initChrome();
  initSecretTrigger();
  await syncProfileFromCloud();
  await syncCategoriesFromCloud();

  if (PAGE === "article") {
    await renderArticlePage();
    initReveal();
    return;
  }

  if (PAGE === "admin") {
    initLogin();
    initAdmin();
    await syncFromCloud();
    await syncProfileFromCloud();
    await syncCategoriesFromCloud();
    if (isAdmin()) openAdmin();
    else {
      showModal("loginModal");
      hideModal("adminPanel");
    }
    return;
  }

  if (PAGE === "about") {
    paintPublicProfile();
    initReveal();
    return;
  }

  if (PAGE === "auth") {
    initAuthPage();
    return;
  }

  initFilters();
  renderFeed();
  initReveal();

  pickFeatured();
  await syncFromCloud();
  await syncCategoriesFromCloud();
  pickFeatured();
  renderFeatured();
  renderFeed();
}

init();
