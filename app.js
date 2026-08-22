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
  document.body.classList.add("portal-open");
  resetForm();
  renderAdminList();
  initPortal();
  switchPortalTab(portalTab || "dashboard");
  setCloudStatus(cloudStatus);
  refreshPortal();
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
  if (typeof paintPortalIdentity === "function") paintPortalIdentity();
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


/* ---------- Vloge uporabnikov (moderator / admin) in bani ---------- */
const ROLES_KEY = "astronomski-utrinek-roles-v1";
let roles = loadLocalRoles();

function loadLocalRoles() {
  try {
    const raw = localStorage.getItem(ROLES_KEY);
    if (raw) { const o = JSON.parse(raw); if (o && typeof o === "object") return o; }
  } catch (e) { /* ignore */ }
  return {};
}
function saveLocalRoles() {
  try { localStorage.setItem(ROLES_KEY, JSON.stringify(roles)); } catch (e) { /* ignore */ }
}
async function syncRolesFromCloud() {
  if (!fbReady() || !FB.loadRoles) return;
  try {
    const remote = await FB.loadRoles();
    if (remote && typeof remote === "object") {
      roles = { ...roles, ...remote };
      saveLocalRoles();
    }
  } catch (e) { /* offline */ }
}
function saveRoleToCloud(userId, obj) {
  if (!fbReady() || !FB.saveRole) return;
  FB.saveRole(userId, obj).catch(() => { /* offline */ });
}
function getRoleForUser(userId) {
  return roles[userId] || { role: "user", bannedUntil: null };
}
function isOwner() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}
function currentUser() {
  return window.AUAuth && AUAuth.current ? AUAuth.current() : null;
}
function currentUserBanned() {
  const u = currentUser();
  if (!u) return false;
  const r = getRoleForUser(u.id);
  return !!(r.bannedUntil && r.bannedUntil > Date.now());
}
function canModerateComments() {
  if (isOwner()) return true;
  const u = currentUser();
  if (!u) return false;
  const r = getRoleForUser(u.id);
  return r.role === "moderator" || r.role === "admin";
}
function canEditArticles() {
  if (isOwner()) return true;
  const u = currentUser();
  if (!u) return false;
  return getRoleForUser(u.id).role === "admin";
}
function setUserRole(userId, role, bannedUntil) {
  const cur = getRoleForUser(userId);
  roles[userId] = {
    ...cur,
    role: role || cur.role || "user",
    bannedUntil: bannedUntil === undefined ? cur.bannedUntil : bannedUntil
  };
  saveLocalRoles();
  saveRoleToCloud(userId, roles[userId]);
  renderUsersList();
  if (currentArticleId) {
    const list = loadLocalComments(currentArticleId);
    renderCommentList(list);
  }
  paintCommentsGate();
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

function canEditComment(c) {
  const u = currentUser();
  if (u && c.userId && u.id === c.userId) return true; // svoj komentar
  return canModerateComments();
}
function canDeleteComment(c) {
  return canEditComment(c);
}

function renderCommentList(list) {
  const box = $("commentList");
  if (!box) return;
  if (!list.length) {
    box.innerHTML = "<p class=\"comment-empty\">Še ni komentarjev. Bodi prvi.</p>";
    return;
  }
  const byParent = {};
  list.forEach((c) => {
    (byParent[c.parentId || ""] = byParent[c.parentId || ""] || []).push(c);
  });
  const build = (parentId) =>
    (byParent[parentId] || [])
      .map((c) => commentHtml(c) + (byParent[c.id] ? `<div class="comment-thread">${build(c.id)}</div>` : ""))
      .join("");
  box.innerHTML = build("");
  list.forEach((c) => attachCommentEvents(c));
}

function commentHtml(c) {
  const u = currentUser();
  const role = getRoleForUser(c.userId || "").role;
  const banned = getRoleForUser(c.userId || "").bannedUntil > Date.now();
  const roleBadge = role === "admin"
    ? `<span class="role-badge role-admin">Admin</span>`
    : role === "moderator"
      ? `<span class="role-badge role-moderator">Moderator</span>` : "";
  const bannedBadge = banned ? `<span class="role-badge role-banned">⛔ Banan</span>` : "";
  const edited = c.editedAt ? `<span class="comment-edited">(urejeno)</span>` : "";
  const canReply = !!u && !currentUserBanned();
  const canEdit = canEditComment(c);
  const canDel = canDeleteComment(c);
  const actions =
    `<div class="comment-actions">` +
    (canReply ? `<button class="comment-btn" data-reply="${escapeHtml(c.id)}">↩ Odgovori</button>` : "") +
    (canEdit ? `<button class="comment-btn" data-edit="${escapeHtml(c.id)}">✎ Uredi</button>` : "") +
    (canDel ? `<button class="comment-btn comment-delete" data-delete="${escapeHtml(c.id)}">🗑</button>` : "") +
    `</div>`;
  const officialBadge = c.official
    ? `<span class="badge-official">${ICO("star")}${escapeHtml(c.role || "Uredništvo")}</span>` : "";
  const placeTag = (c.city || c.country)
    ? `<span class="comment-place">${ICO("planet")}${escapeHtml(placeLabel(c))}</span>` : "";
  const img = c.image
    ? `<img src="${escapeHtml(c.image)}" alt="Priloga h komentarju" loading="lazy" onerror="this.remove()" />` : "";
  const link = c.link
    ? `<a class="c-link" href="${escapeHtml(c.link)}" target="_blank" rel="noopener nofollow">${ICO("link")}${escapeHtml(c.link.replace(/^https?:\/\//, "").slice(0, 46))}</a>` : "";
  const media = img || link ? `<div class="comment-media">${img}${link}</div>` : "";
  return `
    <article class="comment ${c.parentId ? "is-reply" : ""} ${c.official ? "is-official" : ""}" data-cid="${escapeHtml(c.id)}">
      <img src="${escapeHtml(c.avatar || "assets/mark.png")}" alt="" onerror="this.src='assets/mark.png'">
      <div class="comment-body">
        <div class="comment-head">
          <strong>${escapeHtml(c.name || "Anonimnež")}</strong>${officialBadge}${roleBadge}${bannedBadge}
          <time>${escapeHtml(formatDate((c.date || "").slice(0, 10)))}</time> ${edited} ${placeTag}
        </div>
        <p class="comment-text" id="ctext-${escapeHtml(c.id)}">${escapeHtml(c.text)}</p>
        ${media}
        ${actions}
        <div class="comment-reply-wrap" id="creply-${escapeHtml(c.id)}"></div>
      </div>
    </article>`;
}

function attachCommentEvents(c) {
  const root = document.querySelector(`.comment[data-cid="${c.id}"]`);
  if (!root) return;
  const del = root.querySelector(`[data-delete="${c.id}"]`);
  if (del) del.addEventListener("click", async () => {
    if (!confirm("Ali res želite izbrisati ta komentar?")) return;
    const list = loadLocalComments(currentArticleId).filter((x) => x.id !== c.id);
    saveLocalComments(currentArticleId, list);
    renderCommentList(list);
    if (fbReady() && FB.deleteComment) {
      try { await FB.deleteComment(currentArticleId, c.id); } catch (e) { /* ignore */ }
    }
    if ($("usersList")) renderUsersList();
  });
  const edit = root.querySelector(`[data-edit="${c.id}"]`);
  if (edit) edit.addEventListener("click", () => startEditComment(c));
  const reply = root.querySelector(`[data-reply="${c.id}"]`);
  if (reply) reply.addEventListener("click", () => toggleReplyForm(c));
}

function startEditComment(c) {
  const box = $("ctext-" + c.id);
  if (!box) return;
  const actions = box.parentElement.querySelector(".comment-actions");
  if (actions) actions.style.display = "none";
  const wrap = document.createElement("div");
  wrap.className = "comment-reply-form";
  wrap.innerHTML = `
    <textarea class="text-input" id="editArea-${c.id}" rows="2">${escapeHtml(c.text)}</textarea>
    <div class="comment-form-actions">
      <button class="btn btn-small" type="button" id="editSave-${c.id}">Shrani</button>
      <button class="btn btn-ghost btn-small" type="button" id="editCancel-${c.id}">Prekliči</button>
    </div>`;
  box.replaceWith(wrap);
  const area = $("editArea-" + c.id);
  area.focus();
  $("editSave-" + c.id).addEventListener("click", async () => {
    const t = area.value.trim();
    if (!t) return;
    c.text = t;
    c.editedAt = new Date().toISOString();
    const list = loadLocalComments(currentArticleId).map((x) => (x.id === c.id ? c : x));
    saveLocalComments(currentArticleId, list);
    renderCommentList(list);
    if (fbReady() && FB.saveComment) { try { await FB.saveComment(currentArticleId, c); } catch (e) { /* ignore */ } }
  });
  $("editCancel-" + c.id).addEventListener("click", () => renderCommentList(loadLocalComments(currentArticleId)));
}

function toggleReplyForm(c) {
  const wrap = $("creply-" + c.id);
  if (!wrap) return;
  if (wrap.innerHTML) { wrap.innerHTML = ""; return; }
  const officialOpt = canPostOfficial()
    ? `<label class="official-toggle">
         <input type="checkbox" id="replyOfficial-${c.id}" ${currentUser() ? "" : "checked"} />
         <span>Odgovori kot <strong>${escapeHtml(profile.name)}</strong> · ${escapeHtml(profile.role || "Urednik")}</span>
       </label>` : "";
  wrap.innerHTML = `
    <form class="comment-reply-form" id="replyForm-${c.id}">
      <textarea class="text-input" id="replyArea-${c.id}" rows="2" placeholder="Odgovori na komentar…"></textarea>
      <div class="comment-form-actions">
        ${officialOpt}
        <button class="btn btn-primary btn-small" type="submit">↩ Objavi odgovor</button>
        <button class="btn btn-ghost btn-small" type="button" id="replyCancel-${c.id}">Prekliči</button>
      </div>
    </form>`;
  $("replyForm-" + c.id).addEventListener("submit", async (e) => {
    e.preventDefault();
    const u = currentUser();
    const t = $("replyArea-" + c.id).value.trim();
    const asOfficial = canPostOfficial() && $("replyOfficial-" + c.id) && $("replyOfficial-" + c.id).checked;
    if (!t) return;
    if (!asOfficial && (!u || currentUserBanned())) return;
    const who = asOfficial ? officialAuthor() : { userId: u.id, name: u.name, avatar: u.avatar || "", role: "" };
    const place = asOfficial ? {} : await myPlace();
    const reply = {
      id: makeId(),
      name: who.name,
      avatar: who.avatar,
      userId: who.userId,
      role: who.role || "",
      official: !!asOfficial,
      parentId: c.id,
      text: t,
      city: place.city || "",
      country: place.country || "",
      countryCode: place.countryCode || "",
      date: new Date().toISOString()
    };
    const list = loadLocalComments(currentArticleId).concat(reply);
    saveLocalComments(currentArticleId, list);
    renderCommentList(list);
    if (fbReady() && FB.saveComment) { try { await FB.saveComment(currentArticleId, reply); } catch (e) { /* ignore */ } }
    if ($("usersList")) renderUsersList();
  });
  $("replyCancel-" + c.id).addEventListener("click", () => { wrap.innerHTML = ""; });
}

/* Stikalo »objavi kot uredništvo« — privzeto vklopljeno le, če ni prijavljenega bralca */
function paintOfficialToggle() {
  const wrap = $("officialToggleWrap");
  if (!wrap) return;
  wrap.classList.toggle("hidden", !canPostOfficial());
  if ($("commentOfficial")) $("commentOfficial").checked = !currentUser();
  if ($("officialToggleName")) $("officialToggleName").textContent = profile.name;
}

function paintCommentsGate() {
  if (!$("commentsBox")) return;
  paintOfficialToggle();
  const u = currentUser();
  const banned = currentUserBanned();
  if ($("commentForm")) {
    $("commentForm").classList.toggle("hidden", !u || banned);
  }
  if ($("commentGate")) {
    if (!u) $("commentGate").innerHTML = 'Za komentar se <a href="prijava.html">prijavi ali ustvari profil</a>.';
    else if (banned) $("commentGate").innerHTML = "⛔ Trenutno ste začasno banani in ne morete komentirati.";
    else $("commentGate").classList.add("hidden");
    $("commentGate").classList.toggle("hidden", !!u && !banned);
  }
}

async function initComments(articleId) {
  currentArticleId = articleId;
  if (!$("commentsBox")) return;
  paintCommentsGate();
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
      const u = currentUser();
      const text = ($("commentText").value || "").trim();
      const asOfficial = canPostOfficial() && $("commentOfficial") && $("commentOfficial").checked;
      if (!text || !currentArticleId) return;
      if (!asOfficial && (!u || currentUserBanned())) return;
      const who = asOfficial ? officialAuthor() : { userId: u.id, name: u.name, avatar: u.avatar || "", role: "" };
      const place = asOfficial ? {} : await myPlace();
      const comment = {
        id: makeId(),
        name: who.name,
        avatar: who.avatar,
        userId: who.userId,
        role: who.role || "",
        official: !!asOfficial,
        text,
        image: safeUrl($("commentImage") ? $("commentImage").value : ""),
        link: safeUrl($("commentLink") ? $("commentLink").value : ""),
        city: place.city || "",
        country: place.country || "",
        countryCode: place.countryCode || "",
        date: new Date().toISOString()
      };
      const next = loadLocalComments(currentArticleId).concat(comment);
      saveLocalComments(currentArticleId, next);
      renderCommentList(next);
      $("commentText").value = "";
      if ($("commentImage")) $("commentImage").value = "";
      if ($("commentLink")) $("commentLink").value = "";
      if ($("commentExtras")) $("commentExtras").classList.add("hidden");
      if ($("toggleExtras")) $("toggleExtras").classList.remove("is-on");
      if (fbReady() && FB.saveComment) {
        try { await FB.saveComment(currentArticleId, comment); } catch (err) { /* ignore */ }
      }
      if ($("usersList")) renderUsersList();
    });
  }
  initCommentExtras();
  window.addEventListener("au-auth", paintCommentsGate);
}

