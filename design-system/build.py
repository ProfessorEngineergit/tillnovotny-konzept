#!/usr/bin/env python3
"""Stitch fonts.css + board.css + languages/<slug>.css into standalone render pages,
plus a gallery index.html with live scaled thumbnails."""
from pathlib import Path

ROOT = Path(__file__).parent
ASSETS = ROOT / "assets"
LANGS_DIR = ROOT / "languages"
OUT = ROOT / "renders"
OUT.mkdir(exist_ok=True)

# (number, slug, NAME, tagline)
LANGS = [
    ("01", "obsidian-glass",        "Obsidian Glass",        "Refractive frosted panels over a starless black. Warm cream light through cold glass."),
    ("02", "liquid-mercury",        "Liquid Mercury",        "Reflective chrome that flows. Metaball surfaces, mercury controls, weightless silver."),
    ("03", "aurora-nebula",         "Aurora Nebula",         "Living mesh-gradients drift like polar light across deep space."),
    ("04", "holographic-foil",      "Holographic Foil",      "Iridescent prism sheen that shifts with every move. Sticker-flip controls."),
    ("05", "aerospace-hud",         "Aerospace HUD",         "Cockpit telemetry. Corner brackets, reticles and phosphor readouts on near-black."),
    ("06", "engineering-blueprint", "Engineering Blueprint", "Technical drawing as interface. Cyan linework, dimensions, a real breaker switch."),
    ("07", "oled-monolith",         "OLED Monolith",         "Pure black, one electric line. Maximal type, minimal chrome. Built for OLED."),
    ("08", "bioluminescent",        "Bioluminescent",        "Abyssal calm with a living glow. Organic forms, jellyfish light, soft blooms."),
    ("09", "plasma-core",           "Plasma Core",           "Hot energy on cold dark. Igniting controls, magma gradients, reactor glow."),
    ("10", "quiet-futurism",        "Quiet Futurism",        "Calm, generous, serene. One soft accent and a lot of air. Light and dark, equally at home."),
    ("11", "carbon-titanium",       "Carbon Titanium",       "Machined hardware. Brushed metal, carbon weave, knurled dials, anodized accent."),
    ("12", "quantum-field",         "Quantum Field",         "A field of nodes and wires. Data made tangible, snapping into place."),
    ("13", "synth-horizon",         "Synth Horizon",         "A neon grid runs to the horizon. Restrained synthwave, modern and sharp."),
    ("14", "paper-lab",             "Paper Lab",             "Light-mode science. Ink-blue on paper, hairlines and a precise grid."),
    ("15", "vapor-glass",           "Vapor Glass",           "Airy frosted glass over colour. Floating depth, ultra-soft, visionOS-clean."),
]

template = (ROOT / "board.html").read_text(encoding="utf-8")
fonts_css = (ASSETS / "fonts.css").read_text(encoding="utf-8")
board_css = (ASSETS / "board.css").read_text(encoding="utf-8")

n = len(LANGS)
built = []
for i, (num, slug, name, tag) in enumerate(LANGS):
    lang_path = LANGS_DIR / f"{slug}.css"
    lang_css = lang_path.read_text(encoding="utf-8") if lang_path.exists() else "/* (skin pending) */"
    style = "\n".join([fonts_css, board_css, lang_css])
    prev_slug = LANGS[(i - 1) % n][1]
    next_slug = LANGS[(i + 1) % n][1]
    theme = "light" if slug in {"quiet-futurism", "paper-lab", "vapor-glass"} else "dark"
    html = (template
            .replace("{{STYLE}}", style)
            .replace("{{THEME}}", theme)
            .replace("{{NUM}}", num)
            .replace("{{NAME}}", name)
            .replace("{{TAGLINE}}", tag)
            .replace("{{SLUG}}", slug)
            .replace("{{PREV_HREF}}", f"{prev_slug}.html")
            .replace("{{NEXT_HREF}}", f"{next_slug}.html")
            .replace("{{POS}}", f"{num} / {n:02d}"))
    (OUT / f"{slug}.html").write_text(html, encoding="utf-8")
    built.append((num, slug, name, tag, lang_path.exists()))

