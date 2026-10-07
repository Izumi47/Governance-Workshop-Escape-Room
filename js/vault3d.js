/**
 * Vault3D — Three.js layer for every background and cinematic effect.
 *
 * Background (canvas behind the UI, always running):
 *   a vault corridor with a giant combination ring, flowing data particles and
 *   one motif per manual (Python code panels, Power BI bar chart, ALM gears,
 *   SOP document sheets). It reacts to <body> classes / data-chamber, so the
 *   game code never has to talk to it: timer-warning/danger, vault-critical,
 *   vault-correct-bloom (green shockwave) and vault-exploded (blast + shake).
 *
 * FX (canvas above the UI, only rendered while an effect plays):
 *   Vault3D.breach()                   3D vault door unlock (gate.js)
 *   Vault3D.shutter(onMid, onDone)     blast doors on screen changes (ui.js)
 *   Vault3D.confetti()                 confetti cannons on results (ui.js)
 *   Vault3D.explode(originEl)          bomb detonation (game.js)
 *   Vault3D.mountBomb(svgEl)           3D timer bomb, driven by bomb.js
 *
 * If WebGL or the CDN is unavailable, window.Vault3D is never defined and the
 * callers skip the effect.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const body = document.body;

const PALETTE = {
  bg: 0x0d0f14,
  amber: 0xc9921a,
  gold: 0xf0c45a,
  steel: 0x8a909c,
  success: 0x3dd68c,
  danger: 0xe05a62,
  warning: 0xffb454,
  fire: 0xff7a3c
};
const CHAMBER = { python: 0x3dd68c, powerbi: 0x59c2ff, alm: 0xc9921a, sop: 0xe05a62 };

/* ---------------------------------------------------------------- helpers */

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const easeIn = (x) => x * x * x;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);

let shake = 0; // shared camera shake, decayed by the background loop

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const glowTex = canvasTex(128, 128, (g, w, h) => {
  const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
});

const smokeTex = canvasTex(128, 128, (g, w, h) => {
  for (let i = 0; i < 14; i += 1) {
    const x = rand(0.3, 0.7) * w;
    const y = rand(0.3, 0.7) * h;
    const r = rand(0.18, 0.32) * w;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(255,255,255,0.22)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }
});

const brushedTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = "#a4aab4";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1600; i += 1) {
    const v = Math.random() < 0.5 ? 255 : 0;
    g.fillStyle = "rgba(" + v + "," + v + "," + v + "," + rand(0.02, 0.07) + ")";
    g.fillRect(0, Math.random() * h, w, rand(1, 2.5));
  }
});
brushedTex.wrapS = brushedTex.wrapT = THREE.RepeatWrapping;

function labelTex(text, color, ring) {
  const tex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#11141a";
    g.beginPath();
    g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = ring || color;
    g.lineWidth = 18;
    g.beginPath();
    g.arc(w / 2, h / 2, w / 2 - 22, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = color;
    g.font = '150px "Bebas Neue", Impact, "Arial Narrow", sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = color;
    g.shadowBlur = 30;
    g.fillText(text, w / 2, h / 2 + 8);
  });
  tex.userData.own = true;
  return tex;
}

function steel(extra) {
  return new THREE.MeshStandardMaterial(Object.assign({
    color: PALETTE.steel,
    map: brushedTex,
    metalness: 0.85,
    roughness: 0.36
  }, extra));
}

function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => {
      if (m.map && m.map.userData.own) m.map.dispose();
      m.dispose();
    });
  });
}

/** Fullscreen quad drawn in clip space (vignette / flash). */
function screenQuad(uniforms, fragment) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: fragment
    })
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = 999;
  return mesh;
}

function envFor(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return tex;
}

function makeRenderer(className, alpha, maxRatio) {
  const canvas = document.createElement("canvas");
  canvas.className = className;
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  return renderer;
}