/* Priloge (slika, povezava) in uradni način pod člankom */
function initCommentExtras() {
  const toggle = $("toggleExtras");
  if (toggle && !toggle.dataset.bound) {
    toggle.dataset.bound = "1";
    toggle.addEventListener("click", () => {
      const box = $("commentExtras");
      if (!box) return;
      box.classList.toggle("hidden");
      toggle.classList.toggle("is-on", !box.classList.contains("hidden"));
    });
  }
  const file = $("commentImageFile");
  if (file && !file.dataset.bound) {
    file.dataset.bound = "1";
    file.addEventListener("change", async () => {
      const f = file.files && file.files[0];
      file.value = "";
      if (!f) return;
      const src = window.AUEditor && AUEditor.compressImage
        ? await AUEditor.compressImage(f, { max: 1200, quality: 0.82 })
        : await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
      if ($("commentImage")) $("commentImage").value = src;
      if ($("commentExtras")) $("commentExtras").classList.remove("hidden");
    });
  }
  paintOfficialToggle();
  // Lastnik brez uporabniškega računa lahko vseeno odgovarja s službenim profilom
  const gate = $("commentGate");
  if (gate && $("commentForm") && canPostOfficial() && !currentUser()) {
    $("commentForm").classList.remove("hidden");
    gate.classList.add("hidden");
  }
}

