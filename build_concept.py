#!/usr/bin/env python3
"""
Konzept-Generator für tillnovotny-konzept.

Liest Till Novotnys EIGENE alte Seiten (panlogos.org + panlogos.de) aus dem
lokalen Mirror, extrahiert den Hauptinhalt und rendert eine Single-Page-Demo
im Design der neuen Seite (tillnovotny.de) mit drei Tabs:
  - Enneagramm  (Inhalt der heutigen neuen Seite)
  - Panlogos    (kompletter migrierter Inhalt der alten Seiten, mit Sidebar-Nav)
  - Partner     (Partner:innen wie auf der neuen Seite)

Externe Links bleiben erhalten und werden mit ↗ markiert. Shop/Kurse/Backend
werden bewusst NICHT migriert.
"""
import os, re, html, json, pathlib

ROOT = pathlib.Path(__file__).parent
SITE = ROOT / "site"
ORG  = SITE / "panlogos.org"
DE   = SITE / "panlogos.de"   # (panlogos.de liegt direkt unter site/)
DE   = SITE                    # panlogos.de-Seiten liegen in site/ (root)
OUT  = ROOT / "docs"
ASSETS_IMG = OUT / "assets" / "img"

# ---------------------------------------------------------------- Helpers

def read(p):
    return pathlib.Path(p).read_text(encoding="utf-8", errors="ignore")

def extract_col_wide(t):
    """Hauptinhalt aus dem alten Theme: <div class="col_wide"> ... bis clear/footer."""
    m = re.search(r'<div class="col_wide">(.*?)<div class="clear">', t, re.S)
    if not m:
        m = re.search(r'<div class="col_wide">(.*?)</div>\s*<!-- ende content', t, re.S)
    if not m:
        m = re.search(r'<div id="content"[^>]*>(.*?)<!-- ende content', t, re.S)
    return m.group(1) if m else ""

def extract_title(t):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', t, re.S)
    if m:
        return clean_text(m.group(1))
    m = re.search(r'<title>(.*?)</title>', t, re.S)
    return clean_text(m.group(1).split("|")[0]) if m else "Seite"