/** Simple additive particle burst; caller adds .points and calls .step(dt). */
function makeSparks(opts) {
  const n = opts.count;
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    const p = opts.at(i);
    const v = opts.vel(i);
    pos.set(p, i * 3);
    vel.set(v, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: opts.size,
    map: glowTex,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const a = new THREE.Color(opts.colors[0]);
  const b = new THREE.Color(opts.colors[1]);
  const c = new THREE.Color();
  let age = 0;
  const drag = opts.drag || 0;
  const gravity = opts.gravity || 0;
  return {
    points,
    step(dt) {
      age += dt;
      const k = clamp01(age / opts.life);
      const damp = Math.exp(-drag * dt);
      c.copy(a).lerp(b, k);
      for (let i = 0; i < n; i += 1) {
        const j = i * 3;
        vel[j] *= damp;
        vel[j + 1] = vel[j + 1] * damp - gravity * dt;
        vel[j + 2] *= damp;
        pos[j] += vel[j] * dt;
        pos[j + 1] += vel[j + 1] * dt;
        pos[j + 2] += vel[j + 2] * dt;
        col[j] = c.r;
        col[j + 1] = c.g;
        col[j + 2] = c.b;
      }
      mat.opacity = 1 - k * k;
      mat.size = opts.size * (1 - 0.6 * k);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
  };
}

/* ============================================================ BACKGROUND */

function createBackground() {
  const renderer = makeRenderer("vault3d-bg", false, 1.25);
  body.insertBefore(renderer.domElement, body.firstChild);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.bg);
  scene.fog = new THREE.FogExp2(PALETTE.bg, 0.024);
  scene.environment = envFor(renderer);
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(55, Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight), 0.1, 120);
  camera.position.set(0, 0.6, 12);

  scene.add(new THREE.HemisphereLight(0x8090a8, 0x0a0a10, 0.6));
  const key = new THREE.DirectionalLight(0xffe2b0, 0.9);
  key.position.set(-6, 10, 8);
  scene.add(key);
  const moodLight = new THREE.PointLight(PALETTE.amber, 80, 70, 1.4);
  moodLight.position.set(0, 2, -12);
  scene.add(moodLight);

  const mood = new THREE.Color(PALETTE.amber);
  const moodMat = new THREE.MeshBasicMaterial({ color: mood, transparent: true, opacity: 0.75, fog: true });

  /* Corridor grids (floor + ceiling), scrolling toward the camera. */
  function grid(y, opacity) {
    const pts = [];
    const size = 90;
    const step = 2.5;
    for (let i = -size / 2; i <= size / 2; i += step) {
      pts.push(i, 0, -size / 2, i, 0, size / 2);
      pts.push(-size / 2, 0, i, size / 2, 0, i);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({ color: mood, transparent: true, opacity });
    const lines = new THREE.LineSegments(geo, mat);
    lines.position.y = y;
    lines.userData.step = step;
    scene.add(lines);
    return lines;
  }
  const floor = grid(-5, 0.22);
  const ceiling = grid(8, 0.08);

  /* The vault combination ring in the distance. */
  const ring = new THREE.Group();
  ring.position.set(0, 1.5, -26);
  scene.add(ring);
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(10, 0.5, 24, 128), steel()));
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(9.1, 0.09, 8, 128), moodMat));
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1, 0.12), moodMat, 72);
  for (let i = 0; i < 72; i += 1) {
    const a = (i / 72) * Math.PI * 2;
    const len = i % 6 === 0 ? 1.3 : 0.6;
    q.setFromAxisAngle(zAxis, a);
    v3.set(Math.sin(-a) * 8.2, Math.cos(a) * 8.2, 0);
    s3.set(1, len, 1);
    ticks.setMatrixAt(i, m4.compose(v3, q, s3));
  }
  ring.add(ticks);
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 16), steel({ color: 0x6d737e }));
    bolt.position.set(Math.cos(a) * 11.2, Math.sin(a) * 11.2, 0);
    bolt.rotation.z = a - Math.PI / 2;
    ring.add(bolt);
  }
  const wheel = new THREE.Group();
  ring.add(wheel);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.28, 16, 96), steel({ color: 0xb0b6c0 })));
  for (let i = 0; i < 5; i += 1) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 11, 12), steel());
    spoke.rotation.z = (i / 5) * Math.PI;
    wheel.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.8, 48), steel({ color: 0x5c626c }));
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  const hubGlow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), moodMat);
  hubGlow.position.z = 0.45;
  wheel.add(hubGlow);

  /* Data particles streaming through the corridor. */
  const P = 1800;
  const pPos = new Float32Array(P * 3);
  for (let i = 0; i < P; i += 1) {
    pPos[i * 3] = rand(-30, 30);
    pPos[i * 3 + 1] = rand(-5, 8);
    pPos[i * 3 + 2] = rand(-45, 12);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: mood.clone(),
    size: 0.14,
    map: glowTex,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  /* ---- Chamber motifs ---- */
  const motifs = {};
  function motif(id, group, update) {
    group.visible = false;
    group.userData.fade = 0;
    group.traverse((o) => {
      if (o.material) {
        o.material.transparent = true;
        o.material.userData.base = o.material.opacity;
      }
    });
    scene.add(group);
    motifs[id] = { group, update };
  }

  // Python: scrolling code panels on both walls.
  (function () {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: CHAMBER.python, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    const H = 22;
    const LINES = 110;
    const panels = [];
    [-1, 1].forEach((side) => {
      const panel = new THREE.Group();
      panel.position.set(side * 14, -9, -7);
      panel.rotation.y = -side * 0.55;
      const inner = new THREE.Group();
      panel.add(inner);
      for (let copy = 0; copy < 2; copy += 1) {
        const lines = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.11, 0.02), mat, LINES);
        let indent = 0;
        for (let i = 0; i < LINES; i += 1) {
          if (Math.random() < 0.25) indent = Math.max(0, Math.min(4, indent + (Math.random() < 0.5 ? -1 : 1)));
          const w = Math.random() < 0.12 ? 0.001 : rand(0.6, 4);
          v3.set(-3 + indent * 0.6 + w / 2, (i / LINES) * H, 0);
          s3.set(w, 1, 1);
          lines.setMatrixAt(i, m4.compose(v3, q.identity(), s3));
        }
        lines.position.y = copy * H;
        inner.add(lines);
      }
      g.add(panel);
      panels.push(inner);
    });
    motif("python", g, (t) => {
      panels.forEach((inner, i) => { inner.position.y = -((t * (0.9 + i * 0.25)) % H); });
    });
  })();

  // Power BI: animated 3D bar chart on the floor.
  (function () {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(1.4, 1, 1.4);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: CHAMBER.powerbi, emissive: CHAMBER.powerbi, emissiveIntensity: 0.3,
      metalness: 0.3, roughness: 0.4, opacity: 0.35
    });
    const cols = [];
    for (let x = -18; x <= 18; x += 3.2) {
      if (Math.abs(x) < 5) continue;
      for (let z = -26; z <= -8; z += 4.5) cols.push([x, z]);
    }
    const bars = new THREE.InstancedMesh(geo, mat, cols.length);
    g.add(bars);
    g.position.y = -5;
    motif("powerbi", g, (t) => {
      cols.forEach((c, i) => {
        const hgt = 0.6 + 4.5 * (0.5 + 0.5 * Math.sin(t * 0.9 + c[0] * 0.35 + c[1] * 0.5));
        v3.set(c[0], 0, c[1]);
        s3.set(1, hgt, 1);
        bars.setMatrixAt(i, m4.compose(v3, q.identity(), s3));
      });
      bars.instanceMatrix.needsUpdate = true;
    });
  })();

  // ALM: meshing gears (build → test → prod machinery).
  (function () {
    const g = new THREE.Group();
    function gear(teeth, r) {
      const shape = new THREE.Shape();
      const tip = r + 0.35;
      const root = r - 0.3;
      const step = (Math.PI * 2) / teeth;
      for (let i = 0; i < teeth; i += 1) {
        const a = i * step;
        const pts = [[root, a], [tip, a + step * 0.2], [tip, a + step * 0.5], [root, a + step * 0.7]];
        pts.forEach((p, k) => {
          const x = Math.cos(p[1]) * p[0];
          const y = Math.sin(p[1]) * p[0];
          if (i === 0 && k === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
        });
      }
      const hole = new THREE.Path();
      hole.absarc(0, 0, r * 0.35, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false, curveSegments: 6 });
      geo.center();
      return new THREE.Mesh(geo, steel({ color: 0xd8a64a, emissive: CHAMBER.alm, emissiveIntensity: 0.18, opacity: 0.85 }));
    }
    const sets = [
      { pos: [12, 3, -12], gears: [[16, 3], [10, 1.9], [8, 1.5]] },
      { pos: [-13, -1.5, -14], gears: [[12, 2.3], [18, 3.4]] }
    ];
    const spinners = [];
    sets.forEach((set) => {
      const cluster = new THREE.Group();
      cluster.position.set(set.pos[0], set.pos[1], set.pos[2]);
      cluster.rotation.y = set.pos[0] > 0 ? -0.5 : 0.5;
      let x = 0;
      let dir = 1;
      let prevR = 0;
      set.gears.forEach((spec, i) => {
        const mesh = gear(spec[0], spec[1]);
        if (i > 0) x += prevR + spec[1] + 0.05;
        mesh.position.set(x, i % 2 ? -0.6 : 0, 0);
        mesh.rotation.z = i % 2 ? Math.PI / spec[0] : 0;
        cluster.add(mesh);
        spinners.push({ mesh, speed: (dir * 0.6 * 16) / spec[0] });
        dir = -dir;
        prevR = spec[1];
      });
      g.add(cluster);
    });
    motif("alm", g, (t, dt) => {
      spinners.forEach((s) => { s.mesh.rotation.z += s.speed * dt; });
    });
  })();

  // SOP: drifting approval documents.
  (function () {
    const g = new THREE.Group();
    const docTex = canvasTex(256, 340, (c, w, h) => {
      c.fillStyle = "rgba(28,24,28,0.92)";
      c.fillRect(0, 0, w, h);
      c.strokeStyle = "#e05a62";
      c.lineWidth = 4;
      c.strokeRect(2, 2, w - 4, h - 4);
      c.fillStyle = "#e05a62";
      c.fillRect(18, 18, w - 36, 26);
      c.fillStyle = "rgba(235,232,225,0.55)";
      for (let i = 0; i < 9; i += 1) {
        c.fillRect(46, 66 + i * 22, rand(80, 180), 6);
        c.strokeStyle = "rgba(235,232,225,0.55)";
        c.lineWidth = 2;
        c.strokeRect(20, 62 + i * 22, 14, 14);
      }
      c.strokeStyle = "#e05a62";
      c.lineWidth = 5;
      c.beginPath();
      c.arc(w - 64, h - 60, 38, 0, Math.PI * 2);
      c.stroke();
      c.font = 'bold 18px "JetBrains Mono", monospace';
      c.fillStyle = "#e05a62";
      c.textAlign = "center";
      c.fillText("SOP", w - 64, h - 54);
    });
    const geo = new THREE.PlaneGeometry(1.5, 2);
    const mat = new THREE.MeshBasicMaterial({ map: docTex, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    const docs = [];
    for (let i = 0; i < 26; i += 1) {
      const d = new THREE.Mesh(geo, mat);
      const side = i % 2 ? 1 : -1;
      d.position.set(side * rand(6, 17), rand(-5, 8), rand(-22, -2));
      d.rotation.set(rand(-0.4, 0.4), rand(-0.8, 0.8), rand(-0.5, 0.5));
      d.userData.spin = [rand(-0.2, 0.2), rand(-0.3, 0.3), rand(-0.15, 0.15)];
      d.userData.rise = rand(0.25, 0.6);
      g.add(d);
      docs.push(d);
    }
    motif("sop", g, (t, dt) => {
      docs.forEach((d) => {
        const s = d.userData.spin;
        d.rotation.x += s[0] * dt;
        d.rotation.y += s[1] * dt;
        d.rotation.z += s[2] * dt;
        d.position.y += d.userData.rise * dt;
        if (d.position.y > 9) d.position.y = -6;
      });
    });
  })();

  /* Vignette (also the timer-urgency red pulse). */
  const vignette = screenQuad(
    { uColor: { value: new THREE.Color(0x000000) }, uStrength: { value: 0.8 } },
    "uniform vec3 uColor; uniform float uStrength; varying vec2 vUv;" +
    "void main(){ vec2 p = vUv - 0.5; float d = length(p * vec2(1.0, 1.25));" +
    "gl_FragColor = vec4(uColor, smoothstep(0.32, 0.85, d) * uStrength); }"
  );
  scene.add(vignette);

  /* Transient pulses (correct answer shockwave). */
  const pulses = [];
  function pulse(color) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.94, 1, 128),
      new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    mesh.position.set(0, 0.5, -6);
    if (!REDUCED) {
      scene.add(mesh);
      pulses.push({ mesh, t: 0 });
    }
    flash.set(color);
    flashAmt = 1;
  }
  const flash = new THREE.Color();
  let flashAmt = 0;

  /* ---- State from <body> ---- */
  const state = { color: new THREE.Color(PALETTE.amber), speed: 0.5, danger: 0, motif: null };
  function readState() {
    const c = body.classList;
    const ch = body.dataset.chamber;
    state.motif = CHAMBER[ch] !== undefined ? ch : null;
    if (c.contains("vault-exploded")) {
      state.color.set(PALETTE.fire); state.speed = 0.4; state.danger = 0.6;
    } else if (c.contains("timer-danger") || c.contains("vault-critical")) {
      state.color.set(PALETTE.danger); state.speed = 4.5; state.danger = 1;
    } else if (c.contains("timer-warning")) {
      state.color.set(PALETTE.warning); state.speed = 3; state.danger = 0.45;
    } else if (state.motif) {
      state.color.set(CHAMBER[state.motif]); state.speed = c.contains("vault-active") ? 1.8 : 1; state.danger = 0;
    } else {
      state.color.set(PALETTE.amber); state.speed = c.contains("vault-locked") ? 0.5 : 0.9; state.danger = 0;
    }
  }
  const hasClass = (old, name) => (" " + (old || "") + " ").indexOf(" " + name + " ") !== -1;
  new MutationObserver((records) => {
    records.forEach((r) => {
      if (r.attributeName !== "class") return;
      if (!hasClass(r.oldValue, "vault-correct-bloom") && body.classList.contains("vault-correct-bloom")) pulse(PALETTE.success);
      if (!hasClass(r.oldValue, "vault-exploded") && body.classList.contains("vault-exploded")) {
        flash.set(PALETTE.fire);
        flashAmt = 1.6;
        if (!REDUCED) shake = Math.max(shake, 0.9);
      }
    });
    readState();
  }).observe(body, { attributes: true, attributeFilter: ["class", "data-chamber"], attributeOldValue: true });
  readState();

  /* Pointer parallax. */
  const look = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    look.x = (e.clientX / window.innerWidth - 0.5) * 2;
    look.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const motion = REDUCED ? 0 : 1;
  const tmp = new THREE.Color();
  let speed = state.speed;
  let danger = 0;
  let t = 0;
  let scroll = 0;
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt * motion;
    const k = 1 - Math.exp(-dt * 3);

    mood.lerp(state.color, k);
    speed += (state.speed - speed) * k;
    danger += (state.danger - danger) * k;
    flashAmt = Math.max(0, flashAmt - dt * 1.6);

    const throb = danger * (0.5 + 0.5 * Math.sin(t * (4 + danger * 4)));
    tmp.copy(mood).lerp(flash, Math.min(1, flashAmt));
    moodMat.color.copy(tmp);
    floor.material.color.copy(tmp);
    ceiling.material.color.copy(tmp);
    pMat.color.copy(tmp);
    moodLight.color.copy(tmp);
    moodLight.intensity = 80 + throb * 160 + flashAmt * 220;
    floor.material.opacity = 0.22 + throb * 0.15;
    scene.fog.color.setHex(PALETTE.bg).lerp(mood, 0.025 + throb * 0.06);
    scene.background.copy(scene.fog.color);

    // Corridor flow.
    scroll += dt * motion * speed * 2.2;
    floor.position.z = scroll % floor.userData.step;
    ceiling.position.z = floor.position.z;
    for (let i = 0; i < P; i += 1) {
      const j = i * 3 + 2;
      pPos[j] += dt * motion * speed * 3;
      if (pPos[j] > 12) pPos[j] -= 57;
    }
    pGeo.attributes.position.needsUpdate = true;

    ring.rotation.z += dt * motion * (0.02 + speed * 0.025);
    wheel.rotation.z -= dt * motion * (0.05 + speed * 0.06);
    ring.position.y = 1.5 + Math.sin(t * 0.3) * 0.3;

    // Motif crossfade.
    Object.keys(motifs).forEach((id) => {
      const m = motifs[id];
      const g = m.group;
      const target = state.motif === id ? 1 : 0;
      g.userData.fade += (target - g.userData.fade) * (1 - Math.exp(-dt * 2.5));
      g.visible = g.userData.fade > 0.01;
      if (!g.visible) return;
      m.update(t, dt * motion);
      g.traverse((o) => {
        if (o.material && o.material.userData.base !== undefined) o.material.opacity = o.material.userData.base * g.userData.fade;
      });
    });

    // Pulses.
    for (let i = pulses.length - 1; i >= 0; i -= 1) {
      const p = pulses[i];
      p.t += dt;
      const s = 0.5 + easeOut(clamp01(p.t / 1.1)) * 28;
      p.mesh.scale.set(s, s, s);
      p.mesh.material.opacity = 1 - clamp01(p.t / 1.1);
      if (p.t > 1.1) {
        scene.remove(p.mesh);
        disposeTree(p.mesh);
        pulses.splice(i, 1);
      }
    }

    const vu = vignette.material.uniforms;
    vu.uColor.value.setRGB(0, 0, 0).lerp(tmp.copy(mood).multiplyScalar(0.6), danger * (0.5 + throb * 0.5));
    vu.uStrength.value = 0.8 + throb * 0.15;

    // Camera: parallax + shake.
    shake *= Math.exp(-dt * 5);
    camera.position.x += (look.x * 1.2 * motion - camera.position.x) * k;
    camera.position.y += (0.6 - look.y * 0.6 * motion - camera.position.y) * k;
    camera.lookAt(0, 0.5, -10);
    if (shake > 0.001) {
      camera.position.x += rand(-1, 1) * shake * 0.3;
      camera.position.y += rand(-1, 1) * shake * 0.3;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    resize() {
      camera.aspect = Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
  };
}

