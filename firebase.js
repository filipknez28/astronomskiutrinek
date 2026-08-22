/* ===== Firebase Realtime Database — REST odjemalec (testni način) =====
   V testnem načinu pravila dovoljujejo branje in pisanje brez prijave,
   zato je za statično stran dovolj preprost REST API (brez SDK-ja).

   Če konfiguracija ni izpolnjena, se stran samodejno obnaša kot prej:
   članki se shranjujejo samo v brskalnik (localStorage).
*/
window.FB = (function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const db = String(cfg.databaseURL || "").replace(/\/+$/, "");

  function isConfigured() {
    if (!db || !db.startsWith("https://")) return false;
    if (/VAS-PROJEKT|PROJECT_ID|your-project|primer/i.test(db)) return false;
    return true;
  }

  function buildUrl(path) {
    return db + "/" + path + ".json";
  }

  async function req(path, options = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(buildUrl(path), {
        method: options.method || "GET",
        headers: { "Content-Type": "application/json" },
        body: options.body,
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error("Firebase HTTP " + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /* Preberi vse članke iz oblaka: { id: {...}, ... } -> [ {...}, ... ] */
  async function loadArticles() {
    const data = await req("articles");
    if (!data) return [];
    return Object.entries(data)
      .filter(([, a]) => a && typeof a === "object")
      .map(([id, a]) => ({ ...a, id }));
  }

  /* Shrani (ustvari ali posodobi) en članek */
  async function saveArticle(article) {
    if (!article || !article.id) throw new Error("Članek nima ID-ja");
    const key = encodeURIComponent(article.id);
    await req("articles/" + key, { method: "PUT", body: JSON.stringify(article) });
  }

  /* Izbriši članek */
  async function deleteArticle(id) {
    const key = encodeURIComponent(id);
    await req("articles/" + key, { method: "DELETE" });
  }

  async function loadComments(articleId) {
    const data = await req("comments/" + encodeURIComponent(articleId));
    if (!data) return [];
    return Object.entries(data)
      .filter(([, c]) => c && typeof c === "object")
      .map(([id, c]) => ({ ...c, id }))
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }

  async function saveComment(articleId, comment) {
    if (!articleId || !comment || !comment.id) throw new Error("Komentar ni veljaven");
    await req(
      "comments/" + encodeURIComponent(articleId) + "/" + encodeURIComponent(comment.id),
      { method: "PUT", body: JSON.stringify(comment) }
    );
  }

  async function deleteComment(articleId, commentId) {
    await req(
      "comments/" + encodeURIComponent(articleId) + "/" + encodeURIComponent(commentId),
      { method: "DELETE" }
    );
  }

  /* Izbriši vse komentarje danega članka (ko se članek izbriše) */
  async function deleteArticleComments(articleId) {
    if (!articleId) return;
    await req("comments/" + encodeURIComponent(articleId), { method: "DELETE" });
  }

  /* Vsi komentarji vseh člankov naenkrat (za skrbniški portal) */
  async function loadAllComments() {
    const data = await req("comments");
    if (!data || typeof data !== "object") return [];
    const out = [];
    Object.entries(data).forEach(([articleId, list]) => {
      if (!list || typeof list !== "object") return;
      Object.entries(list).forEach(([id, c]) => {
        if (c && typeof c === "object") out.push({ ...c, id, articleId });
      });
    });
    return out.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }

  /* Vsi registrirani uporabniki (za razdelek Uporabniki) */
  async function loadUsers() {
    const data = await req("users");
    if (!data || typeof data !== "object") return [];
    return Object.entries(data)
      .filter(([, u]) => u && typeof u === "object")
      .map(([id, u]) => ({ ...u, id: u.id || id }));
  }

  /* ===== Vloge (moderator / admin) in začasni bani (po userId) ===== */
  async function loadRoles() {
    const data = await req("roles");
    if (!data) return {};
    return data;
  }

  async function saveRole(userId, roleObj) {
    await req("roles/" + encodeURIComponent(userId), {
      method: "PUT",
      body: JSON.stringify(roleObj)
    });
  }

  async function saveUser(user) {
    if (!user || !user.id) return;
    await req("users/" + encodeURIComponent(user.id), {
      method: "PUT",
      body: JSON.stringify(user)
    });
    if (user.email) {
      const key = encodeURIComponent(String(user.email).toLowerCase().replace(/\./g, ","));
      await req("usersByEmail/" + key, {
        method: "PUT",
        body: JSON.stringify({ id: user.id })
      });
    }
  }

  /* Izbriši uporabnika (profil in vpis po e-naslovu) */
  async function deleteUser(userId, email) {
    if (!userId) return;
    await req("users/" + encodeURIComponent(userId), { method: "DELETE" });
    if (email) {
      const key = encodeURIComponent(String(email).toLowerCase().replace(/\./g, ","));
      await req("usersByEmail/" + key, { method: "DELETE" });
    }
  }

  /* Izbriši vlogo / ban uporabnika */
  async function deleteRole(userId) {
    if (!userId) return;
    await req("roles/" + encodeURIComponent(userId), { method: "DELETE" });
  }

  async function loadUserByEmail(email) {
    const key = encodeURIComponent(String(email || "").toLowerCase().replace(/\./g, ","));
    if (!key) return null;
    const ref = await req("usersByEmail/" + key);
    if (!ref || !ref.id) return null;
    const user = await req("users/" + encodeURIComponent(ref.id));
    return user && typeof user === "object" ? { ...user, id: user.id || ref.id } : null;
  }

  async function loadSiteProfile() {
    const data = await req("site/profile");
    return data && typeof data === "object" ? data : null;
  }

  async function saveSiteProfile(profile) {
    await req("site/profile", { method: "PUT", body: JSON.stringify(profile) });
  }

  async function loadSiteCategories() {
    const data = await req("site/categories");
    if (!data) return null;
    if (Array.isArray(data.items)) return data;
    if (Array.isArray(data)) return { items: data, updatedAt: 0 };
    return null;
  }

  async function saveSiteCategories(payload) {
    await req("site/categories", { method: "PUT", body: JSON.stringify(payload) });
  }

  return {
    isConfigured,
    loadArticles,
    saveArticle,
    deleteArticle,
    loadComments,
    loadAllComments,
    deleteArticleComments,
    loadUsers,
    saveComment,
    deleteComment,
    loadRoles,
    saveRole,
    saveUser,
    deleteUser,
    deleteRole,
    loadUserByEmail,
    loadSiteProfile,
    saveSiteProfile,
    loadSiteCategories,
    saveSiteCategories,
    databaseURL: db
  };
})();
