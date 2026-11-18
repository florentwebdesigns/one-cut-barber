/**
 * One Cut — "The craft" 3D section.
 *
 * A procedurally modelled professional hair clipper in the One Cut black and gold, rendered live with
 * physically based materials and studio reflections. Scroll drives the story (see KEYS); the pointer tilts
 * the model and a horizontal drag spins it. Nothing here is a video or an image sequence.
 *
 *   · body: rounded-square (superellipse) section, tapered with an ergonomic waist, diamond-knurled grips
 *   · gold blade housing, steel stationary blade and gold cutter with real teeth, taper lever, power button
 *     with an LED ring, polished gold bands, and the One Cut wordmark inlaid on the body
 *   · when powered on: the cutter vibrates, the LED glows and fine hair clippings fall from the blade
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DynamicDrawUsage,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Quaternion,
  RepeatWrapping,
  Scene,
  Shape,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import logoPath from '../assets/logo-path.txt?raw';

export type CraftRender = (progress: number, dt: number, time: number) => void;

/* ───────────────────────── Body shape ───────────────────────── */

const SE_N = 3.2; // superellipse exponent: 2 = ellipse, higher = squarer
const YB = -1.15; // bottom of the body
const YT = 0.8; // top of the body (blade housing sits on it)
const CAP_B = 0.1;
const CAP_T = 0.035;

function radii(y: number): [number, number] {
  const t = MathUtils.clamp((y - YB) / (YT - YB), 0, 1);
  const a = 0.255 + 0.06 * t - 0.018 * Math.sin(Math.PI * t);
  const b = 0.215 + 0.045 * t - 0.012 * Math.sin(Math.PI * t);
  return [a, b];
}

function se(theta: number, a: number, b: number): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [a * Math.sign(c) * Math.pow(Math.abs(c), 2 / SE_N), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / SE_N)];
}

/** z of the body's front surface at (x, y) */
function frontZ(x: number, y: number) {
  const [a, b] = radii(y);
  const k = Math.min(Math.abs(x / a), 0.999);
  return b * Math.pow(1 - Math.pow(k, SE_N), 1 / SE_N);
}

type Ring = { y: number; inset: number };

/** Builds a smooth, closed or open tube through rings of the body profile. */
function profileGeometry(rings: Ring[], M: number, inflate = 0, capBottom = false, capTop = false) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const R = rings.length;
  for (let i = 0; i < R; i++) {
    const { y, inset } = rings[i];
    const [a0, b0] = radii(y);
    const a = a0 - inset + inflate;
    const b = b0 - inset + inflate;
    const v = (y - YB) / (YT - YB);
    for (let j = 0; j <= M; j++) {
      const th = -Math.PI / 2 + (j / M) * Math.PI * 2;
      const [x, z] = se(th, a, b);
      pos.push(x, y, z);
      uv.push(j / M, v);
    }
  }
  const row = M + 1;
  for (let i = 0; i < R - 1; i++) {
    for (let j = 0; j < M; j++) {
      const A = i * row + j;
      const B = A + 1;
      const C = A + row;
      const D = C + 1;
      idx.push(A, C, B, B, C, D);
    }
  }
  if (capBottom) {
    const c = pos.length / 3;
    pos.push(0, rings[0].y - 0.0005, 0);
    uv.push(0.5, 0);
    for (let j = 0; j < M; j++) idx.push(c, j, j + 1);
  }
  if (capTop) {
    const c = pos.length / 3;
    const last = (R - 1) * row;
    pos.push(0, rings[R - 1].y + 0.0005, 0);
    uv.push(0.5, 1);
    for (let j = 0; j < M; j++) idx.push(c, last + j + 1, last + j);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // weld the shading across the UV seam (back centre)
  const n = g.getAttribute('normal') as BufferAttribute;
  for (let i = 0; i < R; i++) {
    const a = i * row;
    const b = a + M;
    const nx = n.getX(a) + n.getX(b);
    const ny = n.getY(a) + n.getY(b);
    const nz = n.getZ(a) + n.getZ(b);
    const l = Math.hypot(nx, ny, nz) || 1;
    n.setXYZ(a, nx / l, ny / l, nz / l);
    n.setXYZ(b, nx / l, ny / l, nz / l);
  }
  return g;
}