/* ---------- Uporabniki: glej razdelek "Skrbniški portal" spodaj ---------- */
function initUsersAdmin() {
  if (!$("usersList")) return;
  renderUsersList();
  window.addEventListener("au-auth", renderUsersList);
  document.addEventListener("au-comments-change", renderUsersList);
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

/* ===================================================================
   Skrbniški portal — pregled, komentarji, uporabniki, profil
   =================================================================== */

const PLACE_KEY = "astronomski-utrinek-place-v1";
const OFFICIAL_ID = "official-utrednistvo";

let portalTab = "dashboard";
let portalComments = [];
let portalUsers = [];
let portalFilter = "all";
let portalQuery = "";
let portalUserQuery = "";
let portalUserSort = "recent";
let portalLoaded = false;

/* ---------- Ikone ---------- */
function ICO(name, extra) {
  return window.AUIcons && AUIcons.svg ? AUIcons.svg(name, extra) : "";
}
function paintIcos(root) {
  (root || document).querySelectorAll("[data-ico]").forEach((el) => {
    if (el.dataset.icoDone) return;
    el.innerHTML = ICO(el.dataset.ico);
    el.dataset.icoDone = "1";
  });
}

/* ---------- Pripomočki ---------- */
function relTime(iso) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const min = Math.floor(Math.max(0, Date.now() - t) / 60000);
  if (min < 1) return "pravkar";
  if (min < 60) return `pred ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `pred ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "včeraj";
  if (d < 30) return `pred ${d} dnevi`;
  return formatDate(new Date(t).toISOString().slice(0, 10));
}

function flagFromCode(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)));
}

