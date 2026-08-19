# ✦ Astronomski Utrinek

Sodobna spletna stran z astronomskimi novicami v slovenščini.

## Kaj stran omogoča

- **Uredniške novice** — stran ne vleče tujega API-ja. Objavlja jih urednik
  **Filip Knez** (profilna slika, byline, urejevalnik z slikami, povezavami in izrezom).
- **Komentarji in računi** — obiskovalci si naredijo profil ali se prijavijo z Google
  (`prijava.html`). Google Auth in Analytics sta vklopljena v `firebase-config.js`.
- **Filtriranje in iskanje** — kategorije (Vesolje, Planeti, Rakete, Opazovanje, Raziskave)
  in polje za iskanje po naslovih in vsebini.
- **Branje člankov** — klik na novico odpre **lastno stran** (`clanek.html`), ki jo
  lahko mirno prelistaš. Ni overlaya in te ne odnese na tuj portal.
- **O strani** — ločena stran (`o-strani.html`), ne razdelek na dnu domače.
- **Novice** — arhiv na `novice.html`.
- **Skriti skrbniški meni** — sproži se z desetimi hitrimi dotiki na besedilo
  »Vse pravice pridržane« na dnu strani (brez kakršnekoli animacije ali povratne
  informacije). Odpre se **celostranska** prijava (`admin.html`); po kodi
  (`1237`) je uredništvo prav tako celostransko. Uredniški članki se
  shranijo lokalno v brskalnik in so takoj vidni na vrhu novice na strani.
- **Firebase Realtime Database (testni način)** — če je nastavljen, so uredniški članki
  shranjeni v oblak in vidni vsem obiskovalcem (glej spodaj).

## Integracija s Firebase Realtime Database (testni način)

Članki iz skrbniškega menija se privzeto shranjujejo le v brskalnik. S Firebase
Realtime Database v testnem načinu postanejo vidni vsem obiskovalcem strani.

### Nastavitev v Firebase konzoli

1. Odpri [console.firebase.google.com](https://console.firebase.google.com) in **ustvari nov projekt**.
2. V levem meniju **Build → Realtime Database → Create database**.
3. Izberi lokacijo (npr. `europe-west1`) in klikni **Next → Start in test mode**.
4. Na kartici **Data** kopiraj URL baze, npr.:
   `https://tvoj-projekt-default-rtdb.europe-west1.firebasedatabase.app`
5. V datoteki **`firebase-config.js`** zamenjaj `VAS-PROJEKT` s svojim URL-jem baze.
6. Znova naloži stran — v skrbniškem meniju se pokaže status:
   **»☁ Oblačna shramba (Firebase): povezano«**.

✅ **Trenutno nastavljena baza:**
`https://astronomski-utrinek-2026-default-rtdb.europe-west1.firebasedatabase.app`

Članki so shranjeni v bazi pod potjo `/articles/{id}`. Ni potreben noben API ključ —
stran uporablja REST API brez SDK-ja (`firebase.js`).

### Pravila (Rules) v testnem načinu

Firebase pri ustvarjanju baze v testnem načinu samodejno nastavi odprta pravila,
podobna temu:

```json
{
  "rules": {
    ".read": "now < 1800000000000",
    ".write": "now < 1800000000000"
  }
}
```

⚠️ **Pomembno:** testni način dovoljuje branje in pisanje *vsem brez prijave* in
samodejno poteče po približno 30 dneh (baza potem zavrne vse zahteve, dokler pravil
ne posodobiš). Primeren je za razvoj in testiranje — za resno produkcijo bi dodali
Firebase Authentication in strožja pravila. Podaljšaš ga tako, da v zavihku **Rules**
zvišaš časovni žig in klikneš **Publish**.

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

- `index.html` — naslovnica
- `novice.html` — arhiv
- `o-strani.html` — o uredništvu
- `clanek.html` — članek
- `prijava.html` — profil / Google
- `admin.html` — uredništvo
- `robots.txt`, `sitemap.xml`, `site.webmanifest` — SEO
- `analytics.js` — Google Analytics 4
- `styles.css` — videz
- `app.js` — logika strani
- `firebase.js` — REST odjemalec za Firebase Realtime Database
- `firebase-config.js` — Firebase in Analytics konfiguracija
- `assets/` — lokalne slike za začetne članke
- `assets/aqw.png` — originalni logotip, prikazan v levem zgornjem kotu (temna podlaga se zlije s temno glavo)
- `assets/logo-prosojen.png` — rezervna, prosojna verzija logotipa (shranjena za morebitno kasnejšo uporabo)
- `assets/123456789.png` — prejšnji, uporabniško naloženi logotip (hranjen v repozitoriju)
- `assets/filip-knez.jpg` — profilna slika urednika
- `assets/favicon-*.png` — faviconi, izrezani iz logotipa `aqw.png`
