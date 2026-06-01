# Till Novotny — Konzept-Prototyp

Ein **Demo-Prototyp** als Vorschlag, wie die _Inhalte_ der bestehenden
panlogos-Webauftritte unter der neuen, auf den **Namen Till Novotny**
ausgerichteten Marke erscheinen könnten – im echten Design der neuen Seite
(<https://tillnovotny.de>): Inter-Schrift, Schwarz auf Off-White, Pink-Akzent.

> **Hinweis:** Vorschlag/Prototyp, keine fertige Website. Es werden ausschließlich
> Till Novotnys **eigene** Inhalte aus seinen eigenen Seiten zusammengeführt.
> Shop, Online-Kurse und Backend bleiben bewusst außen vor.

## Drei Haupt-Tabs

1. **Enneagramm** — der Inhalt, der heute schon auf der neuen Seite steht
   (Selbst-Entwicklung, Über mich, Leitgedanke, Kontakt).
2. **Panlogos** — der **komplette migrierte Inhalt** der alten Seiten
   (panlogos.org + panlogos.de) im neuen Design, mit Seitenleisten-Navigation.
   43 Inhaltsseiten in 7 Gruppen: Idee & Philosophie, Team, Übungen, Werkzeuge,
   Wissen, Das Logo, Über Till.
3. **Partner** — die Partner:innen wie auf der neuen Seite; alle Links führen
   extern zu den jeweils eigenen Websites (mit ↗ markiert).

## Ansehen

- **Lokal:** `python3 -m http.server 4175 --directory docs` → <http://localhost:4175/>
- **GitHub Pages:** Settings → Pages → Branch `main`, Ordner `/docs`

## Reproduzierbar bauen

Die Seite wird aus dem lokalen Offline-Mirror der alten Seiten generiert:

```bash
python3 build_concept.py   # liest site/…  ->  schreibt docs/
```

`build_concept.py` extrahiert den Hauptinhalt (`col_wide`) jeder alten Seite,
säubert ihn (entfernt Theme-Reste/Skripte), markiert externe Links und legt die
Demo als Single-Page mit drei Tabs an. Verwendete Bilder werden nach
`docs/assets/img/` kopiert.

## Repo-Inhalt

```
build_concept.py     # Generator (Alt-Inhalt -> Demo)
docs/
  index.html         # die generierte Demo (3 Tabs)
  assets/styles.css  # Designsystem (1:1 an tillnovotny.de angelehnt)
  assets/app.js      # Tab- und Sidebar-Logik
  assets/img/        # aus dem Alt-Inhalt übernommene Bilder
```

Die lokal nachgebaute **alte** Website (Offline-Mirror, ~33 MB unter `site/`)
ist über `.gitignore` bewusst aus dem Repo ausgeschlossen.