/* ==================================================================== FX */

function createFx() {
  const renderer = makeRenderer("vault3d-fx", true, 1.5);
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  body.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  scene.environmentIntensity = 0.8;
  scene.add(new THREE.HemisphereLight(0xc8d0e0, 0x101016, 0.5));
  const key = new THREE.DirectionalLight(0xffe6c0, 2);
  key.position.set(-4, 6, 8);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(45, Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight), 0.1, 100);
  function resetCamera() {
    camera.position.set(0, 0, 10);
    camera.fov = 45;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  resetCamera();

  /** Visible width/height of the plane z = 0 from the resting camera. */
  function view() {
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(22.5)) * 10;
    return { w: h * camera.aspect, h };
  }

  /** World position on z = 0 under the centre of a DOM element. */
  function worldAt(el) {
    if (!el) return new THREE.Vector3();
    const r = el.getBoundingClientRect();
    const { w, h } = view();
    return new THREE.Vector3(
      ((r.left + r.width / 2) / window.innerWidth - 0.5) * w,
      -((r.top + r.height / 2) / window.innerHeight - 0.5) * h,
      0
    );
  }

  let effects = [];
  let running = false;
  let last = 0;
  const camBase = new THREE.Vector3();

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    effects = effects.filter((e) => {
      const alive = e.update(dt);
      if (!alive) e.dispose();
      return alive;
    });
    camBase.copy(camera.position);
    if (shake > 0.001) camera.position.add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), 0).multiplyScalar(shake * 0.25));
    renderer.render(scene, camera);
    camera.position.copy(camBase);
    if (effects.length) {
      requestAnimationFrame(loop);
    } else {
      running = false;
      renderer.clear();
      canvas.style.display = "none";
    }
  }

  /**
   * Register an effect: objects live under one root, step(t, dt) runs until dur.
   * t is wall-clock so timelines stay in sync with sfx even at low frame rates;
   * dt is capped for the physics.
   */
  function run(dur, step, onEnd) {
    const root = new THREE.Group();
    scene.add(root);
    const start = performance.now();
    let t = 0;
    let done = false;
    const e = {
      root,
      update(dt) {
        if (done) return false;
        t = (performance.now() - start) / 1000;
        step(Math.min(t, dur), dt);
        if (t >= dur) done = true;
        return !done;
      },
      dispose() {
        scene.remove(root);
        disposeTree(root);
        if (onEnd) onEnd();
      },
      stop() { done = true; }
    };
    effects.push(e);
    if (!running) {
      running = true;
      canvas.style.display = "block";
      last = performance.now();
      requestAnimationFrame(loop);
    }
    return e;
  }

  /* ---------------------------------------------------------- confetti */
  function confetti() {
    const { w, h } = view();
    const N = 340;
    const colors = [0xc9921a, 0xf0c45a, 0x3dd68c, 0x59c2ff, 0xf07178, 0xebe8e1];
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0.45, roughness: 0.35 }),
      N
    );
    mesh.frustumCulled = false;
    const g = h * 0.55;
    const base = h * 0.014;
    const parts = [];
    const col = new THREE.Color();
    for (let i = 0; i < N; i += 1) {
      const side = i % 2 ? 1 : -1;
      const ribbon = Math.random() < 0.4;
      parts.push({
        delay: rand(0, 0.35),
        p: new THREE.Vector3(side * w * 0.52, -h * 0.55, rand(-1, 1)),
        v: new THREE.Vector3(-side * rand(0.12, 0.62) * h, Math.sqrt(2 * g * h * rand(0.75, 1.15)), rand(-1, 2)),
        r: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)),
        spin: new THREE.Vector3(rand(-9, 9), rand(-9, 9), rand(-4, 4)),
        s: new THREE.Vector3(base * (ribbon ? 0.5 : rand(0.8, 1.2)), base * (ribbon ? rand(2, 3) : rand(0.6, 1)), 1),
        phase: rand(0, 6)
      });
      mesh.setColorAt(i, col.setHex(colors[i % colors.length]));
    }
    const e = run(4.6, (t, dt) => {
      const fade = 1 - seg(t, 3.6, 4.6);
      parts.forEach((pt, i) => {
        if (t < pt.delay) {
          mesh.setMatrixAt(i, m4.makeScale(0, 0, 0));
          return;
        }
        pt.v.x *= Math.exp(-1.1 * dt);
        pt.v.y = Math.max(pt.v.y - g * dt, -h * 0.22);
        pt.p.addScaledVector(pt.v, dt);
        pt.p.x += Math.sin(t * 5 + pt.phase) * h * 0.02 * dt;
        pt.r.x += pt.spin.x * dt;
        pt.r.y += pt.spin.y * dt;
        pt.r.z += pt.spin.z * dt;
        q.setFromEuler(pt.r);
        s3.copy(pt.s).multiplyScalar(fade);
        mesh.setMatrixAt(i, m4.compose(pt.p, q, s3));
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
    e.root.add(mesh);
  }

  /* ------------------------------------------------------------ shutter */
  let activeShutter = null;

  function shutterTex(flip) {
    const tex = canvasTex(1024, 512, (g, w, h) => {
      g.drawImage(brushedTex.image, 0, 0, w, h);
      const band = h * 0.16;
      const y0 = h - band;
      g.save();
      g.beginPath();
      g.rect(0, y0, w, band);
      g.clip();
      g.fillStyle = "#16181d";
      g.fillRect(0, y0, w, band);
      g.fillStyle = "#c9921a";
      for (let x = -band; x < w + band; x += 56) {
        g.beginPath();
        g.moveTo(x, h);
        g.lineTo(x + 28, h);
        g.lineTo(x + 28 + band, y0);
        g.lineTo(x + band, y0);
        g.fill();
      }
      g.restore();
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(0, y0 - 10, w, 6);
      for (let x = 40; x < w; x += 80) {
        g.fillStyle = "#5a606a";
        g.beginPath();
        g.arc(x, y0 - 34, 9, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgba(255,255,255,0.35)";
        g.beginPath();
        g.arc(x - 3, y0 - 37, 3, 0, Math.PI * 2);
        g.fill();
      }
    });
    tex.userData.own = true;
    if (flip) {
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, -1);
      tex.offset.set(0, 1);
    }
    return tex;
  }

  function shutter(onMid, onDone) {
    if (activeShutter) activeShutter.flush();
    const { w, h } = view();
    const doorH = h * 0.6;
    const depth = Math.min(w, h) * 0.08;
    const geo = new THREE.BoxGeometry(w * 1.2, doorH, depth);
    const top = new THREE.Mesh(geo, steel({ map: shutterTex(false) }));
    const bottom = new THREE.Mesh(geo.clone(), steel({ map: shutterTex(true) }));
    const openY = h / 2 + doorH / 2 + 0.2;
    const closedY = doorH / 2;

    const sealR = Math.min(w, h) * 0.13;
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(sealR, sealR, depth * 1.4, 64), steel({ color: 0x6d737e }));
    seal.rotation.x = Math.PI / 2;
    const sealFace = new THREE.Mesh(
      new THREE.CircleGeometry(sealR * 0.92, 64),
      new THREE.MeshBasicMaterial({ map: labelTex("SECURE", "#f0c45a", "#c9921a"), toneMapped: false })
    );
    sealFace.position.z = depth * 0.71;
    const sealPivot = new THREE.Group();
    sealPivot.position.z = depth * 0.2;
    sealPivot.add(seal, sealFace);

    let midFired = false;
    let sparks = null;
    const state = { mid: onMid, done: onDone };
    const fire = (k) => {
      const fn = state[k];
      state[k] = null;
      if (typeof fn === "function") fn();
    };

    const SLOW = 1.6; // timeline stretch: 1 = original 0.9s
    const e = run(0.9 * SLOW, (rt, dt) => {
      const t = rt / SLOW;
      const close = easeIn(seg(t, 0, 0.29));
      const open = easeInOut(seg(t, 0.55, 0.9));
      const y = closedY + (openY - closedY) * (1 - close + open);
      top.position.y = y;
      bottom.position.y = -y;

      if (!midFired && t >= 0.29) {
        midFired = true;
        fire("mid");
        shake = Math.max(shake, 0.45);
        sparks = makeSparks({
          count: 180,
          at: () => [rand(-w / 2, w / 2), 0, depth / 2],
          vel: () => [rand(-1, 1) * h * 0.25, rand(-1, 1) * h * 0.35, rand(0.5, 2) * h * 0.2],
          size: h * 0.018,
          life: 0.55,
          colors: [0xffe9a8, PALETTE.fire],
          gravity: h * 0.9,
          drag: 2
        });
        e.root.add(sparks.points);
      }
      if (sparks) sparks.step(dt);

      const pop = t < 0.55 ? easeOutBack(seg(t, 0.29, 0.42)) : 1 - seg(t, 0.55, 0.66);
      const sp = Math.max(0.0001, pop);
      sealPivot.scale.set(sp, sp, sp);
      sealPivot.rotation.z = -easeOut(seg(t, 0.29, 0.5)) * Math.PI * 0.5 + Math.PI * 0.5;
    }, () => {
      fire("mid");
      fire("done");
      if (activeShutter === handle) activeShutter = null;
    });
    e.root.add(top, bottom, sealPivot);
    top.position.y = openY;
    bottom.position.y = -openY;

    const handle = {
      flush() {
        e.stop();
        fire("mid");
        fire("done");
      }
    };
    activeShutter = handle;
  }

  /* ------------------------------------------------------------ explode */
  function explode(originEl) {
    const { h } = view();
    const o = worldAt(originEl);
    shake = Math.max(shake, 0.8);

    const flashMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffe2b0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
    const flash = new THREE.Sprite(flashMat);
    const coreMat = flashMat.clone();
    coreMat.color.set(PALETTE.fire);
    const core = new THREE.Sprite(coreMat);

    const rings = [0, 1.15].map((tilt) => {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.97, 1, 128),
        new THREE.MeshBasicMaterial({ color: PALETTE.warning, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })
      );
      m.rotation.x = -tilt;
      m.position.copy(o);
      return m;
    });

    const embers = makeSparks({
      count: 420,
      at: () => [o.x, o.y, o.z],
      vel: () => {
        const d = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(0.25, 1) * h * 1.5);
        return [d.x, d.y, d.z];
      },
      size: h * 0.028,
      life: 1.5,
      colors: [0xffefb8, PALETTE.danger],
      gravity: h * 0.22,
      drag: 2.4
    });

    const debris = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), steel({ color: 0x4a4f58 }), 36);
    debris.frustumCulled = false;
    const chunks = [];
    for (let i = 0; i < 36; i += 1) {
      chunks.push({
        p: o.clone(),
        v: new THREE.Vector3(rand(-1, 1), rand(-0.4, 1.2), rand(0, 1.2)).multiplyScalar(h * rand(0.4, 1.1)),
        r: new THREE.Euler(rand(0, 6), rand(0, 6), 0),
        spin: rand(-12, 12),
        s: h * rand(0.008, 0.022)
      });
    }

    const smoke = [];
    for (let i = 0; i < 9; i += 1) {
      const m = new THREE.SpriteMaterial({ map: smokeTex, color: 0x3a3e48, transparent: true, depthWrite: false, rotation: rand(0, 6) });
      const s = new THREE.Sprite(m);
      s.position.copy(o).add(new THREE.Vector3(rand(-0.3, 0.3), rand(-0.2, 0.3), -0.2).multiplyScalar(h * 0.2));
      s.userData.grow = rand(0.5, 0.9);
      smoke.push(s);
    }

    const light = new THREE.PointLight(PALETTE.fire, 0, h * 3, 1.2);
    light.position.copy(o).setZ(1.5);

    flash.position.copy(o);
    core.position.copy(o);

    const e = run(1.9, (t, dt) => {
      const f = h * (0.25 + 1.4 * easeOut(seg(t, 0, 0.16)));
      flash.scale.set(f, f, 1);
      flashMat.opacity = 1 - seg(t, 0.05, 0.7);
      const c = h * (0.1 + 0.55 * easeOut(seg(t, 0, 0.5)));
      core.scale.set(c, c, 1);
      coreMat.opacity = 1 - seg(t, 0.2, 1.1);

      rings.forEach((m, i) => {
        const k = seg(t, i * 0.05, 0.85 + i * 0.1);
        const s = 0.1 + easeOut(k) * h * (0.95 - i * 0.2);
        m.scale.set(s, s, s);
        m.material.opacity = 0.8 * (1 - k) * (1 - k);
      });

      embers.step(dt);

      chunks.forEach((ch, i) => {
        ch.v.y -= h * 1.1 * dt;
        ch.p.addScaledVector(ch.v, dt);
        ch.r.x += ch.spin * dt;
        ch.r.y += ch.spin * 0.7 * dt;
        q.setFromEuler(ch.r);
        const s = ch.s * (1 - seg(t, 1.3, 1.9));
        s3.set(s, s, s);
        debris.setMatrixAt(i, m4.compose(ch.p, q, s3));
      });
      debris.instanceMatrix.needsUpdate = true;

      smoke.forEach((s) => {
        const k = seg(t, 0.1, 1.9);
        const sz = h * (0.12 + s.userData.grow * 0.5 * easeOut(k));
        s.scale.set(sz, sz, 1);
        s.position.y += h * 0.06 * dt;
        s.material.opacity = 0.6 * Math.sin(Math.PI * k);
      });

      light.intensity = 400 * (1 - seg(t, 0, 0.8));
    });
    e.root.add(flash, core, ...rings, embers.points, debris, ...smoke, light);
  }

  /* ------------------------------------------------------------- breach */
  /*
   * Timeline (seconds) matches the sfx cues in gate.js:
   *   0.2 / 0.55 dial ticks · 1.1 AUTH + first bolt pair · 1.65 / 1.9 / 2.1 bolt pairs
   *   2.35 door swings open · 2.85 fanfare · 3.4 hand-off to the UI.
   */
  function breach() {
    return new Promise((resolve) => {
      const { w, h } = view();
      const R = Math.min(w * 0.3, h * 0.27);
      const cy = -h * 0.08; // camera sits low so the door clears the terminal readout
      const T = R * 0.22; // door thickness
      const bg = new THREE.Color(0x07080b);
      scene.background = bg;
      canvas.style.transition = "opacity 0.25s ease";
      canvas.style.opacity = "0";
      requestAnimationFrame(() => requestAnimationFrame(() => { canvas.style.opacity = "1"; }));

      // Wall with a round doorway, amber blueprint grid.
      const gridTex = canvasTex(256, 256, (g, gw, gh) => {
        g.fillStyle = "#15181e";
        g.fillRect(0, 0, gw, gh);
        g.strokeStyle = "rgba(201,146,26,0.22)";
        g.lineWidth = 2;
        g.strokeRect(0, 0, gw, gh);
        g.strokeStyle = "rgba(201,146,26,0.08)";
        g.beginPath();
        g.moveTo(gw / 2, 0); g.lineTo(gw / 2, gh);
        g.moveTo(0, gh / 2); g.lineTo(gw, gh / 2);
        g.stroke();
      });
      gridTex.userData.own = true;
      gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
      gridTex.repeat.set(10, 10);
      const wallShape = new THREE.Shape();
      wallShape.moveTo(-w * 2, -h * 2);
      wallShape.lineTo(w * 2, -h * 2);
      wallShape.lineTo(w * 2, h * 2);
      wallShape.lineTo(-w * 2, h * 2);
      const hole = new THREE.Path();
      hole.absarc(0, 0, R * 1.02, 0, Math.PI * 2, true);
      wallShape.holes.push(hole);
      const wallGeo = new THREE.ShapeGeometry(wallShape, 64);
      // ShapeGeometry UVs are world-space; normalise to 0..1 so repeat works.
      const uv = wallGeo.attributes.uv;
      for (let i = 0; i < uv.count; i += 1) uv.setXY(i, (uv.getX(i) + w * 2) / (w * 4), (uv.getY(i) + h * 2) / (h * 4));
      const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({
        map: gridTex, emissiveMap: gridTex, emissive: 0xffffff, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.8
      }));
      wall.position.z = -T * 0.7;

      // Tunnel of light behind the door.
      const tunnel = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 1.02, R * 1.02, R * 6, 64, 1, true),
        steel({ side: THREE.BackSide, color: 0x6a5a40 })
      );
      tunnel.rotation.x = Math.PI / 2;
      tunnel.position.z = -T * 0.7 - R * 3;
      const endGlow = new THREE.Mesh(
        new THREE.CircleGeometry(R * 1.02, 64),
        new THREE.MeshBasicMaterial({ color: 0xfff1cc, toneMapped: false })
      );
      endGlow.position.z = -T * 0.7 - R * 5.9;
      const tunnelLight = new THREE.PointLight(0xffd9a0, 0, R * 10, 1);
      tunnelLight.position.z = -R * 2;
      const haloMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffd28a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(R * 5, R * 5, 1);
      halo.position.z = -R * 1.5;

      // Frame, rivets and bolt indicator lamps.
      const frame = new THREE.Mesh(new THREE.TorusGeometry(R * 1.05, R * 0.075, 24, 128), steel({ color: 0x9aa0aa }));
      frame.position.z = T * 0.05;
      const rivets = new THREE.InstancedMesh(new THREE.SphereGeometry(R * 0.022, 12, 8), steel({ color: 0x6d737e }), 24);
      for (let i = 0; i < 24; i += 1) {
        const a = (i / 24) * Math.PI * 2;
        v3.set(Math.cos(a) * R * 1.2, Math.sin(a) * R * 1.2, -T * 0.6);
        rivets.setMatrixAt(i, m4.compose(v3, q.identity(), s3.set(1, 1, 1)));
      }
      const lamps = [];
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(R * 0.03, 16, 12),
          new THREE.MeshBasicMaterial({ color: PALETTE.danger, toneMapped: false })
        );
        lamp.position.set(Math.cos(a) * R * 1.28, Math.sin(a) * R * 1.28, -T * 0.55);
        lamps.push(lamp);
      }

      // Door on a hinge at its left edge.
      const hinge = new THREE.Group();
      hinge.position.x = -R;
      const door = new THREE.Group();
      door.position.x = R;
      hinge.add(door);
      const slab = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 128), steel({ color: 0x8f959f }));
      slab.rotation.x = Math.PI / 2;
      door.add(slab);
      const front = T / 2;
      const trim = new THREE.Mesh(
        new THREE.TorusGeometry(R * 0.86, R * 0.02, 12, 128),
        new THREE.MeshStandardMaterial({ color: PALETTE.amber, emissive: PALETTE.amber, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.3 })
      );
      trim.position.z = front;
      door.add(trim);
      const tickMat = new THREE.MeshBasicMaterial({ color: 0xe8e0cc, toneMapped: false });
      const doorTicks = new THREE.InstancedMesh(new THREE.BoxGeometry(R * 0.012, 1, R * 0.01), tickMat, 60);
      for (let i = 0; i < 60; i += 1) {
        const a = (i / 60) * Math.PI * 2;
        const len = R * (i % 5 === 0 ? 0.11 : 0.06);
        q.setFromAxisAngle(zAxis, a);
        v3.set(-Math.sin(a) * R * 0.75, Math.cos(a) * R * 0.75, front);
        doorTicks.setMatrixAt(i, m4.compose(v3, q, s3.set(1, len, 1)));
      }
      door.add(doorTicks);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.6, R * 0.63, R * 0.05, 96), steel({ color: 0x5c626c }));
      plate.rotation.x = Math.PI / 2;
      plate.position.z = front + R * 0.025;
      door.add(plate);

      const wheelGroup = new THREE.Group();
      wheelGroup.position.z = front + R * 0.09;
      door.add(wheelGroup);
      wheelGroup.add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.42, R * 0.035, 16, 96), steel({ color: 0xc4cad4 })));
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.022, R * 0.022, R * 0.55, 12), steel({ color: 0xb0b6c0 }));
        spoke.position.set(Math.cos(a) * R * 0.275, Math.sin(a) * R * 0.275, 0);
        spoke.rotation.z = a - Math.PI / 2;
        wheelGroup.add(spoke);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(R * 0.05, 20, 14), steel({ color: 0xd0d6de }));
        knob.position.set(Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56, 0);
        wheelGroup.add(knob);
      }
      const boss = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.17, R * 0.17, R * 0.09, 48), steel({ color: 0x7a808a }));
      boss.rotation.x = Math.PI / 2;
      wheelGroup.add(boss);

      const hubMat = new THREE.MeshBasicMaterial({ map: labelTex("LOCKED", "#e05a62"), toneMapped: false });
      const hubFace = new THREE.Mesh(new THREE.CircleGeometry(R * 0.15, 48), hubMat);
      hubFace.position.z = front + R * 0.14;
      door.add(hubFace);
      function setHub(text, color) {
        hubMat.map.dispose();
        hubMat.map = labelTex(text, color);
        hubMat.needsUpdate = true;
      }

      const bolts = [];
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const pivot = new THREE.Group();
        pivot.rotation.z = a;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(R * 0.42, R * 0.07, R * 0.05), steel({ color: 0xb8bec8 }));
        bar.position.set(R * 0.9, 0, front + R * 0.06);
        pivot.add(bar);
        door.add(pivot);
        bolts.push(bar);
      }
      const boltTimes = [1.1, 1.65, 1.9, 2.1];

      const flashQuad = screenQuad(
        { uColor: { value: new THREE.Color(0xf5edd8) }, uAlpha: { value: 0 } },
        "uniform vec3 uColor; uniform float uAlpha; void main(){ gl_FragColor = vec4(uColor, uAlpha); }"
      );

      let hubState = 0;
      let sparked = false;
      let sparks = null;
      let handed = false;
      const dialKeys = [[0.15, 0], [0.7, 4.6], [1.15, 2.2], [1.5, 3.3]]; // radians

      const e = run(4.0, (t, dt) => {
        // Intro push-in.
        const intro = easeOut(seg(t, 0, 0.45));
        if (t < 2.9) {
          camera.position.set(0, cy, 13 - 3 * intro);
          camera.lookAt(0, cy, 0);
        }

        // Combination wheel.
        let ang = 0;
        for (let i = 1; i < dialKeys.length; i += 1) {
          const a = dialKeys[i - 1];
          const b = dialKeys[i];
          if (t >= a[0]) ang = a[1] + (b[1] - a[1]) * easeInOut(seg(t, a[0], b[0]));
        }
        wheelGroup.rotation.z = -ang;

        if (hubState === 0 && t >= 1.1) { hubState = 1; setHub("AUTH…", "#f0c45a"); }
        if (hubState === 1 && t >= 2.35) { hubState = 2; setHub("OPEN", "#3dd68c"); }

        // Bolts retract in opposite pairs.
        bolts.forEach((bar, i) => {
          const start = boltTimes[i % 4];
          const k = easeInOut(seg(t, start, start + 0.16));
          bar.position.x = R * (0.9 - 0.32 * k);
          if (k >= 1) lamps[i].material.color.setHex(PALETTE.success);
        });

        // Strain shake before the door gives.
        door.position.y = (t > 1.55 && t < 2.05) ? Math.sin(t * 95) * R * 0.008 : 0;

        if (!sparked && t >= 2.25) {
          sparked = true;
          shake = Math.max(shake, 0.35);
          sparks = makeSparks({
            count: 260,
            at: () => {
              const a = rand(0, Math.PI * 2);
              return [Math.cos(a) * R, Math.sin(a) * R, front];
            },
            vel: () => [rand(-1, 1) * R * 1.6, rand(-0.5, 1.5) * R * 1.4, rand(0.5, 2) * R],
            size: R * 0.05,
            life: 0.9,
            colors: [0xffefb8, PALETTE.amber],
            gravity: R * 4,
            drag: 1.5
          });
          e.root.add(sparks.points);
        }
        if (sparks) sparks.step(dt);

        // Door swings toward the viewer, light pours out.
        const open = easeInOut(seg(t, 2.35, 3.25));
        hinge.rotation.y = -1.8 * open;
        const glow = easeOut(seg(t, 2.35, 2.9));
        tunnelLight.intensity = 900 * glow;
        haloMat.opacity = 0.9 * glow;

        // Dolly through the doorway and white out.
        if (t >= 2.9) {
          const d = easeIn(seg(t, 2.9, 3.4));
          camera.position.set(0, cy * (1 - d), 10 - 9.5 * d);
          camera.fov = 45 + 25 * d;
          camera.updateProjectionMatrix();
          camera.lookAt(0, cy * (1 - d), -R * 4);
        }
        let alpha = easeIn(seg(t, 3.0, 3.35));
        if (t >= 3.4) {
          if (!handed) {
            handed = true;
            // Hand-off: drop the scene, keep only the flash and fade it out over the UI.
            e.root.children.slice().forEach((c) => { if (c !== flashQuad) c.visible = false; });
            scene.background = null;
            resetCamera();
            resolve();
          }
          alpha = 1 - easeOut(seg(t, 3.4, 4.0));
        }
        flashQuad.material.uniforms.uAlpha.value = alpha;
      }, () => {
        scene.background = null;
        canvas.style.transition = "";
        canvas.style.opacity = "";
        resetCamera();
        if (!handed) resolve();
      });
      e.root.add(wall, tunnel, endGlow, tunnelLight, halo, frame, rivets, ...lamps, hinge, flashQuad);
    });
  }

  return {
    resize() {
      camera.aspect = Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    },
    api: {
      breach: () => (REDUCED ? Promise.resolve() : breach()),
      shutter(onMid, onDone) {
        if (REDUCED) {
          if (typeof onMid === "function") onMid();
          if (typeof onDone === "function") onDone();
          return;
        }
        shutter(onMid, onDone);
      },
      confetti() { if (!REDUCED) confetti(); },
      explode(originEl) { if (!REDUCED) explode(originEl); }
    }
  };
}

