# Astronomski Utrinek

Sodobna spletna stran z astronomskimi novicami v slovenščini.

## Kaj stran omogoča

- **Uredniške novice** — stran ne vleče tujega API-ja. Objavlja jih urednik
  **Filip Knez** (profilna slika, byline, urejevalnik z slikami, povezavami in izrezom).
- **Komentarji in računi** — obiskovalci si naredijo profil ali se prijavijo z Google
  (`prijava.html`). Google Auth in Analytics sta vklopljena v `firebase-config.js`.
  Prijavljeni uporabniki **komentirajo, odgovarjajo** na komentarje in **urejajo/brišejo
  svoje komentarje**.
- **Vloge (moderator / admin) in začasni bani** — urednik (kdo vnese kodo `1237`) lahko v
  skrbniškem meniju poviša uporabnike v **moderatorje** (urejajo in brišejo poljubne
  komentarje) ali **admini** (poleg tega urejajo članke) ter jih **začasno banira**
  (1 / 7 / 30 dni) ali prekliče ban. Banan uporabnik ne more več komentirati.
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
   **»Oblačna shramba (Firebase): povezano«**.

**Trenutno nastavljena baza:**
`https://astronomski-utrinek-2026-default-rtdb.europe-west1.firebasedatabase.app`

Podatki so shranjeni v bazi pod temi potmi:

- `/articles/{id}` — uredniški članki
- `/comments/{articleId}/{commentId}` — komentarji (vključno z odgovori)
- `/roles/{userId}` — vloge uporabnikov (`role`: `user` / `moderator` / `admin`) in
  `bannedUntil` (časovni žig do katerega je uporabnik začasno banan)
- `/users/{id}` in `/usersByEmail/{key}` — profili uporabnikov

Ni potreben noben API ključ — stran uporablja REST API brez SDK-ja (`firebase.js`).

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

**Pomembno:** testni način dovoljuje branje in pisanje *vsem brez prijave* in
samodejno poteče po približno 30 dneh (baza potem zavrne vse zahteve, dokler pravil
ne posodobiš). Primeren je za razvoj in testiranje — za resno produkcijo bi dodali
Firebase Authentication in strožja pravila. Podaljšaš ga tako, da v zavihku **Rules**
zvišaš časovni žig in klikneš **Publish**.

## Google prijava in Analytics

V `firebase-config.js` je celotna konfiguracija spletne aplikacije.

1. V Firebase konzoli odpri **Authentication → Sign-in method → Google** in vklopi ponudnika.
2. Pod **Authentication → Settings → Authorized domains** dodaj:
   `astronomskiutrinek.top` (in `www.astronomskiutrinek.top`, če ga uporabljaš).
3. Analytics (`G-MC6BYYG33W`) se naloži prek `analytics.js` na javnih straneh.

## SEO (astronomskiutrinek.top)

- `robots.txt` in `sitemap.xml`
- Open Graph / Twitter kartice in `canonical` na javnih straneh
- JSON-LD (`NewsMediaOrganization`, `WebSite`, `NewsArticle`, `Person`)
- `admin` in `prijava` sta `noindex`

V [Google Search Console](https://search.google.com/search-console) dodaj lastnino
`https://astronomskiutrinek.top`, preveri domeno in pošlji
`https://astronomskiutrinek.top/sitemap.xml`.


## Skrbniški portal (celozaslonski overlay)

Po vnosu skrbniške kode na `admin.html` se čez celo stran odpre portal s stransko
navigacijo in petimi razdelki:

| Razdelek | Kaj omogoča |
| --- | --- |
| **Pregled** | Statistika skupnosti (uporabniki, komentarji, slike in povezave), zadnji komentarji, novi uporabniki in razdelitev bralcev po državah. |
| **Novice** | Pisanje, urejanje, osnutki, načrtovane objave in kategorije (kot doslej). |
| **Komentarji** | Vse niti z vseh člankov, iskanje in filtri (brez odgovora, s sliko ali povezavo, uradni odgovori) ter polje za takojšen **uradni odgovor uredništva**. |
| **Uporabniki** | Kartice bralcev z avatarjem, e-naslovom in števci komentarjev, slik in povezav; klik odpre predal s profilom, galerijo, povezavami, komentarji ter gumbi za vloge, bane in **izbris uporabnika** (profil, vloga in vsi njegovi komentarji, tudi v oblaku). |
| **Moj profil** | Službeni profil (ime, slika, naziv), statistika uradnih odgovorov, pregled odgovorov in razdelek skupnosti. |

### Uradni odgovori

Lastnik in admini imajo pod komentarji stikalo **»Objavi kot uredništvo«**. Tak
komentar dobi modro značko s službenim imenom in je posebej označen tudi bralcem.
Privzeto je vklopljeno le, kadar ni prijavljenega bralskega računa.

### Komentarji s sliko in povezavo

Bralci lahko komentarju priložijo sliko (povezava ali datoteka, ki se stisne v
brskalniku) in povezavo. Uredništvo jih vidi zbrane pri vsakem uporabniku v razdelku
Uporabniki. Lokacije obiskovalcev se ne zbirajo.

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