def clean_text(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()

EXT_RE = re.compile(r'^(https?:)?//', re.I)

def sanitize_html(body, base_dir):
    """
    Säubert den extrahierten Alt-Inhalt:
      - entfernt Skripte/Style/Kommentare/leere &nbsp;-Absätze
      - entfernt das (im Theme doppelte) erste <h1> (wir setzen den Titel selbst)
      - markiert externe Links mit class ext-hint, interne werden zu # (Demo)
      - entfernt nicht ladbare Bilder; lässt vorhandene relativ stehen
    """
    b = body
    b = re.sub(r'<script.*?</script>', '', b, flags=re.S | re.I)
    b = re.sub(r'<style.*?</style>', '', b, flags=re.S | re.I)
    b = re.sub(r'<!--.*?-->', '', b, flags=re.S)
    # erstes h1 raus (Titel kommt separat)
    b = re.sub(r'<h1[^>]*>.*?</h1>', '', b, count=1, flags=re.S)
    # leere &nbsp;-Absätze / align-center-Bilderhüllen vereinfachen
    b = re.sub(r'<p[^>]*>\s*(&nbsp;|\s)*</p>', '', b)

    # Links verarbeiten
    def fix_link(m):
        attrs, inner = m.group(1), m.group(2)
        href = re.search(r'href="([^"]*)"', attrs)
        url = href.group(1) if href else ""
        if url.startswith("mailto:"):
            return f'<a href="{url}">{inner}</a>'
        if EXT_RE.match(url) or url.startswith("http"):
            host = re.sub(r'^https?://', '', url).split('/')[0]
            return (f'<a class="ext-hint" href="{url}" target="_blank" '
                    f'rel="noopener external" title="Externe Website: {host}">{inner}</a>')
        # interne alte Links -> in der Demo deaktiviert (Inhalt liegt als eigener Eintrag vor)
        return f'<a href="#" class="int-old" data-old="{url}">{inner}</a>'
    b = re.sub(r'<a\s+([^>]*)>(.*?)</a>', fix_link, b, flags=re.S | re.I)

    # Bilder: nur behalten, wenn lokal auflösbar; sonst entfernen
    def fix_img(m):
        src = re.search(r'src="([^"]*)"', m.group(0))
        if not src:
            return ''
        s = src.group(1)
        if s.startswith("http"):
            return ''  # externe Tracking-/Shop-Bilder weglassen
        target = (pathlib.Path(base_dir) / s).resolve()
        if target.exists():
            # Bild nach docs/assets/img kopieren und Pfad umschreiben
            name = re.sub(r'[^a-zA-Z0-9._-]', '_', target.name)
            ASSETS_IMG.mkdir(parents=True, exist_ok=True)
            (ASSETS_IMG / name).write_bytes(target.read_bytes())
            alt = re.search(r'alt="([^"]*)"', m.group(0))
            altx = alt.group(1) if alt else ""
            return f'<img src="assets/img/{name}" alt="{altx}" loading="lazy" />'
        return ''
    b = re.sub(r'<img[^>]*>', fix_img, b, flags=re.I)

    # mehrfleerzeilen zusammenfassen
    b = re.sub(r'(\s*<p>\s*</p>\s*)+', '\n', b)
    b = re.sub(r'\n{3,}', '\n\n', b)
    return b.strip()

def slugify(s):
    s = s.lower()
    s = (s.replace("ä","ae").replace("ö","oe").replace("ü","ue").replace("ß","ss"))
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s or "seite"

# ---------------------------------------------------------------- Inhalts-Map
# Struktur der Panlogos-Migration: Gruppen -> Seiten (Pfad relativ zu site/)
# Nur INHALT (kein Shop/Backend). Reihenfolge wie in der alten Navigation.

GROUPS = [
    ("Idee & Philosophie", [
        "panlogos.org/idee/philosophie/panlogos.html",
        "panlogos.org/idee/philosophie/lebendigkeit.html",
        "panlogos.org/idee/philosophie/entwicklung.html",
        "panlogos.org/idee/philosophie/aufgabe.html",
        "panlogos.org/idee/begriff-panlogos.html",
        "panlogos.org/idee/leistungen/nutzen.html",
        "panlogos.org/idee/leistungen/methoden.html",
        "panlogos.org/idee/leistungen/kundenliste.html",
        "panlogos.org/idee/leistungen/projektbeispiele.html",
    ]),
    ("Das Team", [
        "panlogos.org/team/was-uns-verbindet.html",
        "panlogos.org/team/virtuelles-unternehmen.html",
        "panlogos.org/team/rollen.html",
        "panlogos.org/team/rollen/panlogos-partner.html",
        "panlogos.org/team/rollen/assoziierte.html",
        "panlogos.org/team/rollen/gaeste.html",
    ]),
    ("Übungen", [
        "panlogos.org/uebungen/kreativitaetsverstaerker.html",
        "panlogos.org/uebungen/wachheitstrainer.html",
        "panlogos.org/uebungen/wachheitstrainer/wahrnehmungsuebungen.html",
        "panlogos.org/uebungen/gedankenspruenge.html",
    ]),
    ("Werkzeuge", [
        "panlogos.org/werkzeuge/lernen.html",
        "panlogos.org/werkzeuge/lernen/notizen.html",
        "panlogos.org/werkzeuge/wort-schatz.html",
    ]),
    ("Wissen", [
        "panlogos.org/wissen/buchempfehlungen.html",
    ]),
    ("Das Logo (panlogos.de)", [
        "das-logo/der-goldene-schnitt.html",
        "das-logo/panlogos/begriff-panlogos.html",
        "das-logo/panlogos/pan.html",
        "das-logo/panlogos/tropfen.html",
        "das-logo/panlogos/pentagramm.html",
    ]),
    ("Über Till (panlogos.de)", [
        "zu-mir/index.html",
        "offene-seminare/index.html",
    ]),
]

# Untergruppen für „Gedankensprünge“ (viele kleine Geschichten) als eigene Seiten
GEDANKEN_DIR = ORG / "uebungen" / "gedankenspruenge"

def collect_gedankenspruenge():
    pages = []
    if GEDANKEN_DIR.exists():
        for f in sorted(GEDANKEN_DIR.glob("*.html")):
            if "@" in f.name:
                continue
            pages.append(str(f.relative_to(SITE)))
    return pages

def build_entries():
    entries = []   # {id, group, title, html}
    seen = set()
    groups = [ (name, list(paths)) for name, paths in GROUPS ]
    # Gedankensprünge-Unterseiten in die Übungen-Gruppe einhängen
    for name, paths in groups:
        if name == "Übungen":
            paths += collect_gedankenspruenge()
    for gname, paths in groups:
        for rel in paths:
            p = SITE / rel
            if not p.exists() or rel in seen:
                continue
            seen.add(rel)
            t = read(p)
            title = extract_title(t)
            raw = extract_col_wide(t)
            cleaned = sanitize_html(raw, p.parent)
            if len(clean_text(cleaned)) < 40:
                continue  # leere/triviale Seiten überspringen
            eid = slugify(gname[:4] + "-" + title)
            entries.append({"id": eid, "group": gname, "title": title, "html": cleaned})
    return entries

PARTNERS = [
    ("rooftop", "Beratung & Coaching für Führungskräfte", "https://www.rooftop.team/"),
    ("Karin Burmeister", "Burmeister und Partner", "https://burmeisterundpartner.de/"),
    ("Beate Fietze", "", "https://beatefietze.com/"),
    ("Jürgen Kugele", "", "https://www.kugele.org/"),
    ("Kerstin Liesenfeld", "Excellence in Mind", "https://www.excellence-in-mind.com/de/"),
    ("Maren Paas", "", "https://maren-paas.com/"),
    ("Dr. Bernd Sprenger", "", "https://www.bernd-sprenger-berlin.de/"),
    ("Dr. Bernd Wanner", "", "https://berndwanner.com/"),
    ("Dr. Ulrike Wolff", "DWMB", "https://dwmb.com/"),
    ("panlogos", "Die Firma von Till Novotny", "https://www.panlogos.org/zu-mir-till-novotny"),
    ("Ina Wiegels", "Wiegels Consulting", "https://www.wiegels-consulting.de"),
    ("Leonie Novotny", "", "https://leonienovotny.com"),
    ("Dr. Marcel Megerle", "futun", "https://futun.ch/ueber"),
]

# ---------------------------------------------------------------- HTML-Ausgabe

def esc(s): return html.escape(s, quote=True)

def render_panlogos_tab(entries):
    # Sidebar
    groups = {}
    for e in entries:
        groups.setdefault(e["group"], []).append(e)
    side = ['<nav class="side-nav" aria-label="Panlogos-Inhalt">']
    for g, items in groups.items():
        side.append(f'<div class="group-title">{esc(g)}</div>')
        for e in items:
            side.append(f'<a href="#{e["id"]}" data-doc="{e["id"]}">{esc(e["title"])}</a>')
    side.append('</nav>')

    # Dokumente
    docs = ['<div class="doc-content" id="doc-content">']
    for i, e in enumerate(entries):
        style = "" if i == 0 else ' style="display:none"'
        docs.append(f'<article class="doc" id="{e["id"]}"{style}>')
        docs.append(f'<div class="doc-breadcrumb">Panlogos · {esc(e["group"])}</div>')
        docs.append(f'<h1>{esc(e["title"])}</h1>')
        docs.append(e["html"])
        docs.append('</article>')
    docs.append('</div>')

    intro = (
        '<div class="pano-hero"><div class="wrap">'
        '<p class="eyebrow">Aus panlogos · neu unter dem Namen Till Novotny</p>'
        '<h2>Die Inhalte aus panlogos</h2>'
        '<p class="section-intro">Über drei Jahrzehnte Arbeit an Philosophie, Führung, '
        'Kreativität und Wahrnehmung – hier vollständig übernommen und im neuen '
        'Gewand lesbar. Shop, Kurse und Backend bleiben bewusst außen vor.</p>'
        '</div></div>'
    )
    return (intro +
            '<div class="section"><div class="wrap"><div class="docs-layout">' +
            "\n".join(side) + "\n" + "\n".join(docs) +
            '</div></div></div>')

def render_partner_tab():
    cards = []
    for name, role, url in PARTNERS:
        host = re.sub(r'^https?://', '', url).split('/')[0]
        cards.append(
            '<div class="partner">'
            f'<span class="p-name">{esc(name)}</span>'
            + (f'<span class="p-role">{esc(role)}</span>' if role else '')
            + f'<a class="p-link" href="{esc(url)}" target="_blank" rel="noopener external" '
              f'title="Externe Website: {esc(host)}">{esc(host)}</a>'
            '</div>'
        )
    return (
        '<div class="section"><div class="wrap">'
        '<p class="eyebrow">Wie auf der neuen Seite</p>'
        '<h2>Partner:innen</h2>'
        '<p class="section-intro">Menschen und Häuser, mit denen Till Novotny '
        'zusammenarbeitet. Diese Links führen zu den jeweils eigenen Websites '
        '(extern, mit ↗ markiert).</p>'
        f'<div class="partner-grid">{"".join(cards)}</div>'
        '</div></div>'
    )

ENNEAGRAMM_TAB = """
<div class="hero"><div class="wrap">
  <p class="kicker">Coach · Trainer · Autor</p>
  <h1>Für Ihre Selbst-Entwicklung und einen gelingenden Umgang mit anderen.</h1>
  <p class="lead">Schön, dass wir uns hier treffen! Wenn Ihnen Ihre Selbst&shy;entwicklung
  und ein gelingender Umgang mit anderen wichtig sind, sind Sie hier richtig.</p>
  <div class="hero-cta">
    <a class="btn btn-dark" href="#" data-go="panlogos">Die Inhalte aus panlogos</a>
    <a class="btn btn-outline" href="#kontakt-enn">Kontakt</a>
  </div>
</div></div>

<div class="section soft"><div class="wrap two-col">
  <div>
    <p class="eyebrow">Selbst-Entwicklung</p>
    <h2>Das Enneagramm</h2>
    <p>Die Persönlichkeitsmuster des Enneagramms sind ein ideales Werkzeug, um uns
       selbst und auch unsere privaten oder beruflichen Beziehungen weiter zu
       entwickeln. Sie ermöglichen nicht nur, sich selbst und andere besser zu
       verstehen, sondern eröffnen konkrete Entwicklungswege.</p>
    <p>Das Enneagramm beschreibt neun seelische Strukturen, die unsere
       Persönlichkeit von Geburt an prägen und unsere Eigenarten erklärbar machen.
       Als archetypische Muster sind sie allen Menschen gemeinsam.</p>
  </div>
  <div class="price-cards" style="grid-template-columns:1fr">
    <div class="price-card"><h3>Einstieg</h3><p>Sich selbst im Muster wiedererkennen.</p></div>
    <div class="price-card feature"><h3>Intensiv</h3><p>Mit dem Muster bewusst arbeiten.</p></div>
    <div class="price-card"><h3>Persönlich</h3><p>Begleitung im Einzelprozess.</p></div>
  </div>
</div></div>

<div class="section"><div class="wrap two-col">
  <div>
    <p class="eyebrow">Über mich</p>
    <h2>Till Novotny</h2>
    <p>Till Novotny ist geschäftsführender Gesellschafter der panlogos GmbH, die
       Unternehmen und Einzelne in der Erhaltung und Entfaltung ihrer lebendigen
       Kraft unterstützt. Dazu bedarf es einer Verbindung von Unternehmens- und
       Persönlichkeitsentwicklung.</p>
    <p>Seine Grundlagen liegen in einem Management-Studium an der European Business
       School, diversen Weiterbildungen in humanistischer und systemischer
       Psychologie und mehr als drei Jahrzehnten Praxis als Berater, Trainer und Coach.</p>
  </div>
  <div>
    <h3>Bücher von mir</h3>
    <p>Veröffentlichungen rund um Führung, Strategie und Selbstwerdung. Eine
       kuratierte Auswahl finden Sie ausführlich im Bereich
       <a href="#" data-go="panlogos">Panlogos → Wissen</a>.</p>
  </div>
</div></div>

<div class="section dark quote"><div class="wrap">
  <blockquote>„Kühl sollte der Kopf und warm das Herz sein – nicht umgekehrt."</blockquote>
  <p class="by">— Leitgedanke der Arbeit von Till Novotny</p>
</div></div>

<div class="section" id="kontakt-enn"><div class="wrap contact">
  <h2>Kontakt</h2>
  <p>Dies ist ein Konzept-Prototyp. Für die echte Umsetzung stimmen wir Inhalte,
     Reihenfolge und Texte gemeinsam ab.</p>
  <a class="btn btn-dark" href="mailto:tn@panlogos.de">tn@panlogos.de</a>
</div></div>
"""

PAGE = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Till Novotny – Konzept: Inhalte unter eigenem Namen</title>
<meta name="description" content="Konzept-Prototyp: Wie die Inhalte aus panlogos unter der neuen Marke Till Novotny erscheinen – drei Tabs: Enneagramm, Panlogos, Partner." />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="assets/styles.css" />
</head>
<body>

<div class="concept-bar">
  <strong>Konzept-Prototyp</strong> — Vorschlag, wie die <em>Inhalte</em> aus panlogos (ohne Shop/Backend) unter der Marke <em>Till&nbsp;Novotny</em> erscheinen könnten.
</div>

<header class="site-header"><div class="wrap header-inner">
  <a class="brand" href="#" data-go="enneagramm">Till&nbsp;Novotny</a>
  <button class="menu-toggle" aria-label="Menü" id="menuToggle">☰</button>
  <div class="tabs" role="tablist" id="tabs">
    <button class="tab" role="tab" data-tab="enneagramm" aria-selected="true">Enneagramm</button>
    <button class="tab" role="tab" data-tab="panlogos" aria-selected="false">Panlogos</button>
    <button class="tab" role="tab" data-tab="partner" aria-selected="false">Partner</button>
  </div>
</div></header>

<main>
  <section class="panel is-active" id="tab-enneagramm" role="tabpanel">__ENNEAGRAMM__</section>
  <section class="panel" id="tab-panlogos" role="tabpanel">__PANLOGOS__</section>
  <section class="panel" id="tab-partner" role="tabpanel">__PARTNER__</section>
</main>

<footer class="site-footer"><div class="wrap footer-inner">
  <span class="footer-brand">Till&nbsp;Novotny</span>
  <span>© <span id="y"></span> · Konzept-Prototyp — Inhalte aus den bestehenden Seiten, neu sortiert</span>
</div></footer>

<script src="assets/app.js"></script>
</body>
</html>
"""

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    entries = build_entries()
    page = (PAGE
            .replace("__ENNEAGRAMM__", ENNEAGRAMM_TAB)
            .replace("__PANLOGOS__", render_panlogos_tab(entries))
            .replace("__PARTNER__", render_partner_tab()))
    (OUT / "index.html").write_text(page, encoding="utf-8")
    print(f"docs/index.html geschrieben — {len(entries)} migrierte Panlogos-Seiten")
    # kurze Übersicht
    from collections import Counter
    c = Counter(e["group"] for e in entries)
    for g, n in c.items():
        print(f"   {n:>2}  {g}")

if __name__ == "__main__":
    main()