// Shared scratch objects for matrix composition.
const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const v3 = new THREE.Vector3();
const s3 = new THREE.Vector3();
const zAxis = new THREE.Vector3(0, 0, 1);

/* ================================================================== BOMB */

/*
 * The per-question defusal module (replaces the SVG drawn by bomb.js, which
 * stays as the fallback). Keep Talking style: steel case, 7-segment timer and
 * four wires coloured by manual — the active manual's wire glows, gets cut on a
 * correct answer, and the whole module blows apart on timeout.
 */
const WIRES = [
  { id: "python", color: 0x3dd68c },
  { id: "powerbi", color: 0x59c2ff },
  { id: "alm", color: 0xf0a030 },
  { id: "sop", color: 0xf07178 }
];

const SEGMENTS = {
  0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc",
  5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg"
};

function drawSeg7(g, x, y, w, h, ch, on, ghost) {
  const t = w * 0.17;
  const hh = h / 2;
  const v = hh - t * 1.1;
  const rects = {
    a: [x + t, y, w - 2 * t, t],
    g: [x + t, y + hh - t / 2, w - 2 * t, t],
    d: [x + t, y + h - t, w - 2 * t, t],
    f: [x, y + t * 0.6, t, v],
    b: [x + w - t, y + t * 0.6, t, v],
    e: [x, y + hh + t * 0.5, t, v],
    c: [x + w - t, y + hh + t * 0.5, t, v]
  };
  const lit = SEGMENTS[ch] || "";
  Object.keys(rects).forEach((k) => {
    const r = rects[k];
    const isOn = lit.indexOf(k) !== -1;
    g.fillStyle = isOn ? on : ghost;
    g.shadowBlur = isOn ? 18 : 0;
    g.fillRect(r[0] + 2, r[1] + 2, r[2] - 4, r[3] - 4);
  });
}

