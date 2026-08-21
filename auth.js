/* Profili obiskovalcev + Google (če je Firebase Auth nastavljen) */
(function (global) {
  const USERS_KEY = "astronomski-utrinek-users-v1";
  const SESSION_KEY = "astronomski-utrinek-user";

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

  function logout() { setSession(null); }

  function googleReady() {
    const cfg = global.FIREBASE_CONFIG || {};
    return !!(cfg.apiKey && cfg.authDomain && cfg.projectId);
  }

  async function loginGoogle() {
    if (!googleReady()) {
      throw new Error("Google prijava še ni vklopljena v Firebase (manjka apiKey). Uporabi svoj profil.");
    }
    if (!global.firebase || !global.firebase.auth) {
      throw new Error("Firebase Auth se ni naložil. Osveži stran.");
    }
    const provider = new global.firebase.auth.GoogleAuthProvider();
    const cred = await global.firebase.auth().signInWithPopup(provider);
    const g = cred.user;
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
    setSession(user);
    return current();
  }

  global.AUAuth = { current, register, login, logout, loginGoogle, googleReady, updateAvatar, updateName };
})(window);
