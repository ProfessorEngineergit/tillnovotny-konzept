# ProfessorEngineer - Design Language Lab

15 futuristic, highly distinct design languages for the ProfessorEngineer /
Bahrian-Novotny app universe (web · mobile · desktop). Each language is rendered
on **one identical component board** so they are directly comparable. Real
**Nasalization** (display) + **Exo 2** (body) are embedded locally.

## View

```bash
python3 -m http.server 4178 --directory design-system
# then open  http://localhost:4178/renders/index.html   (gallery, all 15)
```

Every render page has a ← / → switcher (bottom center) to flip through all 15.
Click the signature **toggle** and the **◐ theme dot** (top right) - they are live.

## The 15 languages

| # | Language | Signature toggle | Mode |
|---|----------|------------------|------|
| 01 | Obsidian Glass | liquid-glass capsule | dark |
| 02 | Liquid Mercury | mercury droplet | dark |
| 03 | Aurora Nebula | comet on a nebula track | dark |
| 04 | Holographic Foil | shimmering foil chip | dark |
| 05 | Aerospace HUD | guarded missile switch | dark |
| 06 | Engineering Blueprint | breaker / knife switch | dark |
| 07 | OLED Monolith | stark sliding block | dark (OLED) |
| 08 | Bioluminescent | pulsing jellyfish orb | dark |
| 09 | Plasma Core | igniting reactor core | dark |
| 10 | Quiet Futurism | refined growing pill | **light** + dark |
| 11 | Carbon Titanium | knurled metal dial | dark |
| 12 | Quantum Field | node snapping on a wire | dark |
| 13 | Synth Horizon | neon tube | dark |
| 14 | Paper Lab | precise ink toggle | **light** + dark |
| 15 | Vapor Glass | floating glass pill | **light** + dark |

## How it is built (token-driven)

```
design-system/
  build.py              # stitches the pieces -> renders/
  board.html            # the ONE shared component board (markup)
  assets/
    fonts/              # Nasalization.otf, Exo2.ttf (embedded, no CDN needed)
    fonts.css           # @font-face + reset + font tokens   (loaded first)
    board.css           # shared LAYOUT + neutral dark baseline, all driven by CSS vars
    board.js            # toggle / theme / segmented / range interactivity
  languages/<slug>.css  # ONE skin per language: overrides tokens, paints the
                        # background, reskins the signature toggle
  renders/              # generated standalone pages + index.html gallery
```

Each language mostly redefines a small set of tokens on `body.lang-<slug>`:

```
--bg --surface --surface-2 --surface-3 --border --border-strong
--text --text-dim --text-faint --accent --accent-2 --accent-ink --glow
--radius --radius-lg --shadow --shadow-lg
```

…then adds a bespoke `.db-bg` and a bespoke `.db-toggle` skin.

## Modify / regenerate

1. Edit `languages/<slug>.css` (or `board.css` for everyone at once).
2. `python3 build.py`
3. Refresh the browser.

To add a language: create `languages/<slug>.css`, add a row to `LANGS` in
`build.py`, rebuild.