function createBomb(svgEl) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.className = "bomb-svg bomb-3d";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Question timer bomb");
  svgEl.style.display = "none";
  svgEl.parentNode.insertBefore(canvas, svgEl);

  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  scene.environmentIntensity = 0.7;
  scene.add(new THREE.HemisphereLight(0xc8d0e0, 0x101016, 0.5));
  const key = new THREE.DirectionalLight(0xffe6c0, 2.2);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const alarm = new THREE.PointLight(PALETTE.danger, 0, 8, 1.5);
  alarm.position.set(0, 1, 2.5);
  scene.add(alarm);

  const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 50);
  const LOOK_Y = 0.45;

  const rig = new THREE.Group();
  scene.add(rig);
  const FRONT = 0.5;

  // Case + side canisters + detonator.
  rig.add(new THREE.Mesh(new RoundedBoxGeometry(4, 2.6, 1, 4, 0.14), steel({ color: 0x5c626c })));
  [-1, 1].forEach((side) => {
    const can = new THREE.Group();
    can.position.set(side * 2.28, -0.1, -0.05);
    can.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.1, 32), new THREE.MeshStandardMaterial({ color: 0x8a2a2e, roughness: 0.55, metalness: 0.1 })));
    [-0.6, 0.6].forEach((y) => {
      const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.16, 32), steel({ color: 0x3a3e46 }));
      strap.position.y = y;
      can.add(strap);
    });
    rig.add(can);
  });
  const det = new THREE.Group();
  det.position.set(0.9, 1.3, 0);
  det.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 24), steel({ color: 0x3a3e46 })));
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 8), steel({ color: 0xc4cad4 }));
  antenna.position.y = 0.5;
  det.add(antenna);
  const tipMat = new THREE.MeshBasicMaterial({ color: PALETTE.danger, toneMapped: false });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), tipMat);
  tip.position.y = 0.9;
  det.add(tip);
  rig.add(det);

  // Front panel art: brushed plate, hazard corners, stencil labels.
  const panelTex = canvasTex(1024, 640, (g, w, h) => {
    g.drawImage(brushedTex.image, 0, 0, w, h);
    g.fillStyle = "rgba(20,24,30,0.72)";
    g.fillRect(0, 0, w, h);
    [[0, 0], [w, 0], [0, h], [w, h]].forEach((c) => {
      g.save();
      g.translate(c[0], c[1]);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(c[0] ? -110 : 110, 0);
      g.lineTo(0, c[1] ? -110 : 110);
      g.closePath();
      g.clip();
      for (let i = -200; i < 200; i += 28) {
        g.fillStyle = Math.round(i / 28) % 2 ? "#c9921a" : "#16181d";
        g.fillRect(i, -200, 14, 400);
      }
      g.restore();
    });
    g.fillStyle = "rgba(235,232,225,0.55)";
    g.font = '600 26px "JetBrains Mono", monospace';
    g.fillText("STATUS", w - 200, 92);
    g.fillText("DG-VLT · GOVERNANCE MODULE", 130, h - 40);
  });
  panelTex.userData.own = true;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.3), new THREE.MeshStandardMaterial({ map: panelTex, metalness: 0.55, roughness: 0.5 }));
  panel.position.z = FRONT + 0.005;
  rig.add(panel);

  // Timer display.
  const dispCanvas = document.createElement("canvas");
  dispCanvas.width = 512;
  dispCanvas.height = 200;
  const dispTex = new THREE.CanvasTexture(dispCanvas);
  dispTex.colorSpace = THREE.SRGBColorSpace;
  const dispMat = new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false });
  const display = new THREE.Group();
  display.position.set(-0.15, 0.48, FRONT);
  display.add(new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.92, 0.16, 3, 0.05), steel({ color: 0x2a2e36 })));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.78), dispMat);
  screen.position.z = 0.081;
  display.add(screen);
  rig.add(display);

  let shown = "";
  function drawDisplay(kind, value) {
    const id = kind + ":" + value;
    if (id === shown) return;
    shown = id;
    const g = dispCanvas.getContext("2d");
    const w = dispCanvas.width;
    const h = dispCanvas.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.shadowBlur = 0;
    g.fillStyle = "#07090c";
    g.fillRect(0, 0, w, h);
    if (kind === "time") {
      const s = Math.max(0, value);
      const digits = String(Math.floor(s / 60)).padStart(2, "0") + String(s % 60).padStart(2, "0");
      const on = "#ff4d5a";
      g.shadowColor = on;
      g.setTransform(1, 0, -0.08, 1, 14, 0); // classic italic LED slant
      [30, 132, 282, 384].forEach((x, i) => drawSeg7(g, x, 25, 88, 150, digits[i], on, "rgba(255,77,90,0.07)"));
      g.fillStyle = on;
      g.shadowBlur = 18;
      g.fillRect(244, 68, 16, 16);
      g.fillRect(244, 118, 16, 16);
    } else {
      const color = kind === "safe" ? "#3dd68c" : "#ffb454";
      g.fillStyle = color;
      g.shadowColor = color;
      g.shadowBlur = 24;
      g.font = '700 120px "JetBrains Mono", monospace';
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(value, w / 2, h / 2 + 6);
    }
    dispTex.needsUpdate = true;
  }

  // Status LED.
  const ledMat = new THREE.MeshBasicMaterial({ color: PALETTE.danger, toneMapped: false });
  const led = new THREE.Group();
  led.position.set(1.48, 0.62, FRONT);
  led.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 12, 32), steel({ color: 0x9aa0aa })));
  led.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), ledMat));
  const ledGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: PALETTE.danger, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
  ledGlow.scale.set(0.6, 0.6, 1);
  ledGlow.position.z = 0.1;
  led.add(ledGlow);
  rig.add(led);

  // Terminal blocks + the four manual wires (two halves each, hinged at the terminals).
  const TX = 1.55;
  const terminals = new THREE.Group();
  [-1, 1].forEach((side) => {
    const block = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.95, 0.16, 2, 0.03), steel({ color: 0x2a2e36 }));
    block.position.set(side * TX, -0.6, FRONT + 0.05);
    terminals.add(block);
  });
  rig.add(terminals);
  const wires = WIRES.map((spec, i) => {
    const y = -0.27 - i * 0.22;
    const mat = new THREE.MeshStandardMaterial({ color: spec.color, emissive: spec.color, emissiveIntensity: 0.12, roughness: 0.6, metalness: 0, envMapIntensity: 0.25 });
    const halves = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * TX, y, FRONT + 0.15);
      const sag = 0.1 + i * 0.03;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-side * TX * 0.45, -sag * 0.8, 0.12),
        new THREE.Vector3(-side * (TX - 0.04), -sag, 0.16)
      ]);
      pivot.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.045, 10), mat));
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16), steel({ color: 0xd8b060 }));
      screw.rotation.x = Math.PI / 2;
      pivot.add(screw);
      rig.add(pivot);
      return pivot;
    });
    return { id: spec.id, mat, halves, cut: 0, mid: new THREE.Vector3(0, y - 0.12, FRONT + 0.32) };
  });

  // Every rig child can be blown apart and restored.
  const parts = rig.children.map((o) => ({
    o,
    pos: o.position.clone(),
    rot: o.rotation.clone(),
    v: new THREE.Vector3(),
    spin: new THREE.Vector3()
  }));

  const sparks = [];
  const state = { seconds: 0, critical: false, mode: "armed", jolt: 0, boom: 0 };
  const look = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    look.x = (e.clientX / window.innerWidth - 0.5) * 2;
    look.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const size = new THREE.Vector2();
  function fit() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return false;
    renderer.getSize(size);
    if (size.x !== w || size.y !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const tan = Math.tan(THREE.MathUtils.degToRad(15));
      camera.userData.dist = Math.max(1.8 / tan, 2.8 / (tan * camera.aspect));
      camera.updateProjectionMatrix();
    }
    return true;
  }

  function reset() {
    parts.forEach((p) => {
      p.o.position.copy(p.pos);
      p.o.rotation.copy(p.rot);
      p.o.visible = true;
    });
    wires.forEach((wr) => { wr.cut = 0; });
    state.mode = "armed";
    state.critical = false;
    state.boom = 0;
    ledMat.color.setHex(PALETTE.danger);
    ledGlow.material.color.setHex(PALETTE.danger);
    drawDisplay("time", state.seconds);
  }

  const motion = REDUCED ? 0 : 1;
  let t = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!canvas.offsetParent || !fit()) return; // bomb hidden or collapsed
    t += dt;

    const armed = state.mode === "armed";
    const crit = armed && state.critical;
    const active = body.dataset.chamber;

    // Idle sway + pointer tilt, shake when critical or jolted by a penalty.
    const shakeAmt = (crit ? 0.025 : 0) + state.jolt * 0.06;
    rig.rotation.y = motion * (Math.sin(t * 0.6) * 0.12 + look.x * 0.18);
    rig.rotation.x = motion * (0.08 + look.y * 0.08);
    rig.position.x = motion * rand(-1, 1) * shakeAmt;
    rig.position.y = motion * rand(-1, 1) * shakeAmt;
    state.jolt = Math.max(0, state.jolt - dt * 2.5);

    // Blinkers: LED + antenna tip speed up when critical.
    const rate = crit ? 7 : 1.6;
    const blink = armed ? (Math.sin(t * rate * Math.PI * 2) > 0 ? 1 : 0.15) : 1;
    ledGlow.material.opacity = blink;
    tipMat.color.setHex(armed ? PALETTE.danger : 0x222222).multiplyScalar(armed ? 0.3 + blink * 0.7 : 1);
    alarm.intensity = crit ? 6 + Math.sin(t * 14) * 5 : 0;
    dispMat.color.setScalar(crit && Math.sin(t * 16) < -0.6 ? 0.35 : 1 + state.jolt * 1.5);

    // Wires: active manual glows; cut halves droop apart.
    wires.forEach((wr) => {
      wr.mat.emissiveIntensity = wr.id === active && armed ? 0.35 + Math.sin(t * 4) * 0.25 : 0.12;
      if (wr.cut > 0 && wr.cut < 1) wr.cut = Math.min(1, wr.cut + dt * 3.5);
      const k = easeOutBack(wr.cut);
      wr.halves[0].rotation.z = -0.55 * k;
      wr.halves[1].rotation.z = 0.55 * k;
    });

    // Explosion: every part flies off.
    if (state.mode === "boom") {
      state.boom += dt;
      parts.forEach((p) => {
        p.v.y -= 9 * dt;
        p.o.position.addScaledVector(p.v, dt * motion);
        p.o.rotation.x += p.spin.x * dt * motion;
        p.o.rotation.y += p.spin.y * dt * motion;
        p.o.rotation.z += p.spin.z * dt * motion;
      });
      if (state.boom > 1.6 || !motion) parts.forEach((p) => { p.o.visible = false; });
    }

    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i];
      s.age += dt;
      s.fx.step(dt);
      if (s.age > 0.7) {
        rig.remove(s.fx.points);
        disposeTree(s.fx.points);
        sparks.splice(i, 1);
      }
    }

    camera.position.set(0, LOOK_Y + 0.6, camera.userData.dist || 8);
    camera.lookAt(0, LOOK_Y, 0);
    renderer.render(scene, camera);
  }
  reset();
  requestAnimationFrame(frame);

  return {
    reset,
    setSeconds(seconds) {
      const s = Math.max(0, Math.ceil(seconds));
      if (state.mode === "armed" && s < state.seconds - 1) state.jolt = 1; // wrong-answer penalty
      state.seconds = s;
      if (state.mode === "armed") drawDisplay("time", s);
    },
    setCritical(on) { state.critical = !!on; },
    defuse() {
      state.mode = "safe";
      ledMat.color.setHex(PALETTE.success);
      ledGlow.material.color.setHex(PALETTE.success);
      drawDisplay("safe", "SAFE");
      const wr = wires.find((w) => w.id === body.dataset.chamber) || wires[0];
      wr.cut = REDUCED ? 1 : 0.001;
      if (!REDUCED) {
        const fx = makeSparks({
          count: 70,
          at: () => [wr.mid.x, wr.mid.y, wr.mid.z],
          vel: () => [rand(-2, 2), rand(0, 3), rand(0, 2)],
          size: 0.12,
          life: 0.7,
          colors: [0xffefb8, PALETTE.amber],
          gravity: 8,
          drag: 1.5
        });
        rig.add(fx.points);
        sparks.push({ fx, age: 0 });
      }
    },
    explode() {
      state.mode = "boom";
      state.boom = 0;
      drawDisplay("boom", "BOOM");
      ledMat.color.setHex(PALETTE.fire);
      parts.forEach((p) => {
        const dir = p.pos.clone().add(new THREE.Vector3(rand(-0.5, 0.5), rand(0, 0.8), 1.2)).normalize();
        p.v.copy(dir).multiplyScalar(rand(4, 9));
        p.spin.set(rand(-8, 8), rand(-8, 8), rand(-8, 8));
      });
    }
  };
}

/* ================================================================== boot */

try {
  const bgLayer = createBackground();
  const fxLayer = createFx();
  window.addEventListener("resize", () => {
    if (!window.innerWidth || !window.innerHeight) return; // minimised / hidden pane
    bgLayer.resize();
    fxLayer.resize();
  });
  window.Vault3D = Object.assign(fxLayer.api, { mountBomb: createBomb });
} catch (err) {
  console.warn("Vault3D disabled:", err);
}