function placeLabel(o) {
  if (!o) return "Neznana lokacija";
  const parts = [o.city, o.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Neznana lokacija";
}

function safeUrl(u) {
  const s = String(u || "").trim();
  if (/^data:image\//i.test(s)) return s;
  return /^https?:\/\/\S+$/i.test(s) ? s : "";
}

function canPostOfficial() {
  if (isOwner()) return true;
  const u = currentUser();
  return !!u && getRoleForUser(u.id).role === "admin";
}

function officialAuthor() {
  return {
    userId: OFFICIAL_ID,
    name: (profile && profile.name) || "Uredništvo",
    avatar: (profile && profile.avatar) || "assets/filip-knez.jpg",
    role: (profile && profile.role) || "Urednik"
  };
}

/* ---------- Približna lokacija obiskovalca (mesto, država) ---------- */
async function myPlace() {
  try {
    const cached = JSON.parse(localStorage.getItem(PLACE_KEY) || "null");
    if (cached && cached.t && Date.now() - cached.t < 7 * 86400000) return cached.p;
  } catch (e) { /* ignore */ }
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ""; } })();
  let place = { city: "", country: "", countryCode: "", tz };
  for (const url of ["https://ipapi.co/json/", "https://ipwho.is/"]) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const d = await res.json();
      const city = d.city || "";
      const country = d.country_name || d.country || "";
      if (city || country) {
        place = { city, country, countryCode: String(d.country_code || "").slice(0, 2), tz };
        break;
      }
    } catch (e) { /* poskusimo naslednjega */ }
  }
  try { localStorage.setItem(PLACE_KEY, JSON.stringify({ t: Date.now(), p: place })); } catch (e) { /* ignore */ }
  return place;
}

/* ---------- Zbiranje podatkov za portal ---------- */
function localCommentsAll() {
  const out = [];
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || "{}");
    Object.entries(all).forEach(([articleId, list]) => {
      (Array.isArray(list) ? list : []).forEach((c) => {
        if (c && c.id) out.push({ ...c, articleId });
      });
    });
  } catch (e) { /* ignore */ }
  return out;
}

function articleTitleById(id) {
  const a = ownArticles.find((x) => x.id === id);
  return a ? a.title : "Novica";
}

async function loadPortalData() {
  const map = new Map(localCommentsAll().map((c) => [c.id, c]));
  if (fbReady() && FB.loadAllComments) {
    try {
      (await FB.loadAllComments()).forEach((c) => map.set(c.id, { ...map.get(c.id), ...c }));
    } catch (e) { /* offline */ }
  }
  portalComments = [...map.values()].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const users = new Map();
  const add = (u) => {
    if (!u || !u.id) return;
    users.set(u.id, { ...(users.get(u.id) || {}), ...u });
  };
  try {
    const arr = JSON.parse(localStorage.getItem("astronomski-utrinek-users-v1") || "[]");
    (Array.isArray(arr) ? arr : []).forEach((u) => add({ id: u.id, name: u.name, avatar: u.avatar, email: u.email }));
  } catch (e) { /* ignore */ }
  if (fbReady() && FB.loadUsers) {
    try { (await FB.loadUsers()).forEach((u) => add({ id: u.id, name: u.name, avatar: u.avatar, email: u.email })); }
    catch (e) { /* offline */ }
  }
  portalComments.forEach((c) => {
    if (!c.userId || c.userId === OFFICIAL_ID) return;
    const known = users.get(c.userId) || {};
    add({
      id: c.userId,
      name: known.name || c.name || "Uporabnik",
      avatar: known.avatar || c.avatar || "",
      email: known.email || "",
      city: known.city || c.city || "",
      country: known.country || c.country || "",
      countryCode: known.countryCode || c.countryCode || "",
      lastSeen: !known.lastSeen || String(c.date) > String(known.lastSeen) ? c.date : known.lastSeen
    });
  });
  portalUsers = [...users.values()];
  portalLoaded = true;
}

function statsForUser(id) {
  const mine = portalComments.filter((c) => c.userId === id);
  return {
    comments: mine.length,
    images: mine.filter((c) => c.image).length,
    links: mine.filter((c) => c.link).length,
    last: mine.reduce((acc, c) => (String(c.date) > String(acc) ? c.date : acc), ""),
    list: mine.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  };
}

/* ---------- Zagon portala ---------- */
let portalBound = false;
function initPortal() {
  if (!$("adminPanel") || !$("portalTitle")) return;
  paintIcos(document);
  if (portalBound) return;
  portalBound = true;

  document.querySelectorAll(".portal-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchPortalTab(btn.dataset.tab));
  });
  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => switchPortalTab(btn.dataset.goto));
  });

  if ($("commentSearch")) {
    $("commentSearch").addEventListener("input", (e) => {
      portalQuery = e.target.value.trim().toLowerCase();
      renderPortalComments();
    });
  }
  if ($("commentFilter")) {
    $("commentFilter").addEventListener("click", (e) => {
      const seg = e.target.closest(".seg");
      if (!seg) return;
      portalFilter = seg.dataset.cfilter;
      $("commentFilter").querySelectorAll(".seg").forEach((s) => s.classList.toggle("is-active", s === seg));
      renderPortalComments();
    });
  }
  if ($("userSearch")) {
    $("userSearch").addEventListener("input", (e) => {
      portalUserQuery = e.target.value.trim().toLowerCase();
      renderUsersList();
    });
  }
  if ($("userSort")) {
    $("userSort").addEventListener("click", (e) => {
      const seg = e.target.closest(".seg");
      if (!seg) return;
      portalUserSort = seg.dataset.usort;
      $("userSort").querySelectorAll(".seg").forEach((s) => s.classList.toggle("is-active", s === seg));
      renderUsersList();
    });
  }
  if ($("editNameBtn")) {
    $("editNameBtn").addEventListener("click", async () => {
      const name = prompt("Ime, ki bo vidno ob uradnih odgovorih:", profile.name);
      if (name && name.trim()) await persistProfile({ ...profile, name: name.trim() });
      paintPortalIdentity();
      renderPortalProfile();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("userDrawer") && !$("userDrawer").classList.contains("hidden")) closeUserDrawer();
  });
}

