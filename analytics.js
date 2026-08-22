/* Google Analytics 4 */
(function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const id = cfg.measurementId;
  if (!id || id.indexOf("G-") !== 0) return;
  if (location.protocol === "file:") return;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", id, { anonymize_ip: true, transport_type: "beacon" });
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
})();