# ---------- gallery ----------
cards = []
for num, slug, name, tag, ok in built:
    badge = "" if ok else '<span class="pending">skin pending</span>'
    cards.append(f"""
      <a class="card" href="{slug}.html">
        <div class="thumb"><iframe src="{slug}.html" loading="lazy" scrolling="no" tabindex="-1" title="{name}"></iframe></div>
        <div class="meta"><span class="num">{num}</span><span class="name">{name}</span>{badge}</div>
        <p class="tag">{tag}</p>
      </a>""")

index = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ProfessorEngineer — Design Language Lab</title>
<style>
{fonts_css}
body{{margin:0;background:#070810;color:#eef1f7;font-family:var(--font-body);}}
.hd{{padding:64px clamp(20px,5vw,72px) 30px;border-bottom:1px solid rgba(255,255,255,.08);}}
.hd h1{{font-family:var(--font-display);font-weight:400;text-transform:uppercase;letter-spacing:.04em;
  font-size:clamp(2rem,5vw,3.4rem);margin:0 0 .35em;
  background:linear-gradient(110deg,#fff,#9fb4ff 60%,#cdb5ff);-webkit-background-clip:text;background-clip:text;color:transparent;}}
.hd p{{color:#aab1c2;max-width:60ch;font-size:1.05rem;margin:0;}}
.hd .sub{{font-family:var(--font-mono);font-size:.74rem;letter-spacing:.3em;color:#69718a;text-transform:uppercase;margin-bottom:1.4em;display:block;}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,420px);justify-content:center;gap:26px;
  padding:40px clamp(20px,5vw,72px) 120px;}}
.card{{display:block;border:1px solid rgba(255,255,255,.1);border-radius:20px;overflow:hidden;
  background:#0c0e16;transition:.25s cubic-bezier(.2,.8,.2,1);color:inherit;}}
.card:hover{{transform:translateY(-5px);border-color:rgba(159,180,255,.5);box-shadow:0 24px 60px rgba(0,0,0,.6);}}
.thumb{{width:100%;height:250px;overflow:hidden;position:relative;background:#05060c;border-bottom:1px solid rgba(255,255,255,.08);}}
.thumb iframe{{position:absolute;top:0;left:0;width:1280px;height:1600px;border:0;
  transform:scale(.328);transform-origin:top left;pointer-events:none;}}
.meta{{display:flex;align-items:center;gap:12px;padding:18px 20px 4px;}}
.num{{font-family:var(--font-mono);font-size:.8rem;color:#69718a;letter-spacing:.1em;}}
.name{{font-family:var(--font-display);font-size:1.05rem;letter-spacing:.04em;text-transform:uppercase;}}
.pending{{margin-left:auto;font-family:var(--font-mono);font-size:.6rem;letter-spacing:.1em;color:#ffce7a;
  border:1px solid rgba(255,206,122,.4);padding:.2em .5em;border-radius:99px;}}
.tag{{color:#aab1c2;font-size:.9rem;padding:0 20px 22px;margin:.4em 0 0;}}
</style></head><body>
<header class="hd">
  <span class="sub">ProfessorEngineer · Bahrian Novotny — Design Language Lab</span>
  <h1>{n} Futuristic Design Languages</h1>
  <p>One shared component board — top bar, hero, the signature toggle, controls, app cards and a type/colour spec — rendered in {n} distinct skins. Real Nasalization + Exo 2. Pick the ones that resonate and we refine to perfection.</p>
</header>
<main class="grid">{''.join(cards)}</main>
</body></html>"""
(OUT / "index.html").write_text(index, encoding="utf-8")

done = sum(1 for *_, ok in built if ok)
print(f"Built {len(built)} render pages ({done} with skins) + index.html -> {OUT}")