const PORTAL_TABS = {
  dashboard: ["Pregled", "Skrbniški portal"],
  articles: ["Novice", "Vsebina"],
  comments: ["Komentarji", "Skupnost"],
  users: ["Uporabniki", "Skupnost"],
  profile: ["Moj profil", "Službeni račun"]
};

function switchPortalTab(tab) {
  if (!PORTAL_TABS[tab]) tab = "dashboard";
  portalTab = tab;
  document.querySelectorAll(".portal-nav-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tab));
  document.querySelectorAll(".portal-panel").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === tab));
  if ($("portalTitle")) $("portalTitle").textContent = PORTAL_TABS[tab][0];
  if ($("portalEyebrow")) $("portalEyebrow").textContent = PORTAL_TABS[tab][1];
  closeUserDrawer();
  const sc = document.querySelector(".portal-scroll");
  if (sc) sc.scrollTop = 0;
  renderPortal();
}

async function refreshPortal() {
  await loadPortalData();
  renderPortal();
}

function renderPortal() {
  if (!$("portalTitle") || $("adminPanel").classList.contains("hidden")) return;
  paintPortalIdentity();
  if ($("navCountArticles")) $("navCountArticles").textContent = String(ownArticles.length);
  if ($("navCountComments")) $("navCountComments").textContent = String(portalComments.length);
  if ($("navCountUsers")) $("navCountUsers").textContent = String(portalUsers.length);
  renderPortalDashboard();
  renderPortalComments();
  renderUsersList();
  renderPortalProfile();
  paintIcos(document);
}

function paintPortalIdentity() {
  if ($("portalIdentityName")) $("portalIdentityName").textContent = profile.name;
  if ($("portalIdentityAvatar")) $("portalIdentityAvatar").src = profile.avatar;
  if ($("profileRoleOut")) $("profileRoleOut").textContent = `${profile.role || "Urednik"} · Astronomski Utrinek`;
}

/* ---------- Pregled ---------- */
function statCardHtml(icon, value, label, extra) {
  return `
    <div class="stat-card">
      <span class="stat-ic">${ICO(icon)}</span>
      <b>${escapeHtml(String(value))}</b>
      <span>${escapeHtml(label)}</span>
      ${extra ? `<em>${escapeHtml(extra)}</em>` : ""}
    </div>`;
}

function placesHtml() {
  const byCountry = new Map();
  portalUsers.forEach((u) => {
    const key = (u.country || "Neznano") + "|" + (u.countryCode || "");
    byCountry.set(key, (byCountry.get(key) || 0) + 1);
  });
  const list = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!list.length) return `<p class="admin-empty">Lokacije še niso znane. Pokažejo se, ko kdo komentira.</p>`;
  const max = list[0][1];
  return list.map(([key, n]) => {
    const [country, code] = key.split("|");
    const cities = [...new Set(portalUsers.filter((u) => (u.country || "Neznano") === country && u.city).map((u) => u.city))];
    return `
      <div class="place-card">
        <span class="place-flag">${flagFromCode(code)}</span>
        <div style="flex:1;min-width:0">
          <strong>${escapeHtml(country)}</strong>
          <span>${n} ${n === 1 ? "uporabnik" : n === 2 ? "uporabnika" : "uporabnikov"}${cities.length ? " · " + escapeHtml(cities.slice(0, 2).join(", ")) : ""}</span>
          <div class="place-bar"><i style="width:${Math.round((n / max) * 100)}%"></i></div>
        </div>
      </div>`;
  }).join("");
}

function renderPortalDashboard() {
  if (!$("statGrid")) return;
  const dayAgo = Date.now() - 86400000;
  const recent = portalComments.filter((c) => new Date(c.date).getTime() > dayAgo).length;
  const answered = new Set(portalComments.filter((c) => c.official && c.parentId).map((c) => c.parentId));
  const waiting = portalComments.filter((c) => !c.parentId && !c.official && !answered.has(c.id)).length;
  const imgs = portalComments.filter((c) => c.image).length;
  const links = portalComments.filter((c) => c.link).length;

  $("statGrid").innerHTML =
    statCardHtml("grid", portalUsers.length, "Uporabnikov", `${portalUsers.filter((u) => new Date(u.lastSeen || 0).getTime() > dayAgo).length} dejavnih danes`) +
    statCardHtml("quote", portalComments.length, "Komentarjev", `${recent} v zadnjem dnevu`) +
    statCardHtml("image", imgs + links, "Slik in povezav", `${imgs} slik · ${links} povezav`) +
    statCardHtml("list", ownArticles.length, "Novic v arhivu", `${waiting} komentarjev čaka odgovor`);

  $("dashComments").innerHTML = portalComments.length
    ? portalComments.slice(0, 5).map((c) => `
      <button class="mini-row" type="button" data-goto="comments">
        <img class="mini-av" src="${escapeHtml(c.avatar || "assets/mark.png")}" alt="" onerror="this.src='assets/mark.png'" />
        <div class="mini-body">
          <strong>${escapeHtml(c.name || "Uporabnik")}</strong>
          <p>${escapeHtml(c.text || "")}</p>
          <div class="meta">
            <span class="meta-i">${ICO("orbit")}${escapeHtml(relTime(c.date))}</span>
            <span class="meta-i">${ICO("list")}${escapeHtml(articleTitleById(c.articleId).slice(0, 38))}</span>
          </div>
        </div>
      </button>`).join("")
    : `<p class="admin-empty">Zaenkrat še ni komentarjev.</p>`;

  const newest = [...portalUsers].sort((a, b) => String(b.lastSeen || "").localeCompare(String(a.lastSeen || ""))).slice(0, 5);
  $("dashUsers").innerHTML = newest.length
    ? newest.map((u) => {
        const st = statsForUser(u.id);
        return `
        <button class="mini-row" type="button" data-open-user="${escapeHtml(u.id)}">
          <img class="mini-av" src="${escapeHtml(u.avatar || "assets/mark.png")}" alt="" onerror="this.src='assets/mark.png'" />
          <div class="mini-body">
            <strong>${escapeHtml(u.name || "Uporabnik")}</strong>
            <div class="meta">
              <span class="meta-i">${flagFromCode(u.countryCode)} ${escapeHtml(placeLabel(u))}</span>
              <span class="meta-i">${ICO("quote")}${st.comments}</span>
            </div>
          </div>
        </button>`;
      }).join("")
    : `<p class="admin-empty">Še ni registriranih uporabnikov.</p>`;

  $("dashPlaces").innerHTML = placesHtml();
  if ($("profilePlaces")) $("profilePlaces").innerHTML = placesHtml();

  document.querySelectorAll("[data-open-user]").forEach((el) => {
    el.onclick = () => { switchPortalTab("users"); openUserDrawer(el.dataset.openUser); };
  });
  document.querySelectorAll(".mini-row[data-goto]").forEach((el) => {
    el.onclick = () => switchPortalTab(el.dataset.goto);
  });
}