function bodyRings(): Ring[] {
  const rings: Ring[] = [];
  for (let k = 0; k <= 12; k++) {
    const ph = (k / 12) * (Math.PI / 2);
    rings.push({ y: YB + CAP_B * (1 - Math.cos(ph)), inset: CAP_B * (1 - Math.sin(ph)) });
  }
  const y0 = YB + CAP_B;
  const y1 = YT - CAP_T;
  for (let k = 1; k < 60; k++) rings.push({ y: y0 + ((y1 - y0) * k) / 60, inset: 0 });
  for (let k = 0; k <= 6; k++) {
    const ph = (Math.PI / 2) * (1 - k / 6);
    rings.push({ y: y1 + CAP_T * Math.cos(ph), inset: CAP_T * (1 - Math.sin(ph)) });
  }
  return rings;
}

function bandGeometry(y0: number, y1: number, inflate: number) {
  const e = (y1 - y0) * 0.22;
  const rings: Ring[] = [
    { y: y0, inset: inflate * 0.2 },
    { y: y0 + e * 0.5, inset: inflate * 0.03 },
    { y: y0 + e, inset: 0 },
    { y: y1 - e, inset: 0 },
    { y: y1 - e * 0.5, inset: inflate * 0.03 },
    { y: y1, inset: inflate * 0.2 },
  ];
  return profileGeometry(rings, 128, inflate);
}

/* ───────────────────────── Procedural textures ───────────────────────── */

