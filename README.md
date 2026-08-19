# ✦ Astronomski Utrinek

Sodobna spletna stran z astronomskimi novicami v slovenščini.

## Kaj stran omogoča

- **Žive novice** — članke črpa iz [Spaceflight News API](https://spaceflightnewsapi.net) in
  prikaže **Slika dneva** (NASA APOD) kot izpostavljeno novico. Brez internetne povezave
  se prikaže lokalna zbirka člankov.
- **Filtriranje in iskanje** — kategorije (Vesolje, Planeti, Rakete, Opazovanje, Raziskave)
  in polje za iskanje po naslovih in vsebini.
- **Branje člankov** — klik na novico odpre celoten članek v pogovornem oknu.
- **Skriti skrbniški meni** — sproži se z desetimi hitrimi dotiki na besedilo
  `Astronomski trinek 2620C` na dnu strani (brez kakršnekoli animacije ali povratne
  informacije). Odpre se poziv za vnos skrbniške kode; po pravilni kodi se odpre
  skrbniški meni za pisanje, urejanje in brisanje člankov. Uredniški članki se shranijo
  lokalno v brskalnik in so takoj vidni na vrhu novice na strani.

## Zagon

Stran je statična (HTML + CSS + JS), zato jo lahko odpreš neposredno ali jo postrežeš
s poljubnim statičnim strežnikom, npr.:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

ali

```bash
npx serve .
```

## Struktura

- `index.html` — struktura strani
- `styles.css` — videz (temna vesoljska tema)
- `app.js` — logika: viri novic, prikaz, skriti sprožilec, skrbniški meni
- `assets/` — lokalne slike za začetne članke
- `assets/logo.png` — logotip v levem zgornjem kotu (če datoteka manjka, stran samodejno prikaže rezervni simbol ✦)
