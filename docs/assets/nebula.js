/*
 * nebula.js — Animated volumetric "nebula / fog" background
 * ---------------------------------------------------------
 * Drop-in, self-contained background renderer for a personal coaching site.
 *
 * Usage (host HTML only needs ONE tag):
 *   <script type="module" src="assets/nebula.js"></script>
 *
 * What it does:
 *   - Dynamically imports Three.js from a CDN (no build step, no local copy).
 *   - Creates a fixed, full-viewport <canvas> behind all page content.
 *   - Renders a soft, drifting pastel mist using layered fBm noise in a
 *     fullscreen fragment shader (a single fullscreen triangle).
 *   - Gentle animation, subtle pointer parallax, resize handling.
 *   - Respects prefers-reduced-motion (renders a single static frame).
 *   - Pauses when the tab is hidden; caps DPR for performance.
 *   - Exposes a tiny API: window.Nebula = { setIntensity(x), destroy() }.
 *
 * If Three.js fails to load, it fails silently and leaves a static CSS
 * gradient visible (see the fallback canvas styling / body untouched).
 */

(async () => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Guard: don't run twice (e.g. if the script is included more than once).
  // ---------------------------------------------------------------------------
  if (window.__nebulaInitialized) return;
  window.__nebulaInitialized = true;

  // ---------------------------------------------------------------------------
  // 0) Create the canvas immediately and give it a static CSS gradient.
  //    This is also our graceful fallback: if Three.js never loads, the page
  //    still shows a tasteful pastel wash instead of nothing.
  // ---------------------------------------------------------------------------
  const canvas = document.createElement('canvas');
  canvas.id = 'nebula-canvas';
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '-1',
    pointerEvents: 'none',
    // Static, near-white pastel fallback gradient (matches the shader palette).
    background:
      'radial-gradient(120% 100% at 20% 10%, #fdf3f6 0%, #fbfbfa 45%) ,' +
      'radial-gradient(120% 100% at 85% 90%, #f1f3fe 0%, rgba(251,251,250,0) 55%)',
  });

  // Insert as the FIRST child of <body> so it sits behind everything.
  const insertCanvas = () => {
    if (document.body.firstChild) {
      document.body.insertBefore(canvas, document.body.firstChild);
    } else {
      document.body.appendChild(canvas);
    }
  };
  if (document.body) {
    insertCanvas();
  } else {
    document.addEventListener('DOMContentLoaded', insertCanvas, { once: true });
    // Wait for the body before continuing so renderer attaches correctly.
    await new Promise((resolve) =>
      document.addEventListener('DOMContentLoaded', resolve, { once: true })
    );
  }

  // ---------------------------------------------------------------------------
  // 1) Load Three.js from CDN. On failure, leave the static gradient and bail.
  // ---------------------------------------------------------------------------
  let THREE;
  try {
    THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
  } catch (err) {
    // Fail silently — the CSS gradient fallback remains visible.
    // (No console.error to keep the page console clean.)
    return;
  }

  // ---------------------------------------------------------------------------
  // 2) Configuration / state.
  // ---------------------------------------------------------------------------
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Render at a slightly reduced resolution for the noise: cheaper, and the
  // soft fog hides the lower sampling rate. Cap DPR at 2 generally.
  const HARD_DPR_CAP = 2;
  const RENDER_DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  const state = {
    intensity: 0.48, // overall strength of the colored mist (deutlich sichtbarer Nebel)
    running: false,
    frameId: 0,
    startTime: performance.now(),
    // Pointer parallax (normalized -1..1), with eased target.
    pointer: { x: 0, y: 0 },
    pointerTarget: { x: 0, y: 0 },
    disposed: false,
  };

  // ---------------------------------------------------------------------------
  // 3) Renderer / scene / camera. We use a fullscreen triangle, so the camera
  //    is a trivial orthographic-ish pass-through; the shader writes clip space
  //    directly, so an OrthographicCamera or even no transform works.
  // ---------------------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // not needed for a soft full-screen gradient
    alpha: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(RENDER_DPR, HARD_DPR_CAP));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  // Pass-through camera; the vertex shader bypasses it, but Three still wants one.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // ---------------------------------------------------------------------------
  // 4) Shaders.
  //    Vertex shader: emits a single fullscreen triangle from gl_VertexID-like
  //    positions supplied as attributes (we build a 3-vertex geometry).
  //    Fragment shader: layered fBm value-noise -> soft glowing mist tinted
  //    with the brand palette over a near-white base.
  // ---------------------------------------------------------------------------
  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
      // 'position' for our triangle is already in clip space (-1..3 range).
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    varying vec2 vUv;

    uniform float uTime;        // seconds
    uniform vec2  uResolution;  // pixels
    uniform vec2  uPointer;     // eased pointer, -1..1
    uniform float uIntensity;   // overall mist strength

    // Palette (sRGB-ish), kept low-contrast for readability over white text bg.
    const vec3 BASE    = vec3(0.984, 0.984, 0.980); // #fbfbfa near-white
    const vec3 PINK    = vec3(0.914, 0.282, 0.455); // #e94874 accent pink
    const vec3 BLUE    = vec3(0.353, 0.502, 0.937); // #5a80ef soft blue
    const vec3 MAGENTA = vec3(0.922, 0.353, 0.514); // #eb5a83 warm magenta

    // --- Hash + value noise -------------------------------------------------
    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)),
               dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453123);
    }

    // Smooth value noise (gradient-ish via smoothstep interpolation).
    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      // Quintic smoothstep for softer interpolation.
      vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

      float a = dot(hash2(i + vec2(0.0, 0.0)) - 0.5, f - vec2(0.0, 0.0));
      float b = dot(hash2(i + vec2(1.0, 0.0)) - 0.5, f - vec2(1.0, 0.0));
      float c = dot(hash2(i + vec2(0.0, 1.0)) - 0.5, f - vec2(0.0, 1.0));
      float d = dot(hash2(i + vec2(1.0, 1.0)) - 0.5, f - vec2(1.0, 1.0));

      float n = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      return n + 0.5; // remap roughly to 0..1
    }

    // Fractal Brownian motion: sum octaves of noise at increasing frequency.
    float fbm(vec2 p) {
      float total = 0.0;
      float amp = 0.55;
      float freq = 1.0;
      // Slight rotation per octave reduces axis-aligned artifacts.
      mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
      for (int i = 0; i < 6; i++) {
        total += amp * valueNoise(p * freq);
        p = rot * p;
        freq *= 2.02;
        amp *= 0.5;
      }
      return total;
    }

    // Domain-warped fBm for that swirling, volumetric cloud feel.
    float warpedFbm(vec2 p, float t) {
      // First warp layer.
      vec2 q = vec2(
        fbm(p + vec2(0.0, 0.0) + t * 0.04),
        fbm(p + vec2(5.2, 1.3) - t * 0.03)
      );
      // Second warp layer (warps the warp).
      vec2 r = vec2(
        fbm(p + 3.5 * q + vec2(1.7, 9.2) + t * 0.05),
        fbm(p + 3.5 * q + vec2(8.3, 2.8) - t * 0.045)
      );
      return fbm(p + 3.0 * r);
    }

    void main() {
      // Aspect-corrected, centered coordinates.
      vec2 uv = vUv;
      vec2 p = (uv - 0.5);
      p.x *= uResolution.x / max(uResolution.y, 1.0);

      // Slow time + gentle pointer parallax (subtle).
      float t = uTime * 0.20;
      vec2 parallax = uPointer * 0.06;

      // Two fog fields at different scales/speeds for depth.
      float f1 = warpedFbm(p * 1.6 + parallax + vec2(0.0, t * 0.10), t);
      float f2 = warpedFbm(p * 3.1 - parallax * 0.5 + vec2(t * 0.06, -t * 0.04), t * 1.3);

      // Combine and shape into soft cloud densities (smoothstep = soft edges).
      float density = smoothstep(0.35, 0.95, f1);
      float wisps   = smoothstep(0.45, 0.90, f2);

      // Color the mist: blend palette by position in the fog fields so the
      // pink/blue/magenta drift across each other.
      float mixA = smoothstep(0.2, 0.8, f1);
      float mixB = smoothstep(0.3, 0.9, f2);

      vec3 fogColor = mix(PINK, BLUE, mixA);
      fogColor = mix(fogColor, MAGENTA, mixB * 0.6);

      // Total colored coverage, scaled by intensity. Keep it gentle.
      float coverage = clamp(density * 0.75 + wisps * 0.45, 0.0, 1.0);
      coverage *= uIntensity;

      // A soft vignette so the corners stay calm and text-friendly.
      float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
      coverage *= mix(0.7, 1.0, vig);

      // Composite the pastel mist over the near-white base.
      vec3 color = mix(BASE, fogColor, coverage);

      // A hair of dithering to avoid banding on smooth gradients.
      float dither = (hash2(gl_FragCoord.xy).x - 0.5) / 255.0;
      color += dither;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // ---------------------------------------------------------------------------
  // 5) Fullscreen triangle geometry (covers the viewport with 3 vertices).
  //    Positions are already in clip space; uv gives 0..1 across the screen.
  // ---------------------------------------------------------------------------
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([
    -1, -1, 0,
     3, -1, 0,
    -1,  3, 0,
  ]);
  const uvs = new Float32Array([
    0, 0,
    2, 0,
    0, 2,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  const uniforms = {
    uTime: { value: 0 },
    uResolution: {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
    },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uIntensity: { value: state.intensity },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; // triangle is in clip space; never cull it
  scene.add(mesh);

  // ---------------------------------------------------------------------------
  // 6) Resize handling: keep renderer + resolution uniform in sync.
  // ---------------------------------------------------------------------------
  function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(RENDER_DPR, HARD_DPR_CAP));
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w, h);
    // If we're not running a loop (reduced motion), re-draw the static frame.
    if (!state.running && !state.disposed) renderOnce();
  }

  // ---------------------------------------------------------------------------
  // 7) Pointer parallax: store a normalized target; ease toward it each frame.
  // ---------------------------------------------------------------------------
  function handlePointer(e) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    state.pointerTarget.x = x;
    state.pointerTarget.y = y;
  }

  // Optional: device orientation drives parallax on mobile (very subtle).
  function handleOrientation(e) {
    if (e.gamma == null || e.beta == null) return;
    // gamma: left-right [-90,90], beta: front-back [-180,180]
    state.pointerTarget.x = Math.max(-1, Math.min(1, e.gamma / 45));
    state.pointerTarget.y = Math.max(-1, Math.min(1, (e.beta - 45) / 45));
  }

  // ---------------------------------------------------------------------------
  // 8) Render helpers.
  // ---------------------------------------------------------------------------
  function renderOnce() {
    // Update uniforms once (used for the static reduced-motion frame too).
    uniforms.uTime.value = (performance.now() - state.startTime) / 1000;
    uniforms.uPointer.value.set(state.pointer.x, state.pointer.y);
    uniforms.uIntensity.value = state.intensity;
    renderer.render(scene, camera);
  }

  function animate() {
    if (state.disposed) return;
    state.frameId = requestAnimationFrame(animate);

    // Ease pointer toward its target for smooth, dreamy parallax.
    state.pointer.x += (state.pointerTarget.x - state.pointer.x) * 0.04;
    state.pointer.y += (state.pointerTarget.y - state.pointer.y) * 0.04;

    uniforms.uTime.value = (performance.now() - state.startTime) / 1000;
    uniforms.uPointer.value.set(state.pointer.x, state.pointer.y);
    uniforms.uIntensity.value = state.intensity;

    renderer.render(scene, camera);
  }

  function start() {
    if (state.running || state.disposed) return;
    state.running = true;
    state.frameId = requestAnimationFrame(animate);
  }

  function stop() {
    state.running = false;
    if (state.frameId) cancelAnimationFrame(state.frameId);
    state.frameId = 0;
  }

  // ---------------------------------------------------------------------------
  // 9) Visibility handling: pause the loop when the tab is hidden.
  // ---------------------------------------------------------------------------
  function handleVisibility() {
    if (prefersReducedMotion) return; // never looping anyway
    if (document.hidden) {
      stop();
    } else {
      // Avoid a time jump after being hidden: rebase the clock.
      state.startTime = performance.now() - uniforms.uTime.value * 1000;
      start();
    }
  }

  // ---------------------------------------------------------------------------
  // 10) Wire up event listeners.
  // ---------------------------------------------------------------------------
  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('pointermove', handlePointer, { passive: true });
  window.addEventListener('deviceorientation', handleOrientation, { passive: true });
  document.addEventListener('visibilitychange', handleVisibility);

  // ---------------------------------------------------------------------------
  // 11) Kick off: either a single static frame, or the animation loop.
  // ---------------------------------------------------------------------------
  if (prefersReducedMotion) {
    // Render exactly one pretty, motionless frame.
    renderOnce();
  } else {
    start();
  }

  // ---------------------------------------------------------------------------
  // 12) Public API + cleanup.
  // ---------------------------------------------------------------------------
  function destroy() {
    if (state.disposed) return;
    state.disposed = true;
    stop();

    window.removeEventListener('resize', handleResize);
    window.removeEventListener('pointermove', handlePointer);
    window.removeEventListener('deviceorientation', handleOrientation);
    document.removeEventListener('visibilitychange', handleVisibility);

    // Dispose GPU resources.
    geometry.dispose();
    material.dispose();
    renderer.dispose();

    // Remove the canvas from the DOM.
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);

    window.__nebulaInitialized = false;
  }

  window.Nebula = {
    /**
     * Set overall mist intensity. Clamped to a tasteful range so it never
     * overwhelms the page or hurts text readability.
     * @param {number} x desired intensity (sensible: 0.18–0.35)
     */
    setIntensity(x) {
      const v = Number(x);
      if (!Number.isFinite(v)) return;
      state.intensity = Math.max(0.0, Math.min(0.85, v));
      uniforms.uIntensity.value = state.intensity;
      // If static (reduced motion), repaint to reflect the change.
      if (!state.running && !state.disposed) renderOnce();
    },
    /** Tear everything down and restore the static gradient/page state. */
    destroy,
  };
})();