function bodyTextures() {
  const W = 1024;
  const H = 1024;
  const Cu = 1.75; // physical circumference (u)
  const Cv = YT - YB; // physical length (v)
  const P = 0.03; // knurl pitch
  const tri = (s: number) => 1 - Math.abs(2 * (s - Math.floor(s)) - 1);
  const smooth = (e0: number, e1: number, x: number) => {
    const t = MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const gripMask = (u: number, v: number) => {
    const inV = smooth(0.15, 0.17, v) * (1 - smooth(0.6, 0.62, v));
    const side = (c: number) => smooth(c - 0.12, c - 0.105, u) * (1 - smooth(c + 0.105, c + 0.12, u));
    return inV * Math.max(side(0.25), side(0.75));
  };
  const height = (u: number, v: number) => {
    const m = gripMask(u, v);
    if (m <= 0) return 0;
    const x = u * Cu;
    const y = v * Cv;
    return m * Math.min(tri((x + y) / P), tri((x - y) / P));
  };

  const mk = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };
  const nC = mk();
  const oC = mk();
  const cC = mk();
  const nX = nC.getContext('2d')!;
  const oX = oC.getContext('2d')!;
  const cX = cC.getContext('2d')!;
  const nD = nX.createImageData(W, H);
  const oD = oX.createImageData(W, H);
  const cD = cX.createImageData(W, H);
  const du = 1 / W;
  const dv = 1 / H;
  const S = 0.9;
  for (let py = 0; py < H; py++) {
    const v = 1 - (py + 0.5) / H;
    for (let px = 0; px < W; px++) {
      const u = (px + 0.5) / W;
      const i = (py * W + px) * 4;
      const m = gripMask(u, v);
      let nx = 0;
      let ny = 0;
      if (m > 0) {
        const hx = (height(u + du, v) - height(u - du, v)) / (2 * du * Cu);
        const hy = (height(u, v + dv) - height(u, v - dv)) / (2 * dv * Cv);
        nx = -hx * S * P * 0.35;
        ny = -hy * S * P * 0.35;
      }
      const l = Math.hypot(nx, ny, 1);
      nD.data[i] = ((nx / l) * 0.5 + 0.5) * 255;
      nD.data[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      nD.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      nD.data[i + 3] = 255;
      // R: clearcoat (off on the grip), G: roughness, B: metalness
      const noise = (Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1;
      oD.data[i] = (1 - m) * 255;
      oD.data[i + 1] = (0.34 + m * 0.3 + Math.abs(noise) * 0.04) * 255;
      oD.data[i + 2] = (0.08 + m * 0.1) * 255;
      oD.data[i + 3] = 255;
      const base = 16 - m * 4;
      cD.data[i] = base;
      cD.data[i + 1] = base;
      cD.data[i + 2] = base + 1;
      cD.data[i + 3] = 255;
    }
  }
  nX.putImageData(nD, 0, 0);
  oX.putImageData(oD, 0, 0);
  cX.putImageData(cD, 0, 0);
  const normal = new CanvasTexture(nC);
  const orm = new CanvasTexture(oC);
  const color = new CanvasTexture(cC);
  color.colorSpace = SRGBColorSpace;
  for (const t of [normal, orm, color]) {
    t.anisotropy = 8;
    t.wrapS = RepeatWrapping;
  }
  return { normal, orm, color };
}

function radialTexture(stops: [number, string][], size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/* ───────────────────────── Parts ───────────────────────── */

function bladeShape(width: number, height: number, teeth: number, toothLen: number) {
  const s = new Shape();
  const hw = width / 2;
  const base = height - toothLen;
  const r = 0.03;
  s.moveTo(-hw + r, 0);
  s.lineTo(hw - r, 0);
  s.quadraticCurveTo(hw, 0, hw, r);
  s.lineTo(hw, base);
  const w = width / teeth;
  for (let i = teeth - 1; i >= 0; i--) {
    const x0 = -hw + i * w;
    s.lineTo(x0 + w * 0.88, base);
    s.lineTo(x0 + w * 0.66, height - 0.004);
    s.quadraticCurveTo(x0 + w * 0.5, height + 0.002, x0 + w * 0.34, height - 0.004);
    s.lineTo(x0 + w * 0.12, base);
  }
  s.lineTo(-hw, base);
  s.lineTo(-hw, r);
  s.quadraticCurveTo(-hw, 0, -hw + r, 0);
  return s;
}

function housingShape() {
  const s = new Shape();
  const bw = 0.305;
  const tw = 0.4;
  const h = 0.29;
  const r = 0.035;
  s.moveTo(-bw, 0);
  s.lineTo(bw, 0);
  s.lineTo(tw - r * 0.3, h - r);
  s.quadraticCurveTo(tw, h, tw - r, h);
  s.lineTo(-tw + r, h);
  s.quadraticCurveTo(-tw, h, -tw + r * 0.3, h - r);
  s.lineTo(-bw, 0);
  return s;
}

function logoGeometry(width: number, yCenter: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="259 37 1615 500"><path d="${logoPath.trim()}" fill-rule="evenodd"/></svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const raw = new ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 5 });
  raw.computeBoundingBox();
  const bb = raw.boundingBox!;
  const s = width / (bb.max.x - bb.min.x);
  const depth = 0.006;
  raw.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
  // flip SVG's downward y (and z, to keep the winding), scale, then extrude outwards
  raw.scale(s, -s, -depth);
  raw.translate(0, 0, depth);
  const p = raw.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i) + yCenter;
    p.setXYZ(i, x, y, frontZ(x, y) - 0.0015 + p.getZ(i));
  }
  raw.computeVertexNormals();
  return raw;
}

/* ───────────────────────── Story keyframes (scroll progress → pose) ───────────────────────── */

