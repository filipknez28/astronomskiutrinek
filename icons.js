/* Lastne ikone Astronomski Utrinek — brez emoji. */
(function (global) {
  const PATHS = {
    comet: '<path d="M14.8 9.2c2.4 2.4 2.6 6 .6 8.6-2.6 2-6.2 1.8-8.6-.6-2.4-2.4-2.6-6-.6-8.6 2.6-2 6.2-1.8 8.6.6z"/><path d="M15.4 8.6 20 4"/><path d="M14.2 6.2 16.6 3"/><path d="M17.8 9.8 21 8"/>',
    orbit: '<ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(-24 12 12)"/><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/><circle cx="19.2" cy="8.6" r="1.15" fill="currentColor" stroke="none"/>',
    planet: '<circle cx="12" cy="12" r="5.2"/><ellipse cx="12" cy="12" rx="9.2" ry="2.6" transform="rotate(-20 12 12)"/>',
    rocket: '<path d="M13.6 4.4c2.6 2.2 4.2 5.4 4 8.4l-3.2 1.1-2.9-2.9 1.1-3.2c.6-1.3 1.2-2.4 1-3.4z"/><path d="M10.4 12.2 7.2 19l6.8-3.2"/><path d="M9.2 13.4 6.4 12.2"/><path d="M14.6 14.8 15.8 17.6"/>',
    scope: '<path d="M4 16.5 9.2 11.3"/><path d="M8.4 10.5 18.2 4.8l1.2 2.1-9.8 5.7z"/><circle cx="8.8" cy="15.8" r="2.2"/><path d="M10.4 17.4 13 20"/>',
    atom: '<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="8.5" ry="3.4"/><ellipse cx="12" cy="12" rx="8.5" ry="3.4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="8.5" ry="3.4" transform="rotate(-60 12 12)"/>',
    star: '<path d="M12 4.2 13.6 9h5l-4 3 1.5 5L12 14.2 7.9 17l1.5-5-4-3h5z"/>',
    moon: '<path d="M15.2 4.8A7.8 7.8 0 1 0 19 14.6 6.2 6.2 0 0 1 15.2 4.8z"/>',
    meteor: '<path d="M7.8 16.2a2.6 2.6 0 1 0 3.7-3.7 2.6 2.6 0 0 0-3.7 3.7z"/><path d="M11.2 11.6 18.6 4.2"/><path d="M10.2 9.4 14.4 5.2"/><path d="M13.4 12.6 17.8 8.2"/>',
    station: '<path d="M8 12h8"/><path d="M12 9.2v5.6"/><rect x="4.2" y="10.4" width="3.4" height="3.2" rx=".5"/><rect x="16.4" y="10.4" width="3.4" height="3.2" rx=".5"/><path d="M9.6 9.4h4.8M9.6 14.6h4.8"/>',
    triangle: '<path d="M12 5.2 18.4 16.8H5.6z"/><circle cx="12" cy="5.2" r="1" fill="currentColor" stroke="none"/><circle cx="18.4" cy="16.8" r="1" fill="currentColor" stroke="none"/><circle cx="5.6" cy="16.8" r="1" fill="currentColor" stroke="none"/>',
    cloud: '<path d="M7.6 17.4h9.2A3.6 3.6 0 0 0 18 10.4a5 5 0 0 0-9.6-1.4A3.4 3.4 0 0 0 7.6 17.4z"/>',
    cloudOn: '<path d="M7.2 16.8h8.6A3.3 3.3 0 0 0 17 10.4a4.6 4.6 0 0 0-8.8-1.3A3.2 3.2 0 0 0 7.2 16.8z"/><path d="m9.2 13.1 1.8 1.8 3.6-3.8"/>',
    cloudOff: '<path d="M7.2 16.8h8.6A3.3 3.3 0 0 0 17 10.4a4.6 4.6 0 0 0-8.8-1.3A3.2 3.2 0 0 0 7.2 16.8z"/><path d="m9 10.6 6.4 6.4M15.4 10.6 9 17"/>',
    trash: '<path d="M5.4 7.6h13.2"/><path d="M9.6 7.6V6.4a1.6 1.6 0 0 1 1.6-1.6h1.6a1.6 1.6 0 0 1 1.6 1.6v1.2"/><rect x="6.9" y="7.6" width="10.2" height="11.6" rx="2.6"/><path d="M10.4 11.2v4.6M13.6 11.2v4.6"/>',
    remove: '<circle cx="12" cy="12" r="10" fill="#8e8e93" stroke="none"/><path d="M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6" stroke="#fff" stroke-width="2.15"/>',
    plus: '<path d="M12 6.5v11M6.5 12h11"/>',
    search: '<circle cx="11" cy="11" r="5.2"/><path d="m15.2 15.2 4 4"/>',
    link: '<path d="M10 13.6a4 4 0 0 0 6.1.4l2.1-2.1a4 4 0 0 0-5.6-5.6l-1.2 1.2"/><path d="M14 10.4a4 4 0 0 0-6.1-.4L5.8 12.1a4 4 0 1 0 5.6 5.6l1.2-1.2"/>',
    image: '<rect x="4.5" y="6" width="15" height="12" rx="2"/><circle cx="9" cy="10.2" r="1.3"/><path d="m7.2 16.2 3.2-3.4 2.4 2.4 2.4-3.2 3.4 4.2"/>',
    list: '<path d="M10 7.2h9M10 12h9M10 16.8h9"/><circle cx="6.2" cy="7.2" r=".9" fill="currentColor" stroke="none"/><circle cx="6.2" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="6.2" cy="16.8" r=".9" fill="currentColor" stroke="none"/>',
    quote: '<path d="M6.4 16.8c2.2 0 4-1.6 4-4.2V7.2H6.2v5.2h2.2c0 1.8-1 3-2 4.4zm7.4 0c2.2 0 4-1.6 4-4.2V7.2h-4.2v5.2h2.2c0 1.8-1 3-2 4.4z"/>',
    heading: '<path d="M6.4 6.4v11.2M17.6 6.4v11.2M6.4 12h11.2"/>',
    bold: '<path d="M8 6.2h5.2a3.2 3.2 0 0 1 0 6.4H8zm0 6.4h5.8A3.4 3.4 0 0 1 14 19.2H8z"/>',
    italic: '<path d="M14.6 6.2H9.4M14.6 17.8H9.4M13.4 6.2 10.6 17.8"/>',
    underline: '<path d="M7.4 6.2v7.2a4.6 4.6 0 0 0 9.2 0V6.2M6.6 19.2h10.8"/>',
    arrow: '<path d="M14.8 6.8 8.6 12l6.2 5.2"/><path d="M8.8 12h8.6"/>',
    grid: '<rect x="5" y="5" width="5.4" height="5.4" rx="1"/><rect x="13.6" y="5" width="5.4" height="5.4" rx="1"/><rect x="5" y="13.6" width="5.4" height="5.4" rx="1"/><rect x="13.6" y="13.6" width="5.4" height="5.4" rx="1"/>',
    photo: '<circle cx="12" cy="12" r="3.2"/><path d="M8.2 7.2h1.4l.8-1.4h3.2l.8 1.4h1.4A2.2 2.2 0 0 1 18 9.4v6.8A2.2 2.2 0 0 1 15.8 18.4H8.2A2.2 2.2 0 0 1 6 16.2V9.4A2.2 2.2 0 0 1 8.2 7.2z"/>'
  };

  function svg(name, extraClass) {
    const inner = PATHS[name];
    if (!inner) return "";
    const cls = ("ico ico-" + name + (extraClass ? " " + extraClass : "")).trim();
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  }

  function decoEmpty() {
    return (
      '<svg class="empty-art" viewBox="0 0 280 160" fill="none" aria-hidden="true">' +
        '<ellipse cx="140" cy="86" rx="92" ry="28" stroke="currentColor" stroke-opacity=".22"/>' +
        '<ellipse cx="140" cy="86" rx="58" ry="16" stroke="currentColor" stroke-opacity=".18"/>' +
        '<circle cx="140" cy="86" r="10" fill="currentColor" fill-opacity=".9"/>' +
        '<circle cx="218" cy="68" r="4" fill="currentColor" fill-opacity=".7"/>' +
        '<path d="M214 64 248 34" stroke="currentColor" stroke-opacity=".55" stroke-width="1.4"/>' +
        '<path d="M210 60 228 38" stroke="currentColor" stroke-opacity=".35" stroke-width="1.2"/>' +
        '<circle cx="86" cy="52" r="1.6" fill="currentColor" fill-opacity=".55"/>' +
        '<circle cx="168" cy="40" r="1.2" fill="currentColor" fill-opacity=".4"/>' +
        '<circle cx="52" cy="96" r="1.3" fill="currentColor" fill-opacity=".35"/>' +
      "</svg>"
    );
  }

  global.AUIcons = { svg, html: svg, decoEmpty, paths: PATHS };
})(window);
