/* Profili obiskovalcev + Google (če je Firebase Auth nastavljen) */
(function (global) {
  const USERS_KEY = "astronomski-utrinek-users-v1";
  const SESSION_KEY = "astronomski-utrinek-user";

  /* E-poštni naslovi urednika — cel portal (nadzorna plošča) je samo za njega. */
  function editorEmails() {
    const list = Array.isArray(global.EDITOR_EMAILS) && global.EDITOR_EMAILS.length
      ? global.EDITOR_EMAILS
      : ["filip.knez@gmail.com"];
    return list.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean);
  }
  function isEditor(user) {
    const email = String((user && user.email) || "").trim().toLowerCase();
    return !!email && editorEmails().includes(email);
  }
  function isCurrentEditor() {
    return isEditor(current());
  }

  function loadUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveUsers(list) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  async function digest(text) {
    const src = String(text || "");
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(src));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      let h = 0;
      for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
      return "x" + h.toString(16);
    }
  }

  function current() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function setSession(user) {
    if (!user) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || "",
      provider: user.provider || "local"
    }));
    global.dispatchEvent(new CustomEvent("au-auth"));
  }

  async function register({ name, email, password, avatar }) {
    name = String(name || "").trim();
    email = String(email || "").trim().toLowerCase();
    if (!name || !email || !password) throw new Error("Izpolni ime, e-pošto in geslo.");
    const users = loadUsers();
    if (users.some((u) => u.email === email)) throw new Error("Ta e-pošta je že zasedena.");
    const user = {
      id: "u-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      email,
      avatar: avatar || "",
      pass: await digest(password),
      provider: "local"
    };
    users.push(user);
    saveUsers(users);
    if (global.FB && FB.saveUser) {
      try { await FB.saveUser({ id: user.id, name, email, avatar: user.avatar, provider: "local" }); } catch (e) { /* ignore */ }
    }
    setSession(user);
    return current();
  }

  async function login(email, password) {
    email = String(email || "").trim().toLowerCase();
    let user = loadUsers().find((u) => u.email === email);
    if (!user && global.FB && FB.loadUserByEmail) {
      try { user = await FB.loadUserByEmail(email); } catch (e) { /* offline */ }
      if (user) {
        const others = loadUsers().filter((u) => u.id !== user.id && u.email !== user.email);
        others.push(user);
        saveUsers(others);
      }
    }
    if (!user || user.pass !== await digest(password)) throw new Error("Napačen e-naslov ali geslo.");
    setSession(user);
    return current();
  }

  async function updateAvatar(avatar) {
    const sess = current();
    if (!sess) throw new Error("Nisi prijavljen.");
    const users = loadUsers();
    const idx = users.findIndex((u) => u.id === sess.id || u.email === sess.email);
    const next = { ...(idx >= 0 ? users[idx] : sess), avatar: avatar || "" };
    if (idx >= 0) users[idx] = next;
    else users.push(next);
    saveUsers(users);
    setSession(next);
    if (global.FB && FB.saveUser) {
      try {
        await FB.saveUser({
          id: next.id,
          name: next.name,
          email: next.email,
          avatar: next.avatar,
          provider: next.provider || "local",
          pass: next.pass || ""
        });
      } catch (e) { /* ignore */ }
    }
    return current();
  }

  async function updateName(name) {
    const sess = current();
    if (!sess) throw new Error("Nisi prijavljen.");
    name = String(name || "").trim();
    if (!name) throw new Error("Ime ne sme biti prazno.");
    if (name.length > 40) throw new Error("Ime je predolgo (največ 40 znakov).");
    const users = loadUsers();
    const idx = users.findIndex((u) => u.id === sess.id || u.email === sess.email);
    const next = { ...(idx >= 0 ? users[idx] : sess), name };
    if (idx >= 0) users[idx] = next;
    else users.push(next);
    saveUsers(users);
    setSession(next);
    if (global.FB && FB.saveUser) {
      try {
        await FB.saveUser({
          id: next.id,
          name,
          email: next.email,
          avatar: next.avatar,
          provider: next.provider || "local",
          pass: next.pass || ""
        });
      } catch (e) { /* ignore */ }
    }
    return current();
  }

  function logout() {
    setSession(null);
    // Odjavi tudi Google sejo (če je SDK naložen), da odjava velja povsod.
    if (global.firebase && global.firebase.auth) {
      try { global.firebase.auth().signOut(); } catch (e) { /* ignore */ }
    }
  }

  function googleReady() {
    const cfg = global.FIREBASE_CONFIG || {};
    return !!(cfg.apiKey && cfg.authDomain && cfg.projectId);
  }

  function friendlyGoogleError(err) {
    const code = String((err && err.code) || "");
    if (/unauthorized-domain/.test(code)) {
      const domain = (global.location && global.location.hostname) || "ta domena";
      return "Domena „" + domain + "“ ni dovoljena za Google prijavo. V Firebase konzoli dodaj " +
        "Authentication → Settings → Authorized domains.";
    }
    if (/network|timeout|internal/.test(code)) return "Google prijava ni uspela (omrežje). Poskusi znova.";
    return (err && err.message) || "Google prijava ni uspela.";
  }

  /* Urednikov Google račun se združi z uredniškim: prijava z Google = isti človek kot redakcija. */
  async function mergeEditorAccount(user) {
    if (!isEditor(user) || !global.FB) return;
    try {
      if (global.FB.loadRoles && global.FB.saveRole) {
        const all = await global.FB.loadRoles().catch(() => ({}));
        const cur = (all && all[user.id]) || {};
        await global.FB.saveRole(user.id, { ...cur, role: "admin", email: user.email, name: user.name, updatedAt: Date.now() });
      }
    } catch (e) { /* offline */ }
    try {
      if (global.FB.loadSiteProfile && global.FB.saveUser && user.id) {
        const site = await global.FB.loadSiteProfile().catch(() => null);
        // Uredniška profilna slika (site/profile) je glavna — združi jo z Google računom.
        if (site && site.avatar) {
          await global.FB.saveUser({ ...user, avatar: user.avatar || site.avatar, name: site.name || user.name });
        }
      }
    } catch (e) { /* offline */ }
  }

  async function loginGoogle() {
    if (!googleReady()) {
      throw new Error("Google prijava še ni vklopljena v Firebase (manjka apiKey). Uporabi svoj profil.");
    }
    if (!global.firebase || !global.firebase.auth) {
      throw new Error("Firebase Auth se ni naložil. Osveži stran.");
    }
    const authObj = global.firebase.auth();
    const provider = new global.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    let g;
    try {
      const cred = await authObj.signInWithPopup(provider);
      g = cred.user;
    } catch (err) {
      // Pojavno okno je blokirano (ali okolje ga ne podpira) → preusmeri celo stran.
      const code = String((err && err.code) || "");
      if (/popup-blocked|popup-request-pending|operation-not-supported-in-this-environment|cancelled-popup-request/.test(code)) {
        await authObj.signInWithRedirect(provider);
        return null; // nadaljujemo po povratku z redirecta (onAuthStateChanged most)
      }
      if (/popup-closed-by-user/.test(code)) throw new Error("Google prijava je bila preklicana.");
      throw new Error(friendlyGoogleError(err));
    }
    if (!g) throw new Error("Google prijava ni uspela.");
    return await adoptGoogleUser(g);
  }

  /* Prijavi Google uporabnika v aplikacijo (shrani profil, združi urednika, nastavi sejo). */
  async function adoptGoogleUser(g) {
    const user = {
      id: g.uid,
      name: g.displayName || g.email,
      email: g.email,
      avatar: g.photoURL || "",
      provider: "google"
    };
    const users = loadUsers().filter((u) => u.id !== user.id && u.email !== user.email);
    users.push({ ...user, pass: "" });
    saveUsers(users);
    if (global.FB && FB.saveUser) {
      try { await FB.saveUser(user); } catch (e) { /* ignore */ }
    }
    await mergeEditorAccount(user);
    setSession(user);
    return current();
  }

  /* Most za Firebase Auth: obnovi sejo po redirectu in ob ponovnem zagonu strani. */
  function watchFirebaseAuth() {
    if (!global.firebase || !global.firebase.auth) return;
    try {
      global.firebase.auth().onAuthStateChanged((g) => {
        if (!g || !g.email) return;
        const sess = current();
        if (sess && sess.id === g.uid) return;
        adoptGoogleUser(g).catch(() => { /* ignore */ });
      });
    } catch (e) { /* ignore */ }
  }

  global.AUAuth = { current, register, login, logout, loginGoogle, googleReady, updateAvatar, updateName, isEditor, isCurrentEditor, editorEmails };
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watchFirebaseAuth);
    else watchFirebaseAuth();
  }
})(window);