type Pose = { p: number; ry: number; rx: number; rz: number; y: number; s: number; ex: number; pw: number; cz: number; lv: number };
const TAU = Math.PI * 2;
const KEYS: Pose[] = [
  { p: 0.0, ry: -2.5, rx: 0.5, rz: -0.32, y: -0.3, s: 0.84, ex: 0, pw: 0, cz: 7.7, lv: 0 },
  { p: 0.14, ry: -0.6, rx: 0.16, rz: -0.12, y: 0, s: 1, ex: 0, pw: 0, cz: 7.2, lv: 0 },
  { p: 0.27, ry: 0.4, rx: 0.1, rz: 0.06, y: 0, s: 1, ex: 0, pw: 1, cz: 7.0, lv: 0 },
  { p: 0.42, ry: 0.12, rx: 0.98, rz: 0.0, y: -0.62, s: 1.28, ex: 0, pw: 1, cz: 5.9, lv: 1 },
  { p: 0.52, ry: 0.85, rx: 0.3, rz: 0.1, y: 0, s: 1, ex: 0, pw: 0, cz: 7.2, lv: 0 },
  { p: 0.66, ry: 2.25, rx: 0.2, rz: 0.14, y: 0.05, s: 0.94, ex: 1, pw: 0, cz: 7.9, lv: 0 },
  { p: 0.78, ry: 3.4, rx: 0.14, rz: 0.04, y: 0.05, s: 0.94, ex: 1, pw: 0, cz: 7.9, lv: 0 },
  { p: 0.92, ry: TAU + 0.36, rx: 0.12, rz: -0.06, y: 0, s: 1, ex: 0, pw: 0.55, cz: 7.2, lv: 0 },
  { p: 1.0, ry: TAU + 0.46, rx: 0.12, rz: -0.06, y: 0, s: 1, ex: 0, pw: 0.55, cz: 7.2, lv: 0 },
];
const ease = (t: number) => t * t * (3 - 2 * t);
function poseAt(p: number): Pose {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = ease(MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1));
  const out = { ...a };
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => (out[k] = a[k] + (b[k] - a[k]) * t));
  return out;
}

/* ───────────────────────── Scene ───────────────────────── */

