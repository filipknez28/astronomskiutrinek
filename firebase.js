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

  async function saveUser(user) {
    if (!user || !user.id) return;
    await req("users/" + encodeURIComponent(user.id), {
      method: "PUT",
      body: JSON.stringify(user)
    });
  }

  return {
    isConfigured,
    loadArticles,
    saveArticle,
    deleteArticle,
    loadComments,
    saveComment,
    saveUser,
    databaseURL: db
  };
})();