/* ---------- Komentarji v portalu ---------- */
function portalRoots() {
  const answered = new Set(portalComments.filter((c) => c.official && c.parentId).map((c) => c.parentId));
  let roots = portalComments.filter((c) => !c.parentId);
  if (portalFilter === "unanswered") roots = roots.filter((c) => !c.official && !answered.has(c.id));
  if (portalFilter === "media") roots = roots.filter((c) => c.image || c.link || portalComments.some((r) => r.parentId === c.id && (r.image || r.link)));
  if (portalFilter === "official") roots = roots.filter((c) => c.official || portalComments.some((r) => r.parentId === c.id && r.official));
  if (portalQuery) {
    roots = roots.filter((c) => {
      const kids = portalComments.filter((r) => r.parentId === c.id);
      return [c.text, c.name, articleTitleById(c.articleId), ...kids.map((k) => `${k.text} ${k.name}`)]
        .join(" ").toLowerCase().includes(portalQuery);
    });
  }
  return roots;
}

function portalCommentRow(c) {
  const place = c.city || c.country
    ? `<span class="meta-i">${ICO("planet")}${escapeHtml(placeLabel(c))}</span>` : "";
  const img = c.image ? `<img src="${escapeHtml(c.image)}" alt="" loading="lazy" onerror="this.remove()" />` : "";
  const link = c.link
    ? `<a class="c-link" href="${escapeHtml(c.link)}" target="_blank" rel="noopener nofollow">${ICO("link")}${escapeHtml(c.link.replace(/^https?:\/\//, "").slice(0, 42))}</a>` : "";
  const badge = c.official ? `<span class="badge-official">${ICO("star")}${escapeHtml(c.role || "Uredništvo")}</span>` : "";
  const name = c.official
    ? escapeHtml(c.name || "Uredništvo")
    : `<button class="link-btn" type="button" data-open-user="${escapeHtml(c.userId || "")}">${escapeHtml(c.name || "Uporabnik")}</button>`;
  return `
    <div class="c-row ${c.official ? "is-official" : ""}">
      <img class="c-av" src="${escapeHtml(c.avatar || "assets/mark.png")}" alt="" onerror="this.src='assets/mark.png'" />
      <div class="c-body">
        <div class="c-name">${name}${badge}</div>
        <div class="c-meta">
          <span class="meta-i">${ICO("orbit")}${escapeHtml(relTime(c.date))}</span>
          ${place}
        </div>
        <div class="c-text">${escapeHtml(c.text || "")}</div>
        ${img || link ? `<div class="c-media">${img}${link}</div>` : ""}
      </div>
      <div class="c-actions">
        <button class="mini-icon-btn danger" type="button" data-pdelete="${escapeHtml(c.id)}" data-particle="${escapeHtml(c.articleId || "")}" title="Izbriši komentar">${ICO("trash")}</button>
      </div>
    </div>`;
}

function renderPortalComments() {
  const wrap = $("adminComments");
  if (!wrap) return;
  const roots = portalRoots();
  if ($("adminCommentsEmpty")) $("adminCommentsEmpty").classList.toggle("hidden", roots.length > 0);

  wrap.innerHTML = roots.map((c) => {
    const replies = portalComments
      .filter((r) => r.parentId === c.id)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return `
      <article class="thread">
        <button class="thread-article" type="button" data-article="${escapeHtml(c.articleId || "")}">
          ${ICO("list")} ${escapeHtml(articleTitleById(c.articleId))}
        </button>
        ${portalCommentRow(c)}
        ${replies.length ? `<div class="c-replies">${replies.map(portalCommentRow).join("")}</div>` : ""}
        <form class="c-reply-form" data-reply-to="${escapeHtml(c.id)}" data-reply-article="${escapeHtml(c.articleId || "")}">
          <img src="${escapeHtml(profile.avatar)}" alt="" onerror="this.src='assets/mark.png'" />
          <input class="text-input" type="text" required
                 placeholder="Odgovori kot ${escapeHtml(profile.name)} — ${escapeHtml(profile.role || "Urednik")}…" />
          <button class="btn btn-primary btn-small" type="submit">Odgovori</button>
        </form>
      </article>`;
  }).join("");

  wrap.querySelectorAll(".c-reply-form").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = form.querySelector("input");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      await postOfficialReply(form.dataset.replyArticle, form.dataset.replyTo, text);
    });
  });
  wrap.querySelectorAll("[data-pdelete]").forEach((btn) => {
    btn.addEventListener("click", () => deletePortalComment(btn.dataset.particle, btn.dataset.pdelete));
  });
  wrap.querySelectorAll("[data-article]").forEach((btn) => {
    btn.addEventListener("click", () => { if (btn.dataset.article) navigate("clanek.html?id=" + encodeURIComponent(btn.dataset.article)); });
  });
  wrap.querySelectorAll("[data-open-user]").forEach((el) => {
    el.addEventListener("click", () => { switchPortalTab("users"); openUserDrawer(el.dataset.openUser); });
  });
}