export function createCraft(canvas: HTMLCanvasElement, stage: HTMLElement, opts: { reduced: boolean }): CraftRender | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const coarse = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  scene.environmentIntensity = 0.85;

  const camera = new PerspectiveCamera(28, 1, 0.1, 60);
  camera.position.set(0, 0.15, 7.2);

  // Lights: warm key that sweeps with the story, cool rim, gold kicker from below
  scene.add(new HemisphereLight(0xfff1dc, 0x1a120a, 0.35));
  const key = new DirectionalLight(0xffe2b8, 2.6);
  scene.add(key);
  const rim = new DirectionalLight(0xc8d8ff, 1.6);
  rim.position.set(-4, 2.5, -3.5);
  scene.add(rim);
  const kick = new PointLight(0xd9ae62, 9, 12, 2);
  kick.position.set(2.2, -2.2, 2.4);
  scene.add(kick);

  // Materials
  const tex = bodyTextures();
  const bodyMat = new MeshPhysicalMaterial({
    color: 0xffffff,
    map: tex.color,
    normalMap: tex.normal,
    normalScale: new Vector2(1.4, 1.4),
    roughnessMap: tex.orm,
    metalnessMap: tex.orm,
    clearcoatMap: tex.orm,
    roughness: 1,
    metalness: 1,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    envMapIntensity: 0.9,
  });
  const goldMat = new MeshPhysicalMaterial({ color: 0xc29a55, metalness: 1, roughness: 0.34, anisotropy: 0.6, clearcoat: 0.2, clearcoatRoughness: 0.4, envMapIntensity: 0.8 });
  const seatMat = new MeshPhysicalMaterial({ color: 0x0e0e0e, metalness: 0.4, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.3 });
  const goldPolish = new MeshPhysicalMaterial({ color: 0xd8b672, metalness: 1, roughness: 0.14 });
  const cutterMat = new MeshPhysicalMaterial({ color: 0xd4af6a, metalness: 1, roughness: 0.2, clearcoat: 0.4 });
  const steelMat = new MeshPhysicalMaterial({ color: 0xd9dadc, metalness: 1, roughness: 0.17 });
  const blackGloss = new MeshPhysicalMaterial({ color: 0x0c0c0c, metalness: 0.2, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const ledMat = new MeshStandardMaterial({ color: 0x2a2116, emissive: new Color(0xffa94d), emissiveIntensity: 0, roughness: 0.4 });

  // Model hierarchy: root (layout) → model (story pose) → parts
  const root = new Group();
  const model = new Group();
  root.add(model);
  scene.add(root);

  const body = new Mesh(profileGeometry(bodyRings(), 160, 0, true, true), bodyMat);
  model.add(body);

  const bandTop = new Mesh(bandGeometry(0.738, 0.79, 0.006), goldPolish);
  const bandBot = new Mesh(bandGeometry(-1.035, -0.995, 0.006), goldPolish);
  model.add(bandTop, bandBot);

  const logo = new Mesh(logoGeometry(0.36, -0.42), goldPolish);
  model.add(logo);

  const housing = new Mesh(
    new ExtrudeGeometry(housingShape(), { depth: 0.44, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.02, bevelSegments: 5, curveSegments: 10 }),
    goldMat,
  );
  housing.geometry.translate(0, 0, -0.22);
  housing.position.y = YT - 0.012;
  model.add(housing);
  // Dark blade seat on top of the housing, where the blades rest
  const seatShape = new Shape();
  {
    const w = 0.36;
    const d = 0.2;
    const r = 0.04;
    seatShape.moveTo(-w + r, -d);
    seatShape.lineTo(w - r, -d);
    seatShape.quadraticCurveTo(w, -d, w, -d + r);
    seatShape.lineTo(w, d - r);
    seatShape.quadraticCurveTo(w, d, w - r, d);
    seatShape.lineTo(-w + r, d);
    seatShape.quadraticCurveTo(-w, d, -w, d - r);
    seatShape.lineTo(-w, -d + r);
    seatShape.quadraticCurveTo(-w, -d, -w + r, -d);
  }
  const seatGeo = new ExtrudeGeometry(seatShape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 8 });
  seatGeo.rotateX(-Math.PI / 2);
  const seat = new Mesh(seatGeo, seatMat);
  seat.position.y = 0.29 + 0.018;
  housing.add(seat);

  // Blades
  const blades = new Group();
  blades.position.set(0, YT + 0.235, 0.075);
  blades.rotation.x = -0.2;
  model.add(blades);
  const statGeo = new ExtrudeGeometry(bladeShape(0.9, 0.245, 44, 0.07), { depth: 0.016, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.0025, bevelSegments: 1, curveSegments: 3 });
  statGeo.translate(0, 0, -0.008);
  const stationary = new Mesh(statGeo, steelMat);
  blades.add(stationary);
  const cutGeo = new ExtrudeGeometry(bladeShape(0.8, 0.175, 38, 0.055), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 3 });
  cutGeo.translate(0, 0, -0.006);
  const cutter = new Mesh(cutGeo, cutterMat);
  cutter.position.set(0, 0.012, 0.018);
  blades.add(cutter);
  const screws = new Group();
  const screwGeo = new CylinderGeometry(0.03, 0.03, 0.018, 28);
  screwGeo.rotateX(Math.PI / 2);
  [-0.26, 0.26].forEach((x) => {
    const sc = new Mesh(screwGeo, steelMat);
    sc.position.set(x, 0.075, -0.018);
    const slot = new Mesh(new PlaneGeometry(0.044, 0.006), blackGloss);
    slot.position.set(x, 0.075, -0.0275);
    slot.rotation.y = Math.PI;
    screws.add(sc, slot);
  });
  blades.add(screws);

  // Taper lever on the left side of the housing
  const lever = new Group();
  lever.position.set(-0.4, YT + 0.17, 0.06);
  const pivot = new Mesh(new CylinderGeometry(0.056, 0.056, 0.036, 36), goldPolish);
  pivot.rotation.z = Math.PI / 2;
  const cap = new Mesh(new CylinderGeometry(0.03, 0.03, 0.04, 24), blackGloss);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = -0.004;
  const armCurve = new CatmullRomCurve3([
    new Vector3(-0.012, 0, 0),
    new Vector3(-0.035, -0.1, -0.02),
    new Vector3(-0.03, -0.21, -0.055),
    new Vector3(-0.012, -0.29, -0.05),
  ]);
  const arm = new Mesh(new TubeGeometry(armCurve, 40, 0.018, 12), goldPolish);
  const knob = new Mesh(new SphereGeometry(0.032, 24, 16), goldPolish);
  knob.position.copy(armCurve.getPoint(1));
  lever.add(pivot, cap, arm, knob);
  model.add(lever);

  // Power button with LED ring on the front
  const power = new Group();
  const pY = 0.42;
  power.position.set(0, pY, frontZ(0, pY));
  const btnGeo = new CylinderGeometry(0.056, 0.062, 0.028, 44);
  btnGeo.rotateX(Math.PI / 2);
  const btn = new Mesh(btnGeo, blackGloss);
  btn.position.z = 0.008;
  const led = new Mesh(new TorusGeometry(0.078, 0.0075, 12, 72), ledMat);
  led.position.z = 0.003;
  const glow = new Sprite(
    new SpriteMaterial({
      map: radialTexture([
        [0, 'rgba(255,226,170,0.9)'],
        [0.25, 'rgba(255,200,120,0.35)'],
        [1, 'rgba(255,190,110,0)'],
      ]),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    }),
  );
  glow.scale.setScalar(0.4);
  glow.position.z = 0.03;
  power.add(btn, led, glow);
  model.add(power);

  // Soft contact shadow below
  const shadow = new Mesh(
    new PlaneGeometry(3.2, 3.2),
    new MeshBasicMaterial({
      map: radialTexture([
        [0, 'rgba(0,0,0,0.75)'],
        [0.35, 'rgba(0,0,0,0.35)'],
        [1, 'rgba(0,0,0,0)'],
      ]),
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.78;
  root.add(shadow);

  // Hair clippings (world space)
  const HAIR = coarse ? 110 : 180;
  const hairGeo = new CylinderGeometry(1, 0.7, 1, 5, 1);
  const hairs = new InstancedMesh(hairGeo, new MeshPhysicalMaterial({ color: 0x2b1f15, roughness: 0.38, metalness: 0, sheen: 1, sheenColor: new Color(0x8a6a48), sheenRoughness: 0.4 }), HAIR);
  hairs.instanceMatrix.setUsage(DynamicDrawUsage);
  hairs.frustumCulled = false;
  scene.add(hairs);
  const hp = new Float32Array(HAIR * 3);
  const hv = new Float32Array(HAIR * 3);
  const hr = new Float32Array(HAIR * 3);
  const hw = new Float32Array(HAIR * 3);
  const hl = new Float32Array(HAIR);
  const hlen = new Float32Array(HAIR);
  for (let i = 0; i < HAIR; i++) hlen[i] = 0.035 + Math.random() * 0.09;
  const m4 = new Matrix4();
  const q = new Quaternion();
  const e3 = new Object3D();
  const zero = new Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < HAIR; i++) hairs.setMatrixAt(i, zero);
  let spawnAcc = 0;
  let nextHair = 0;
  const tipL = new Vector3();
  const tipR = new Vector3();
  const bladeN = new Vector3();

  // Exploded-view offsets (model space) for each part
  const explode: [Object3D, Vector3, number][] = [
    [cutter, new Vector3(0, 0.34, 0.2), 0.0],
    [stationary, new Vector3(0, 0.2, 0.06), 0.06],
    [screws, new Vector3(0, 0.2, -0.26), 0.1],
    [housing, new Vector3(0, 0.22, 0), 0.14],
    [lever, new Vector3(-0.36, 0.05, 0), 0.08],
    [power, new Vector3(0, 0, 0.3), 0.12],
    [logo, new Vector3(0, 0, 0.16), 0.18],
    [bandTop, new Vector3(0, 0.1, 0), 0.16],
    [bandBot, new Vector3(0, -0.14, 0), 0.2],
  ];
  const basePos = new Map<Object3D, Vector3>();
  explode.forEach(([o]) => basePos.set(o, o.position.clone()));
  // blades sit inside the blades group: lift the whole group with the housing too
  const bladesBase = blades.position.clone();

  /* Interaction: pointer tilt + drag to spin */
  const tilt = new Vector2();
  const tiltTarget = new Vector2();
  let spin = 0;
  let spinVel = 0;
  let dragging = false;
  let lastX = 0;
  let releasedAt = 0;
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tiltTarget.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    if (dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      spin += dx * 0.012;
      spinVel = dx * 0.012;
    }
  });
  stage.addEventListener('pointerleave', () => tiltTarget.set(0, 0));
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    spinVel = 0;
    canvas.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });
  const release = () => {
    dragging = false;
    releasedAt = performance.now();
    stage.classList.remove('is-dragging');
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /* Layout */
  let aspect = 1;
  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(stage);

  let power01 = 0;

  return (p, dt, time) => {
    const pose = poseAt(p);
    const t = time / 1000;
    const still = opts.reduced;

    // Layout: model to the right of the copy on wide screens, above it on tall ones
    if (aspect >= 1) {
      const vis = 2 * 7.2 * Math.tan(MathUtils.degToRad(14)) * aspect;
      root.position.set(Math.min(vis * 0.22, 1.55), 0.02, 0);
      root.scale.setScalar(aspect < 1.3 ? 0.86 : 1);
    } else {
      // Portrait: keep the model in the top half, clear of the copy at the bottom
      root.position.set(0, 0.68, 0);
      root.scale.setScalar(MathUtils.clamp(aspect * 1.05, 0.5, 0.6));
    }
    const portrait = aspect < 1;
    camera.position.z = portrait ? 7.2 + (pose.cz - 7.2) * 0.45 : pose.cz;
    if (portrait) camera.lookAt(0, 0.1, 0);
    else camera.lookAt(root.position.x * 0.35, 0.1 + root.position.y * 0.35, 0);

    // Interaction
    tilt.lerp(tiltTarget, 1 - Math.exp(-dt * 4));
    if (!dragging) {
      spin += spinVel;
      spinVel *= Math.exp(-dt * 3.2);
      if (performance.now() - releasedAt > 900 && Math.abs(spinVel) < 0.002) {
        const target = Math.round(spin / TAU) * TAU;
        spin += (target - spin) * (1 - Math.exp(-dt * 1.6));
      }
    }

    const float = still ? 0 : Math.sin(t * 0.9) * 0.035;
    const drift = still ? 0 : Math.sin(t * 0.33) * 0.06;
    model.rotation.set(pose.rx + tilt.y * 0.14, pose.ry + drift + spin + tilt.x * 0.32, pose.rz, 'YXZ');
    const damp = aspect < 1 ? 0.45 : 1;
    model.position.y = pose.y * damp + float;
    model.scale.setScalar(1 + (pose.s - 1) * damp);

    // Key light sweeps across the metal as the story moves
    const la = -0.6 + p * Math.PI * 1.4;
    key.position.set(Math.cos(la) * 5, 4.2, Math.sin(la) * 2.5 + 4);

    // Exploded view
    explode.forEach(([o, off, delay]) => {
      const e = ease(MathUtils.clamp((pose.ex - delay) / (1 - 0.2), 0, 1));
      o.position.copy(basePos.get(o)!).addScaledVector(off, e);
    });
    const eh = ease(MathUtils.clamp((pose.ex - 0.14) / 0.8, 0, 1));
    blades.position.copy(bladesBase).add(new Vector3(0, 0.22 * eh, 0));
    lever.rotation.x = -pose.lv * 0.55 + Math.sin(t * 1.4) * 0.02 * pose.lv;

    // Power: LED, vibration, falling clippings
    power01 += (pose.pw - power01) * (1 - Math.exp(-dt * 5));
    const on = power01 > 0.02;
    ledMat.emissiveIntensity = power01 * 2.4;
    (glow.material as SpriteMaterial).opacity = power01 * 0.6;
    const vib = on && !still ? power01 : 0;
    cutter.position.x = (basePos.get(cutter)!.x || 0) + Math.sin(t * 190) * 0.007 * vib;
    if (vib) {
      model.position.x = Math.sin(t * 157) * 0.0016 * vib;
      model.position.z = Math.cos(t * 173) * 0.0012 * vib;
    } else {
      model.position.x = 0;
      model.position.z = 0;
    }

    // Clippings
    root.updateMatrixWorld(true);
    blades.localToWorld(tipL.set(-0.38, 0.235, 0.03));
    blades.localToWorld(tipR.set(0.38, 0.235, 0.03));
    bladeN.set(0, 1, 0.3).transformDirection(blades.matrixWorld);
    const spray = vib * MathUtils.smoothstep(power01, 0.82, 1);
    if (spray > 0.05) {
      spawnAcc += dt * 75 * spray;
      while (spawnAcc > 1) {
        spawnAcc -= 1;
        const i = nextHair;
        nextHair = (nextHair + 1) % HAIR;
        const k = Math.random();
        hp[i * 3] = tipL.x + (tipR.x - tipL.x) * k;
        hp[i * 3 + 1] = tipL.y + (tipR.y - tipL.y) * k;
        hp[i * 3 + 2] = tipL.z + (tipR.z - tipL.z) * k;
        const sp = 0.45 + Math.random() * 0.6;
        hv[i * 3] = bladeN.x * sp + (k - 0.5) * 1.1 + (Math.random() - 0.5) * 0.25;
        hv[i * 3 + 1] = bladeN.y * sp + Math.random() * 0.25;
        hv[i * 3 + 2] = bladeN.z * sp + (Math.random() - 0.5) * 0.2;
        hr[i * 3] = Math.random() * TAU;
        hr[i * 3 + 1] = Math.random() * TAU;
        hr[i * 3 + 2] = Math.random() * TAU;
        hw[i * 3] = (Math.random() - 0.5) * 9;
        hw[i * 3 + 1] = (Math.random() - 0.5) * 9;
        hw[i * 3 + 2] = (Math.random() - 0.5) * 9;
        hl[i] = 2.1;
      }
    }
    const sx = root.scale.x;
    for (let i = 0; i < HAIR; i++) {
      if (hl[i] <= 0) continue;
      hl[i] -= dt;
      if (hl[i] <= 0) {
        hairs.setMatrixAt(i, zero);
        continue;
      }
      hv[i * 3 + 1] -= 2.3 * dt;
      const drag = Math.exp(-dt * 1.4);
      hv[i * 3] *= drag;
      hv[i * 3 + 2] *= drag;
      hp[i * 3] += hv[i * 3] * dt;
      hp[i * 3 + 1] += hv[i * 3 + 1] * dt;
      hp[i * 3 + 2] += hv[i * 3 + 2] * dt;
      hr[i * 3] += hw[i * 3] * dt;
      hr[i * 3 + 1] += hw[i * 3 + 1] * dt;
      hr[i * 3 + 2] += hw[i * 3 + 2] * dt;
      e3.rotation.set(hr[i * 3], hr[i * 3 + 1], hr[i * 3 + 2]);
      q.setFromEuler(e3.rotation);
      const fade = Math.min(1, hl[i] / 0.5);
      const r = 0.0019 * sx * fade;
      m4.compose(new Vector3(hp[i * 3], hp[i * 3 + 1], hp[i * 3 + 2]), q, new Vector3(r, hlen[i] * sx, r));
      hairs.setMatrixAt(i, m4);
    }
    hairs.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
  };
}
