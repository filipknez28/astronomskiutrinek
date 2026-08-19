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
  »Vse pravice pridržane« na dnu strani (brez kakršnekoli animacije ali povratne
  informacije). Odpre se poziv za vnos skrbniške kode (`123456789`); po pravilni kodi se
  odpre skrbniški meni za pisanje, urejanje in brisanje člankov. Uredniški članki se
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

- `index.html` — struktura strani
- `styles.css` — videz (temna vesoljska tema)
- `app.js` — logika: viri novic, prikaz, skriti sprožilec, skrbniški meni
- `firebase.js` — REST odjemalec za Firebase Realtime Database
- `firebase-config.js` — tvoj URL baze (izpolni po navodilih zgoraj)
- `assets/` — lokalne slike za začetne članke
- `assets/logo.png` — logotip v levem zgornjem kotu (uporabnikov logotip z odstranjenim ozadjem; če datoteka manjka, stran samodejno prikaže rezervni simbol ✦ z imenom)
- `assets/aqw.png` — uporabnikov originalni logotip (kakršen je bil naložen)
- `assets/123456789.png` — prejšnji, uporabniško naloženi logotip (hranjen v repozitoriju)
- `assets/favicon-*.png` — faviconi, generirani iz logotipa