async function postOfficialReply(articleId, parentId, text) {
  if (!articleId) return;
  const a = officialAuthor();
  const reply = {
    id: makeId(),
    name: a.name,
    avatar: a.avatar,
    userId: a.userId,
    role: a.role,
    official: true,
    parentId: parentId || null,
    text,
    date: new Date().toISOString()
  };
  const list = loadLocalComments(articleId).concat(reply);
  saveLocalComments(articleId, list);
  portalComments = [{ ...reply, articleId }, ...portalComments];
  renderPortal();
  if (fbReady() && FB.saveComment) {
    try { await FB.saveComment(articleId, reply); } catch (e) { /* offline */ }
  }
}

async function deletePortalComment(articleId, id) {
  if (!confirm("Ali res želite izbrisati ta komentar?")) return;
  if (articleId) {
    const list = loadLocalComments(articleId).filter((x) => x.id !== id && x.parentId !== id);
    saveLocalComments(articleId, list);
  }
  const removed = portalComments.filter((c) => c.id === id || c.parentId === id);
  portalComments = portalComments.filter((c) => c.id !== id && c.parentId !== id);
  renderPortal();
  if (fbReady() && FB.deleteComment) {
    for (const c of removed) {
      try { await FB.deleteComment(c.articleId || articleId, c.id); } catch (e) { /* offline */ }
    }
  }
}

/* ---------- Uporabniki ---------- */
function sortedPortalUsers() {
  let list = [...portalUsers];
  if (portalUserQuery) {
    list = list.filter((u) => [u.name, u.email, u.city, u.country].filter(Boolean).join(" ").toLowerCase().includes(portalUserQuery));
  }
  if (portalUserSort === "active") list.sort((a, b) => statsForUser(b.id).comments - statsForUser(a.id).comments);
  else if (portalUserSort === "media") {
    list.sort((a, b) => {
      const sa = statsForUser(a.id), sb = statsForUser(b.id);
      return (sb.images + sb.links) - (sa.images + sa.links);
    });
  } else list.sort((a, b) => String(b.lastSeen || "").localeCompare(String(a.lastSeen || "")));
  return list;
}

function userCardHtml(u) {
  const st = statsForUser(u.id);
  const r = getRoleForUser(u.id);
  const banned = r.bannedUntil > Date.now();
  const roleChip = r.role === "admin"
    ? `<span class="u-chip accent">${ICO("star")} Admin</span>`
    : r.role === "moderator" ? `<span class="u-chip accent">${ICO("star")} Moderator</span>` : "";
  return `
    <li>
      <button class="user-card ${banned ? "is-banned" : ""}" type="button" data-uid="${escapeHtml(u.id)}">
        <div class="user-card-top">
          <img src="${escapeHtml(u.avatar || "assets/mark.png")}" alt="" onerror="this.src='assets/mark.png'" />
          <div>
            <strong>${escapeHtml(u.name || "Uporabnik")}</strong>
            <span class="u-place">${flagFromCode(u.countryCode)} ${escapeHtml(placeLabel(u))}</span>
          </div>
        </div>
        <div class="user-chips">
          <span class="u-chip accent">${ICO("quote")} ${st.comments}</span>
          <span class="u-chip">${ICO("image")} ${st.images}</span>
          <span class="u-chip">${ICO("link")} ${st.links}</span>
          ${roleChip}
          ${banned ? `<span class="u-chip warn">Banan</span>` : ""}
        </div>
        <div class="u-last">${ICO("orbit")} Nazadnje ${escapeHtml(relTime(st.last || u.lastSeen))}</div>
      </button>
    </li>`;
}

function renderUsersList() {
  const ul = $("usersList");
  if (!ul) return;
  const list = sortedPortalUsers();
  if ($("usersListEmpty")) $("usersListEmpty").classList.toggle("hidden", list.length > 0);
  ul.innerHTML = list.map(userCardHtml).join("");
  ul.querySelectorAll("[data-uid]").forEach((card) => {
    card.addEventListener("click", () => openUserDrawer(card.dataset.uid));
  });

  const compact = $("profileUsers");
  if (compact) {
    const top = [...portalUsers].sort((a, b) => statsForUser(b.id).comments - statsForUser(a.id).comments).slice(0, 6);
    compact.innerHTML = top.length
      ? top.map(userCardHtml).join("")
      : `<p class="admin-empty">Skupnost je še prazna — kartice se pojavijo, ko kdo komentira.</p>`;
    compact.querySelectorAll("[data-uid]").forEach((card) => {
      card.addEventListener("click", () => { switchPortalTab("users"); openUserDrawer(card.dataset.uid); });
    });
  }
}

