# LUMEN - the ProfessorEngineer main design language

A fluid, bouncy, dark-first language (Aurora × Bioluminescent × Vapor Glass) with
**3 switchable backgrounds** and a **Vapor-Glass light mode**, meant to drop into
every app - current and future.

## Try it
`http://localhost:4178/lumen/index.html` (server: `python3 -m http.server 4178 --directory design-system`).
Bottom dock: switch background (🧲 magnetic field · ✦ aurora · ✺ bioluminescent) and light/dark.
Move the mouse across the field; hover the magnetic buttons; drag the slider; flip the toggle.

## Backgrounds
1. **field** - dense dot grid; **static at rest**, warps around the cursor only while moving
   (point under cursor stays, surrounding ring is pulled in, falloff to the edge), spring physics.
2. **aurora** - animated flowing polar-light gradients (pure CSS).
3. **bio** - living glowing particles that drift and pulse on their own.
4. **light** - forces the Vapor-Glass look (pastel orbs + frosted glass) regardless of background.

## Drop into an app
```html
<link rel="stylesheet" href="fonts.css">   <!-- Nasalization + Exo 2 -->
<link rel="stylesheet" href="lumen.css">
<body data-theme="dark" data-bg="field">
  <div class="lx-bg">
    <canvas class="lx-canvas"></canvas>
    <div class="lx-aurora"><b></b><b></b><b></b><b></b></div>
    <div class="lx-vapor"></div>
  </div>
  ...your UI using lx-* components...
  <script src="lumen.js"></script>
</body>
```

## Components (markup)
```html
<!-- signature toggle -->
<button class="lx-toggle" aria-checked="true">
  <span class="track"><span class="flood"></span></span><span class="thumb"></span><span class="trail"></span>
</button>

<!-- custom slider -->
<div class="lx-slider" data-min="0" data-max="100" data-value="68">
  <span class="rail"></span><span class="fill"></span><span class="knob"></span><span class="bubble">68</span>
</div>

<!-- segmented -->
<div class="lx-seg"><span class="ind"></span><button class="active">A</button><button>B</button></div>

<!-- magnetic button -->
<button class="lx-btn primary magnetic">Launch <span class="arr">→</span></button>

<!-- input · check · radio · chip · progress · card[data-tilt] -->  (see index.html)
```

## Theme tokens (override per app/brand)
Accent ramp `--acc-1..4` drives `--grad`; surfaces are `--glass / --glass-2/3`,
`--hair`, text `--text / --text-dim / --text-faint`, plus `--glow`, `--shadow`,
`--r*` radii and the `--spring` easing. Light mode overrides them under `[data-theme="light"]`.

## Roadmap
- [ ] expand component set (tabs, modal, tooltip, dropdown, table, toast)
- [ ] tune accent ramp + per-app brand accents
- [ ] package as `lumen/` you can copy or import into each repo
- [ ] roll out to a first real app (e.g. the Apps hub or Caelum web)
