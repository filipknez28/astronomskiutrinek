/* Urejevalnik člankov — orodna vrstica + varen HTML */
(function (global) {
  const ALLOWED = {
    P: 1, BR: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, A: 1, IMG: 1,
    H2: 1, H3: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, FIGURE: 1,
    FIGCAPTION: 1, SPAN: 1
  };

  function sanitizeHtml(html) {
    const wrap = document.createElement("div");
    wrap.innerHTML = String(html || "");
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 8) { child.remove(); return; }
        if (child.nodeType !== 1) return;
        const tag = child.tagName;
        if (!ALLOWED[tag]) {
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          child.replaceWith(frag);
          return;
        }
        [...child.attributes].forEach((attr) => {
          const n = attr.name.toLowerCase();
          const v = attr.value || "";
          if (n.startsWith("on") || n === "style") child.removeAttribute(attr.name);
          else if ((n === "href" || n === "src") && /^\s*javascript:/i.test(v)) child.removeAttribute(attr.name);
          else if (tag === "A" && !["href", "target", "rel"].includes(n)) child.removeAttribute(attr.name);
          else if (tag === "IMG" && !["src", "alt"].includes(n)) child.removeAttribute(attr.name);
        });
        if (tag === "A") {
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener");
        }
        walk(child);
      });
    };
    walk(wrap);
    return wrap.innerHTML;
  }

  function textToHtml(text) {
    return String(text || "")
      .split(/\n{2,}|\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      }</p>`)
      .join("");
  }

  function looksLikeHtml(s) {
    return /<[a-z][\s\S]*>/i.test(String(s || ""));
  }

  function toHtml(raw) {
    if (!raw) return "";
    return looksLikeHtml(raw) ? sanitizeHtml(raw) : textToHtml(raw);
  }

  function bind(textarea, surface, toolbar) {
    if (!textarea || !surface) return { get: () => textarea.value, set: () => {} };

    const syncDown = () => {
      textarea.value = surface.innerHTML.trim();
    };
    const set = (raw) => {
      surface.innerHTML = toHtml(raw) || "<p><br></p>";
      syncDown();
    };

    if (textarea.value) set(textarea.value);
    else surface.innerHTML = "<p><br></p>";

    surface.addEventListener("input", syncDown);
    surface.addEventListener("blur", syncDown);

    const cmd = (name, val = null) => {
      surface.focus();
      document.execCommand(name, false, val);
      syncDown();
    };

    if (toolbar) {
      toolbar.addEventListener("mousedown", (e) => {
        const btn = e.target.closest("[data-cmd]");
        if (btn) e.preventDefault();
      });
      toolbar.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-cmd]");
        if (!btn) return;
        const c = btn.dataset.cmd;
        if (c === "link") {
          const url = window.prompt("Povezava (https://…)", "https://");
          if (url) cmd("createLink", url.trim());
          return;
        }
        if (c === "image-url") {
          const url = window.prompt("Naslov slike (https://…)", "https://");
          if (url) cmd("insertImage", url.trim());
          return;
        }
        if (c === "image-file") {
          const input = toolbar.querySelector("[data-image-file]");
          if (input) input.click();
          return;
        }
        if (c === "formatBlock") {
          cmd("formatBlock", btn.dataset.value || "P");
          return;
        }
        cmd(c);
      });
      const file = toolbar.querySelector("[data-image-file]");
      if (file) {
        file.addEventListener("change", () => {
          const f = file.files && file.files[0];
          file.value = "";
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => cmd("insertImage", reader.result);
          reader.readAsDataURL(f);
        });
      }
    }

    return { get: () => surface.innerHTML.trim(), set, sync: syncDown };
  }

  global.AUEditor = { sanitizeHtml, toHtml, looksLikeHtml, bind };
})(window);