function openUserDrawer(id) {
  const drawer = $("userDrawer");
  const u = portalUsers.find((x) => x.id === id);
  if (!drawer || !u) return;
  const st = statsForUser(u.id);
  const r = getRoleForUser(u.id);
  const banned = r.bannedUntil > Date.now();
  const images = st.list.filter((c) => c.image);
  const links = st.list.filter((c) => c.link);
  const roleLabel = r.role === "admin" ? "Admin" : r.role === "moderator" ? "Moderator" : "Uporabnik";

  $("userDrawerInner").innerHTML = `
    <div class="drawer-head">
      <div class="drawer-id">
        <img src="${escapeHtml(u.avatar || "assets/mark.png")}" alt="" onerror="this.src='assets/mark.png'" />
        <div>
          <h2>${escapeHtml(u.name || "Uporabnik")}</h2>
          <p>${flagFromCode(u.countryCode)} ${escapeHtml(placeLabel(u))}</p>
          <p>${ICO("orbit")} Nazadnje ${escapeHtml(relTime(st.last || u.lastSeen))}</p>
          ${u.email ? `<p>${escapeHtml(u.email)}</p>` : ""}
        </div>
      </div>
      <button class="mini-icon-btn" type="button" id="drawerClose" aria-label="Zapri">${ICO("remove")}</button>
    </div>

    <div class="drawer-stats">
      <div class="drawer-stat"><b>${st.comments}</b><span>Komentarjev</span></div>
      <div class="drawer-stat"><b>${st.images}</b><span>Slik</span></div>
      <div class="drawer-stat"><b>${st.links}</b><span>Povezav</span></div>
    </div>

    <div class="drawer-section">
      <h3>${ICO("star")} Vloga in moderiranje</h3>
      <p class="modal-sub">Trenutno: <strong>${roleLabel}</strong>${banned ? ` · banan do ${escapeHtml(formatDate(new Date(r.bannedUntil).toISOString().slice(0, 10)))}` : ""}</p>
      <div class="drawer-roles">
        ${r.role !== "moderator" ? `<button class="btn btn-small" type="button" data-action="moderator">Moderator</button>` : ""}
        ${r.role !== "admin" ? `<button class="btn btn-small" type="button" data-action="admin">Admin</button>` : ""}
        ${(r.role === "admin" || r.role === "moderator") ? `<button class="btn btn-ghost btn-small" type="button" data-action="demote">Navaden uporabnik</button>` : ""}
        ${banned
          ? `<button class="btn btn-ghost btn-small" type="button" data-action="unban">Odban</button>`
          : `<button class="btn btn-danger-ghost btn-small" type="button" data-action="ban-1">Ban 1 dan</button>
             <button class="btn btn-danger-ghost btn-small" type="button" data-action="ban-7">7 dni</button>
             <button class="btn btn-danger-ghost btn-small" type="button" data-action="ban-30">30 dni</button>`}
      </div>
    </div>

    ${images.length ? `<div class="drawer-section">
      <h3>${ICO("image")} Deljene slike</h3>
      <div class="drawer-gallery">${images.slice(0, 9).map((c) => `<img src="${escapeHtml(c.image)}" alt="" loading="lazy" onerror="this.remove()" />`).join("")}</div>
    </div>` : ""}

    ${links.length ? `<div class="drawer-section">
      <h3>${ICO("link")} Deljene povezave</h3>
      <div class="drawer-links">${links.slice(0, 8).map((c) => `<a class="c-link" href="${escapeHtml(c.link)}" target="_blank" rel="noopener nofollow">${ICO("link")}${escapeHtml(c.link.replace(/^https?:\/\//, "").slice(0, 42))}</a>`).join("")}</div>
    </div>` : ""}

    <div class="drawer-section">
      <h3>${ICO("quote")} Komentarji</h3>
      <div class="mini-list">
        ${st.list.length ? st.list.slice(0, 20).map((c) => `
          <div class="mini-row">
            <div class="mini-body">
              <strong>${escapeHtml(articleTitleById(c.articleId).slice(0, 50))}</strong>
              <p>${escapeHtml(c.text || "")}</p>
              <div class="meta"><span class="meta-i">${ICO("orbit")}${escapeHtml(relTime(c.date))}</span></div>
            </div>
          </div>`).join("") : `<p class="admin-empty">Ta uporabnik še ni komentiral.</p>`}
      </div>
    </div>`;

  drawer.classList.remove("hidden");
  drawer.setAttribute("aria-hidden", "false");
  $("drawerClose").addEventListener("click", closeUserDrawer);
  drawer.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const now = Date.now();
      switch (btn.dataset.action) {
        case "moderator": setUserRole(u.id, "moderator"); break;
        case "admin": setUserRole(u.id, "admin"); break;
        case "demote": setUserRole(u.id, "user"); break;
        case "ban-1": setUserRole(u.id, undefined, now + 86400000); break;
        case "ban-7": setUserRole(u.id, undefined, now + 7 * 86400000); break;
        case "ban-30": setUserRole(u.id, undefined, now + 30 * 86400000); break;
        case "unban": setUserRole(u.id, undefined, null); break;
      }
      openUserDrawer(u.id);
    });
  });
}

function closeUserDrawer() {
  const drawer = $("userDrawer");
  if (!drawer) return;
  drawer.classList.add("hidden");
  drawer.setAttribute("aria-hidden", "true");
}

/* ---------- Moj profil ---------- */
function renderPortalProfile() {
  if (!$("profileStats")) return;
  const replies = portalComments.filter((c) => c.official);
  const reached = new Set(replies.map((r) => {
    const parent = portalComments.find((c) => c.id === r.parentId);
    return parent ? parent.userId : null;
  }).filter(Boolean));

  $("profileStats").innerHTML = `
    <div><b>${replies.length}</b><span>Uradnih odgovorov</span></div>
    <div><b>${reached.size}</b><span>Nagovorjenih bralcev</span></div>
    <div><b>${ownArticles.length}</b><span>Objavljenih novic</span></div>`;

  $("profileReplies").innerHTML = replies.length
    ? replies.slice(0, 6).map((r) => {
        const parent = portalComments.find((c) => c.id === r.parentId);
        return `
        <div class="mini-row">
          <img class="mini-av" src="${escapeHtml(r.avatar || profile.avatar)}" alt="" onerror="this.src='assets/mark.png'" />
          <div class="mini-body">
            <strong>${escapeHtml(parent ? "Odgovor: " + (parent.name || "bralec") : articleTitleById(r.articleId))}</strong>
            <p>${escapeHtml(r.text || "")}</p>
            <div class="meta"><span class="meta-i">${ICO("orbit")}${escapeHtml(relTime(r.date))}</span></div>
          </div>
        </div>`;
      }).join("")
    : `<p class="admin-empty">Še niste odgovorili na noben komentar.</p>`;
}

/* ---------- Zagon ---------- */
async function init() {
  buildStarfield();
  initChrome();
  initSecretTrigger();
  syncRolesFromCloud();
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
    initUsersAdmin();
    await syncFromCloud();
    await syncProfileFromCloud();
    await syncCategoriesFromCloud();
    await syncRolesFromCloud();
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
