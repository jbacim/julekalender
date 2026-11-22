import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { RewardDefinition } from '../domain/types';
import type { QualityTier } from '../services/capabilities';
import {
  Materials,
  TREE,
  buildGarland,
  buildGift,
  buildHut,
  buildNisse,
  buildOrnament,
  buildStar,
  buildTree,
  buildWorldItem,
  buildYeti,
  buildSantaSleigh,
  type SantaRig,
  giftSlots,
  treePoint,
  type NisseRig,
} from './builders';
import { CUE_TIMES, FINALE, REDUCED_CUE_TIMES, sampleCamera, type FinaleCue } from './finaleScript';

export interface WorldState {
  rewards: RewardDefinition[];
  gifts: number;
  lit: boolean;
  /** Den 24. december: julemanden flyver ind og lander ('arrive') eller står allerede parkeret. */
  santa?: 'arrive' | 'parked';
}

/** Hvor julemandens kane lander, og hvilken retning spandet peger (mod beskueren, til højre for træet). */
const SANTA_PARK = new THREE.Vector3(2.4, 0, -4.6);
const SANTA_HEADING = new THREE.Vector3(0.37, 0, 0.93).normalize();
/** Flyverute: ind fra venstre højt oppe, en bue rundt bag træet og ned til landingen. */
const SANTA_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-24, 11, -8),
    new THREE.Vector3(-10, 9, -11),
    new THREE.Vector3(3, 8, -10),
    new THREE.Vector3(9.5, 6, -5),
    new THREE.Vector3(6, 4.2, -11),
    new THREE.Vector3(1.2, 2, -10),
    new THREE.Vector3(1.4, 0.7, -7.2),
    SANTA_PARK.clone().addScaledVector(SANTA_HEADING, -1.1).setY(0.12),
    SANTA_PARK.clone(),
  ],
  false,
  'centripetal',
);
const SANTA_FLIGHT = 16;

export type VisitorKind = 'reindeer' | 'yeti';

interface Visitor {
  kind: VisitorKind;
  obj: THREE.Group;
  t0: number;
  dir: 1 | -1;
  z: number;
  rig?: ReturnType<typeof buildYeti>;
  /** Yetiens stoppested (verdens-x), valgt så den er i billedet og ikke bag træet. */
  stopX: number;
}

export interface WorldOptions {
  quality: QualityTier;
  reducedMotion: boolean;
  interactive: boolean;
  onContextLost: () => void;
}

const HUT_POS = new THREE.Vector3(-3.6, 0, -1.85);
const TARGET = new THREE.Vector3(0, 1.55, 0);
/** Hvor nissen stiller sig ved træet, og hvor sækken sættes. */
const NISSE_DEST = new THREE.Vector3(-1.25, 0, 2.65);
const SACK_POS = new THREE.Vector3(-0.7, 0, 2.3);

function nisseHome(): THREE.Vector3 {
  return new THREE.Vector3(0.9, 0, 1.15).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.45).add(HUT_POS);
}

/** Antal kasser i gavebunken – en visuel repræsentation, ikke noget barnet skal tælle. */
export function boxesForGifts(gifts: number, max: number): number {
  if (gifts <= 0) return 0;
  return Math.min(max, Math.max(2, Math.round((gifts / 240) * max)));
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/**
 * Den personlige 3D-juleverden. Ren præsentation: den modtager allerede besluttet state
 * og ændrer aldrig progression eller belønninger.
 */
export class ThreeWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private mat: Materials;
  private clock = new THREE.Timer();
  private raf = 0;
  private running = false;
  private visible = true;
  private inView = true;
  private disposed = false;
  private resizeObs: ResizeObserver;
  private interObs: IntersectionObserver | null = null;

  private decorGroup = new THREE.Group();
  private giftGroup = new THREE.Group();
  private bulbs: THREE.Mesh[] = [];
  private star: THREE.Group | null = null;
  private snow: THREE.Points | null = null;
  private nisse: THREE.Group;
  private treeGlow: THREE.PointLight;
  private ambient: THREE.HemisphereLight;
  private slots: ReturnType<typeof giftSlots>;
  private giftBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  private state: WorldState = { rewards: [], gifts: 0, lit: false };
  private finale: {
    t0: number;
    fromBoxes: number;
    toBoxes: number;
    done: () => void;
    onCue?: (cue: FinaleCue) => void;
    fired: Set<FinaleCue>;
  } | null = null;
  private nisseRig: NisseRig;
  private groundSack: THREE.Group;
  private sparkles: THREE.Points;
  private sparkleH: Float32Array;
  private sparkleProgress = 0;
  private trail: THREE.Points;
  private camTarget = new THREE.Vector3();
  /** Besøgende i baggrunden: et rensdyr af og til, en sjælden yeti – eller sendt med knapperne. */
  private visitors: Visitor[] = [];
  private nextVisitorAt = 8 + Math.random() * 14;
  private santa: { rig: SantaRig; t0: number; arriving: boolean } | null = null;
  private onDevVisitor = (e: Event) => {
    this.sendVisitor((e as CustomEvent).detail === 'yeti' ? 'yeti' : 'reindeer');
  };
  private litAmount = 0;
  private idleAz = 0;

  constructor(
    private container: HTMLElement,
    private opts: WorldOptions,
  ) {
    const q = opts.quality;
    this.mat = new Materials(q === 'low');
    this.renderer = new THREE.WebGLRenderer({ antialias: q !== 'low', powerPreference: q === 'high' ? 'high-performance' : 'low-power' });
    const maxDpr = q === 'high' ? 2 : q === 'medium' ? 1.5 : 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.shadowMap.enabled = q === 'high';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    const canvas = this.renderer.domElement;
    canvas.className = 'world3d-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);
    canvas.addEventListener('webglcontextlost', this.onContextLost, false);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.setCameraSpherical(0.05, 1.18, 10);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(TARGET);
    this.controls.enablePan = false;
    this.controls.enableDamping = !opts.reducedMotion;
    this.controls.minDistance = 5.2; // aldrig ind i træet
    this.controls.maxDistance = 14;
    this.controls.minPolarAngle = 0.35;
    this.controls.maxPolarAngle = 1.42; // aldrig under jorden
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.addEventListener('change', () => this.requestRender());
    this.setInteractive(opts.interactive);

    // Lys og himmel
    this.scene.background = new THREE.Color('#1c2652');
    this.scene.fog = new THREE.Fog('#2a3566', 14, 34);
    this.ambient = new THREE.HemisphereLight('#bcd2ff', '#3a3550', 1.15);
    this.scene.add(this.ambient);
    const moon = new THREE.DirectionalLight('#cddcff', 1.3);
    moon.position.set(6, 10, 6);
    moon.castShadow = q === 'high';
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.left = -7;
    moon.shadow.camera.right = 7;
    moon.shadow.camera.top = 7;
    moon.shadow.camera.bottom = -7;
    this.scene.add(moon);
    this.treeGlow = new THREE.PointLight('#ffcf7a', 0, 9, 1.2);
    this.treeGlow.position.set(0, 2, 1.4);
    this.scene.add(this.treeGlow);

    this.buildStatic();
    this.scene.add(this.decorGroup, this.giftGroup);

    const n = buildNisse(this.mat);
    this.nisseRig = n;
    this.nisse = n.group;

    // Stor sæk på jorden (finalen)
    this.groundSack = new THREE.Group();
    const sackBody = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), this.mat.get('#a77a4a', { roughness: 1 }));
    sackBody.scale.set(1, 1.1, 1);
    sackBody.position.y = 0.42;
    sackBody.castShadow = true;
    const sackNeck = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 12), this.mat.get('#7b5530'));
    sackNeck.rotation.x = Math.PI / 2;
    sackNeck.position.y = 0.86;
    this.groundSack.add(sackBody, sackNeck);
    this.groundSack.position.copy(SACK_POS);
    this.groundSack.visible = false;
    this.scene.add(this.groundSack);

    // Gyldne glimt på træet (tændes i finalen og når stjernen er vundet)
    const sparkleCount = q === 'low' ? 90 : 190;
    const sp = new Float32Array(sparkleCount * 3);
    this.sparkleH = new Float32Array(sparkleCount);
    for (let i = 0; i < sparkleCount; i++) {
      const h = 0.04 + ((i * 0.618034) % 1) * 0.9;
      const pt = treePoint((i * 137.5) % 360, h, 1.06);
      sp.set([pt.x, pt.y, pt.z], i * 3);
      this.sparkleH[i] = h;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sparkleCount * 3), 3));
    this.sparkles = new THREE.Points(
      sg,
      new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.sparkles.visible = false;
    this.scene.add(this.sparkles);

    // Glimtende spor efter stjernen
    const trailCount = q === 'low' ? 80 : 180;
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trailCount * 3), 3));
    tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(trailCount * 3), 3));
    this.trail = new THREE.Points(
      tg,
      new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.trail.visible = false;
    this.trail.frustumCulled = false;
    this.trailLife = new Float32Array(trailCount);
    this.trailVel = new Float32Array(trailCount * 3);
    this.scene.add(this.trail);
    this.placeNisseHome();
    this.scene.add(this.nisse);

    this.slots = giftSlots(q === 'low' ? 36 : 60);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    if ('IntersectionObserver' in window) {
      this.interObs = new IntersectionObserver((entries) => {
        this.inView = entries.some((e) => e.isIntersecting);
        this.updateRunning();
      });
      this.interObs.observe(container);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    if (import.meta.env.DEV) {
      window.addEventListener('julekalender:visitor', this.onDevVisitor);
      (window as unknown as { __world?: ThreeWorld }).__world = this;
    }
    this.resize();
    this.updateRunning();
  }

  private buildStatic(): void {
    const q = this.opts.quality;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), this.mat.get('#eef4ff', { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    // Snedriver
    const moundMat = this.mat.get('#f7faff', { roughness: 1 });
    const moundGeo = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const [x, z, s] of [[6, -6, 1.6], [-5.5, 2.5, 1.2], [6, 3.5, 1.4], [-1.5, -5, 1.8], [2.5, 5.5, 1]] as const) {
      const m = new THREE.Mesh(moundGeo, moundMat);
      m.position.set(x, 0, z);
      m.scale.set(s * 1.6, s * 0.35, s);
      m.receiveShadow = true;
      this.scene.add(m);
    }
    // Skov i baggrunden
    const forestCount = q === 'low' ? 18 : 34;
    const coneGeo = new THREE.ConeGeometry(0.9, 2.8, 8);
    const forest = new THREE.InstancedMesh(coneGeo, this.mat.get('#24553a', { roughness: 1 }), forestCount);
    const snowCap = new THREE.InstancedMesh(new THREE.ConeGeometry(0.42, 0.9, 8), this.mat.get('#f4f8ff'), forestCount);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < forestCount; i++) {
      const a = (i / forestCount) * Math.PI * 2 + Math.sin(i * 7.3) * 0.08;
      const r = 11 + ((i * 37) % 7);
      const s = 0.8 + ((i * 13) % 10) / 12;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r - 2;
      m4.compose(new THREE.Vector3(x, 1.4 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
      forest.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(x, 2.5 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
      snowCap.setMatrixAt(i, m4);
    }
    this.scene.add(forest, snowCap);

    const tree = buildTree(this.mat);
    this.scene.add(tree);

    const hut = buildHut(this.mat);
    hut.group.position.copy(HUT_POS);
    hut.group.rotation.y = 0.45;
    this.scene.add(hut.group);

    // Sti af små sten
    const stoneGeo = new THREE.SphereGeometry(0.12, 6, 4);
    const stoneMat = this.mat.get('#b9c2d6');
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const s = new THREE.Mesh(stoneGeo, stoneMat);
      s.position.set(THREE.MathUtils.lerp(-3.0, -0.8, t), 0.02, THREE.MathUtils.lerp(-0.7, 1.9, t) + Math.sin(i) * 0.15);
      s.scale.set(1.4, 0.35, 1);
      this.scene.add(s);
    }

    // Sne
    const count = this.opts.reducedMotion ? (q === 'low' ? 120 : 200) : q === 'low' ? 300 : q === 'medium' ? 700 : 1200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = Math.random() * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snow = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.07, transparent: true, opacity: 0.85, depthWrite: false }));
    this.scene.add(this.snow);
  }

  private placeNisseHome(): void {
    this.nisse.position.copy(nisseHome());
    this.nisse.rotation.set(0, 0.7, 0);
  }

  setInteractive(on: boolean): void {
    this.opts.interactive = on;
    this.controls.enabled = on;
    this.renderer.domElement.style.touchAction = on ? 'none' : 'auto';
    this.renderer.domElement.style.cursor = on ? 'grab' : 'default';
  }

  /** Opdaterer verdenen til en (allerede gemt) tilstand. */
  update(state: WorldState): void {
    const prev = this.state;
    this.state = state;
    this.updateSanta(state.santa);
    const sameRewards = prev.rewards.map((r) => r.id).join() === state.rewards.map((r) => r.id).join();
    if (!sameRewards || this.decorGroup.children.length === 0) this.rebuildDecorations();
    if (!this.finale) {
      this.setGiftBoxes(boxesForGifts(state.gifts, this.slots.length), 1);
      this.litAmount = state.lit ? 1 : 0;
      this.sparkleProgress = this.litAmount;
      this.applyLit();
      this.updateSparkles(0);
    }
    this.requestRender();
  }

  private rebuildDecorations(): void {
    this.disposeGroup(this.decorGroup, false);
    this.bulbs = [];
    this.star = null;
    for (const r of this.state.rewards) {
      if (r.visual === 'star') {
        this.star = buildStar(this.mat, r.colors[0]);
        this.star.position.set(0, TREE.baseY + TREE.height + 0.25, 0.02);
        this.decorGroup.add(this.star);
      } else if (r.visual === 'flagGarland' || r.visual === 'lightString') {
        const g = buildGarland(r, this.mat);
        this.bulbs.push(...g.bulbs);
        this.decorGroup.add(g.obj);
      } else if (r.placement === 'tree') {
        const o = buildOrnament(r, this.mat);
        const p = treePoint(r.position[0], r.position[1], 1.12);
        o.position.copy(p);
        o.rotation.y = (r.position[0] * Math.PI) / 180;
        o.scale.setScalar(1.7);
        this.decorGroup.add(o);
      } else {
        const o = buildWorldItem(r, this.mat);
        if (r.visual === 'wreath') {
          // På hyttens dør
          const door = new THREE.Vector3(0, 1.05, 0.86).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.45).add(HUT_POS);
          o.position.copy(door);
          o.rotation.y = 0.45;
        } else {
          o.position.set(r.position[0], 0, r.position[1]);
        }
        this.decorGroup.add(o);
      }
    }
  }

  private setGiftBoxes(n: number, scale: number): void {
    while (this.giftGroup.children.length > n) {
      const c = this.giftGroup.children[this.giftGroup.children.length - 1];
      this.giftGroup.remove(c);
    }
    while (this.giftGroup.children.length < n) {
      const slot = this.slots[this.giftGroup.children.length];
      const g = buildGift(slot, this.mat, this.giftBoxGeo);
      g.scale.setScalar(scale);
      this.giftGroup.add(g);
    }
  }

  private applyLit(): void {
    const l = this.litAmount;
    this.treeGlow.intensity = l * 3.2;
    for (const b of this.bulbs) {
      const m = b.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.6 + l * 1.6;
    }
    this.ambient.intensity = 1.15 + l * 0.25;
  }

  /**
   * Afspiller juleaftensfinalen (~30 s): nissen går fra hytten med sækken, gaverne flyver ud på
   * bunken, stjernen spiraler op i toppen, lyset breder sig op gennem træet, og kameraet ender
   * i en præsentation. Belønningerne er gemt FØR dette kaldes; afbrydelse mister intet.
   */
  playFinale(fromGifts: number, done: () => void, onCue?: (cue: FinaleCue) => void): void {
    this.setInteractive(false);
    const fromBoxes = boxesForGifts(fromGifts, this.slots.length);
    const toBoxes = boxesForGifts(this.state.gifts, this.slots.length);
    this.setGiftBoxes(toBoxes, 1);
    this.giftGroup.children.forEach((c, i) => {
      c.visible = i < fromBoxes;
      c.position.copy(this.slots[i].pos);
      c.scale.setScalar(1);
    });
    this.litAmount = 0;
    this.applyLit();
    this.sparkleProgress = 0;
    this.updateSparkles(0);
    if (this.star) this.star.visible = false;
    this.groundSack.visible = false;
    this.nisseRig.sack.visible = true;
    this.placeNisseHome();
    this.finale = { t0: this.clock.getElapsed(), fromBoxes, toBoxes, done, onCue, fired: new Set() };
    this.updateRunning();
  }

  skipFinale(): void {
    if (!this.finale) return;
    this.finishFinale();
  }

  private finishFinale(): void {
    const f = this.finale;
    if (!f) return;
    this.finale = null;
    this.setGiftBoxes(boxesForGifts(this.state.gifts, this.slots.length), 1);
    this.giftGroup.children.forEach((c, i) => {
      c.visible = true;
      c.position.copy(this.slots[i].pos);
      c.rotation.set(0, this.slots[i].rot, 0);
      c.scale.setScalar(1);
    });
    if (this.star) {
      this.star.visible = true;
      this.star.scale.setScalar(1);
      this.star.position.set(0, TREE.baseY + TREE.height + 0.25, 0.02);
      this.star.rotation.set(0, 0, 0);
    }
    this.litAmount = 1;
    this.sparkleProgress = 1;
    this.applyLit();
    this.groundSack.visible = false;
    this.nisseRig.sack.visible = true;
    this.nisseRig.sack.scale.setScalar(1);
    this.nisse.position.copy(NISSE_DEST);
    this.nisse.rotation.set(0, 0.5, 0);
    this.nisseRig.armR.rotation.set(0, 0, 0.25);
    this.nisseRig.armL.rotation.set(0, 0, -0.25);
    this.controls.target.copy(TARGET);
    if (!this.opts.reducedMotion) this.setCameraSpherical(0.0, 1.2, 9);
    this.controls.update();
    this.requestRender();
    f.onCue?.('done');
    f.done();
  }

  private fireCues(t: number): void {
    const f = this.finale!;
    for (const [at, cue] of this.opts.reducedMotion ? REDUCED_CUE_TIMES : CUE_TIMES) {
      if (t >= at && !f.fired.has(cue)) {
        f.fired.add(cue);
        f.onCue?.(cue);
      }
    }
  }

  private nisseWalkPath = new THREE.CatmullRomCurve3([
    nisseHome(),
    new THREE.Vector3(-2.7, 0, 0.1),
    new THREE.Vector3(-2.1, 0, 1.5),
    NISSE_DEST.clone(),
  ]);

  private tickFinale(now: number, dt: number): void {
    const f = this.finale!;
    const t = now - f.t0;
    this.fireCues(t);
    if (this.opts.reducedMotion) {
      this.tickReducedFinale(t);
      if (t >= FINALE.reducedTotal) this.finishFinale();
      return;
    }
    const rig = this.nisseRig;
    const topY = TREE.baseY + TREE.height + 0.25;

    // --- Nissen ---
    rig.armR.rotation.set(0, 0, 0.25);
    rig.armL.rotation.set(0, 0, -0.25);
    this.nisse.rotation.x = 0;
    this.nisse.rotation.z = 0;
    if (t < FINALE.walkStart) {
      // Står i døren, kigger sig omkring og gør et lille hop af glæde
      this.placeNisseHome();
      this.nisse.rotation.y = 0.7 + Math.sin(t * 2.2) * 0.45;
      this.nisse.position.y = t > 1.6 && t < 2.2 ? Math.sin(((t - 1.6) / 0.6) * Math.PI) * 0.18 : 0;
      rig.sack.scale.setScalar(1.6);
    } else if (t < FINALE.walkEnd) {
      const u = ease(clamp01((t - FINALE.walkStart) / (FINALE.walkEnd - FINALE.walkStart)));
      const p = this.nisseWalkPath.getPointAt(u);
      const ahead = this.nisseWalkPath.getPointAt(Math.min(1, u + 0.02));
      this.nisse.position.set(p.x, Math.abs(Math.sin(t * 9)) * 0.07, p.z);
      const dx = ahead.x - p.x;
      const dz = ahead.z - p.z;
      if (dx * dx + dz * dz > 1e-8) this.nisse.rotation.y = Math.atan2(dx, dz);
      this.nisse.rotation.z = Math.sin(t * 9) * 0.06;
      rig.sack.scale.setScalar(1.6);
      rig.armL.rotation.z = -1.35; // holder sækken
      rig.armR.rotation.x = Math.sin(t * 9) * 0.5; // svinger armen
    } else {
      this.nisse.position.copy(NISSE_DEST);
      this.nisse.rotation.y = Math.atan2(SACK_POS.x - NISSE_DEST.x, SACK_POS.z - NISSE_DEST.z);
      if (t < FINALE.sackDown) rig.armL.rotation.z = -1.35 + clamp01((t - FINALE.walkEnd) / 0.8) * 1.1;
    }

    // Sækken sættes ned og skrumper, efterhånden som gaverne flyver ud
    const sackOnGround = t >= FINALE.sackDown;
    rig.sack.visible = !sackOnGround;
    this.groundSack.visible = sackOnGround && t < FINALE.starEnd + 1.5;
    if (sackOnGround) {
      const left = 1 - clamp01((t - FINALE.giftsStart) / (FINALE.giftsEnd - FINALE.giftsStart));
      const wob = t > FINALE.giftsStart && t < FINALE.giftsEnd + 1 ? Math.sin(t * 14) * 0.06 : 0;
      const pop = t > FINALE.starEnd ? 1 - clamp01((t - FINALE.starEnd) / 1.5) : 1;
      const base = (0.65 + left * 0.75) * pop;
      this.groundSack.scale.set(base * (1 + wob), base * (1 - wob), base);
    }
    if (t >= FINALE.giftsStart && t < FINALE.giftsEnd + 0.5) {
      // Kaster gaver: armene skiftes
      rig.armR.rotation.x = -Math.max(0, Math.sin(t * 7)) * 2.2;
      rig.armL.rotation.x = -Math.max(0, Math.sin(t * 7 + Math.PI)) * 2.2;
    }
    if (t >= FINALE.starStart && t < FINALE.waveStart) {
      // Kigger op efter stjernen med armene i vejret
      this.nisse.rotation.x = -0.18;
      rig.armR.rotation.x = -2.6;
      rig.armL.rotation.x = -2.6;
    }
    if (t >= FINALE.waveStart) {
      // Vender sig mod kameraet og vinker
      const turn = clamp01((t - FINALE.waveStart) / 0.8);
      const from = Math.atan2(SACK_POS.x - NISSE_DEST.x, SACK_POS.z - NISSE_DEST.z);
      this.nisse.rotation.set(0, THREE.MathUtils.lerp(from, 0.5, ease(turn)), 0);
      rig.armR.rotation.set(0, 0, 0.25 + 2.3 + Math.sin(t * 10) * 0.35);
    }

    // --- Gaverne flyver ud af sækken og lander på bunken ---
    const n = f.toBoxes - f.fromBoxes;
    const sackTop = SACK_POS.clone().setY(0.6);
    const span = FINALE.giftsEnd - FINALE.giftsStart - FINALE.giftFlight;
    this.giftGroup.children.forEach((c, i) => {
      if (i < f.fromBoxes) return;
      const k = i - f.fromBoxes;
      const launch = FINALE.giftsStart + (n <= 1 ? 0 : (k / (n - 1)) * span);
      const u = (t - launch) / FINALE.giftFlight;
      const slot = this.slots[i];
      if (u <= 0) {
        c.visible = false;
        return;
      }
      c.visible = true;
      if (u >= 1) {
        c.position.copy(slot.pos);
        const settle = clamp01((u - 1) / 0.45);
        const squash = settle < 1 ? Math.sin(settle * Math.PI) * 0.18 : 0;
        c.scale.set(1 + squash, 1 - squash, 1 + squash);
        c.rotation.set(0, slot.rot, 0);
        return;
      }
      const dist = sackTop.distanceTo(slot.pos);
      c.position.lerpVectors(sackTop, slot.pos, u);
      c.position.y += Math.sin(u * Math.PI) * (1.1 + dist * 0.45);
      c.scale.setScalar(0.35 + 0.65 * u);
      c.rotation.set(u * Math.PI * 2, slot.rot + u * Math.PI * 3, u * Math.PI);
    });

    // --- Stjernen stiger op af sækken og spiraler op i toppen ---
    if (this.star) {
      this.star.visible = t >= FINALE.starStart;
      if (t >= FINALE.starStart && t < FINALE.starEnd) {
        const u = (t - FINALE.starStart) / (FINALE.starEnd - FINALE.starStart);
        const e = ease(u);
        const angle = Math.atan2(SACK_POS.x, SACK_POS.z) + e * Math.PI * 4.5;
        const radius = THREE.MathUtils.lerp(Math.hypot(SACK_POS.x, SACK_POS.z), 0, e) + Math.sin(u * Math.PI) * 0.6;
        this.star.position.set(Math.sin(angle) * radius, THREE.MathUtils.lerp(0.7, topY, e), Math.cos(angle) * radius + 0.02 * e);
        this.star.rotation.set(0, u * Math.PI * 8, Math.sin(u * Math.PI * 3) * 0.3);
        this.star.scale.setScalar(0.45 + 0.55 * e);
        this.emitTrail(this.star.position, 2);
      } else if (t >= FINALE.starEnd) {
        this.star.position.set(0, topY, 0.02);
        const s = t - FINALE.starEnd;
        this.star.scale.setScalar(1 + Math.sin(Math.min(s / 0.6, 1) * Math.PI) * 0.35);
        this.star.rotation.set(0, Math.sin(t * 0.8) * 0.3, 0);
        if (s < 0.3) this.emitTrail(this.star.position, 8, 2.4);
      }
    }

    // --- Lyset breder sig fra bunden til toppen af træet ---
    const lu = clamp01((t - FINALE.lightsStart) / (FINALE.lightsEnd - FINALE.lightsStart));
    this.sparkleProgress = lu;
    this.litAmount = lu;
    this.applyLit();

    // --- Kamera ---
    sampleCamera(t, this.camera.position, this.camTarget);
    this.camera.position.y = Math.max(0.4, this.camera.position.y);
    this.camera.lookAt(this.camTarget);

    this.updateTrail(dt);
    if (t >= FINALE.total) this.finishFinale();
  }

  /** Rolig finale: ingen kameraflyvning eller flyvende objekter – korte, trinvise skift. */
  private tickReducedFinale(t: number): void {
    const f = this.finale!;
    this.nisse.position.copy(NISSE_DEST);
    this.nisse.rotation.set(0, 0.5, 0);
    this.groundSack.visible = t > 0.6 && t < 4;
    this.groundSack.scale.setScalar(1);
    this.nisseRig.sack.visible = !this.groundSack.visible;
    const n = f.toBoxes - f.fromBoxes;
    const batch = t < 1.2 ? 0 : t < 2.4 ? 1 : t < 3.6 ? 2 : 3;
    const shown = Math.ceil((n * batch) / 3);
    this.giftGroup.children.forEach((c, i) => {
      c.position.copy(this.slots[i].pos);
      c.visible = i < f.fromBoxes || i - f.fromBoxes < shown;
    });
    if (this.star) {
      this.star.visible = t >= 4.2;
      this.star.position.set(0, TREE.baseY + TREE.height + 0.25, 0.02);
    }
    this.litAmount = clamp01((t - 5.2) / 1.2);
    this.sparkleProgress = this.litAmount;
    this.applyLit();
    this.nisseRig.armR.rotation.set(0, 0, t > 6.6 ? 2.4 : 0.25);
  }

  private trailLife: Float32Array;
  private trailVel: Float32Array;
  private trailNext = 0;

  private emitTrail(at: THREE.Vector3, count: number, speed = 0.4): void {
    const pos = this.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let k = 0; k < count; k++) {
      const i = this.trailNext;
      this.trailNext = (this.trailNext + 1) % this.trailLife.length;
      pos.setXYZ(i, at.x + (Math.random() - 0.5) * 0.15, at.y + (Math.random() - 0.5) * 0.15, at.z + (Math.random() - 0.5) * 0.15);
      this.trailVel[i * 3] = (Math.random() - 0.5) * speed;
      this.trailVel[i * 3 + 1] = (Math.random() - 0.3) * speed;
      this.trailVel[i * 3 + 2] = (Math.random() - 0.5) * speed;
      this.trailLife[i] = 1;
    }
    pos.needsUpdate = true;
  }

  private updateTrail(dt: number): void {
    const pos = this.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
    const col = this.trail.geometry.getAttribute('color') as THREE.BufferAttribute;
    let any = false;
    for (let i = 0; i < this.trailLife.length; i++) {
      if (this.trailLife[i] <= 0) {
        col.setXYZ(i, 0, 0, 0);
        continue;
      }
      any = true;
      this.trailLife[i] = Math.max(0, this.trailLife[i] - dt * 0.9);
      pos.setXYZ(i, pos.getX(i) + this.trailVel[i * 3] * dt, pos.getY(i) + this.trailVel[i * 3 + 1] * dt - dt * 0.15, pos.getZ(i) + this.trailVel[i * 3 + 2] * dt);
      const l = this.trailLife[i];
      col.setXYZ(i, l, 0.85 * l, 0.45 * l);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.trail.visible = any;
  }

  /** Gyldne glimt på træet: tændes nedefra og op (sparkleProgress) og blinker blidt. */
  private updateSparkles(now: number): void {
    const col = this.sparkles.geometry.getAttribute('color') as THREE.BufferAttribute;
    const p = this.sparkleProgress;
    const reduced = this.opts.reducedMotion;
    for (let i = 0; i < this.sparkleH.length; i++) {
      const on = clamp01((p * 1.15 - this.sparkleH[i]) / 0.12);
      const tw = reduced ? 1 : 0.65 + 0.35 * Math.sin(now * 3 + i * 2.3);
      const v = on * tw;
      col.setXYZ(i, v, v * 0.82, v * 0.45);
    }
    col.needsUpdate = true;
    this.sparkles.visible = p > 0;
  }

  private updateSanta(mode: WorldState['santa']): void {
    if (!mode) {
      if (this.santa) {
        this.disposeObject(this.santa.rig.group);
        this.santa = null;
      }
      return;
    }
    if (this.santa) return;
    const rig = buildSantaSleigh(this.mat);
    const arriving = mode === 'arrive' && !this.opts.reducedMotion;
    this.santa = { rig, t0: this.clock.getElapsed(), arriving };
    this.scene.add(rig.group);
    if (!arriving) this.parkSanta();
  }

  private parkSanta(): void {
    const g = this.santa!.rig.group;
    g.position.copy(SANTA_PARK);
    g.rotation.set(0, Math.atan2(-SANTA_HEADING.z, SANTA_HEADING.x), 0, 'YZX');
  }

  /** Julemanden flyver ind med glimtende spor, lander og vinker af og til. */
  private tickSanta(now: number, dt: number): boolean {
    const s = this.santa;
    if (!s) return false;
    const t = now - s.t0;
    const rig = s.rig;
    if (s.arriving) {
      const u = Math.min(1, t / SANTA_FLIGHT);
      // Langsommere til sidst, så landingen bliver blød
      const e = 1 - Math.pow(1 - u, 2.2);
      const p = SANTA_PATH.getPointAt(e);
      const ahead = SANTA_PATH.getPointAt(Math.min(1, e + 0.01));
      const dir = ahead.clone().sub(p);
      rig.group.position.copy(p);
      if (dir.lengthSq() > 1e-8) {
        const yaw = Math.atan2(-dir.z, dir.x);
        const pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
        rig.group.rotation.set(Math.sin(t * 1.3) * 0.12 * (1 - e), yaw, pitch * 0.7, 'YZX');
      }
      rig.reindeer.forEach((d, i) => {
        d.position.y = p.y > 0.3 ? Math.sin(t * 8 + i * 1.3) * 0.12 : 0;
      });
      if (p.y > 0.2) this.emitTrail(p.clone().addScaledVector(dir.normalize(), -0.8).setY(p.y + 0.3), 2, 0.25);
      if (u >= 1) {
        s.arriving = false;
        this.parkSanta();
        rig.reindeer.forEach((d) => (d.position.y = 0));
        for (let k = 0; k < 4; k++) this.emitTrail(SANTA_PARK.clone().setY(0.4), 8, 1.6);
      }
    } else if (!this.opts.reducedMotion) {
      // Vinker kort hvert ottende sekund; rensdyrene trækker vejret
      const w = (t % 8) / 8;
      rig.santaArm.rotation.set(w < 0.25 ? -2.4 + Math.sin(t * 10) * 0.35 : -0.4, 0, 0);
      rig.reindeer.forEach((d, i) => (d.position.y = Math.max(0, Math.sin(t * 1.5 + i)) * 0.02));
    }
    this.updateTrail(dt);
    return true;
  }

  private disposeObject(obj: THREE.Object3D): void {
    const geos = new Set<THREE.BufferGeometry>();
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) geos.add(m.geometry);
    });
    geos.forEach((g) => g.dispose());
    obj.parent?.remove(obj);
  }

  /** Chance for at en tilfældig besøgende er yetien (ellers et rensdyr). */
  static YETI_CHANCE = 0.1;
  /** Højst så mange besøgende ad gangen (knapperne kan trykkes ivrigt). */
  static MAX_VISITORS = 6;

  /**
   * Sender en besøgende forbi med det samme (knapperne i "Se mit træ").
   * Virker også ved reduceret bevægelse, fordi barnet selv har bedt om det.
   */
  sendVisitor(kind: VisitorKind): void {
    if (this.finale || this.disposed) return;
    this.spawnVisitor(kind, this.clock.getElapsed());
    this.updateRunning();
  }

  private spawnVisitor(kind: VisitorKind, now: number): void {
    if (this.visitors.length >= ThreeWorld.MAX_VISITORS) this.removeVisitor(this.visitors[0]);
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const obj = new THREE.Group();
    let rig: ReturnType<typeof buildYeti> | undefined;
    if (kind === 'reindeer') {
      const r = buildWorldItem(
        { day: 0, id: 'besoeg-rensdyr', name: '', description: '', placement: 'world', visual: 'reindeer', colors: ['#8b5a3c', '#e9d6b8'], position: [0, 0], position2D: [0, 0] },
        this.mat,
      );
      r.rotation.y = 0; // hovedet peger mod +x
      obj.add(r);
    } else {
      rig = buildYeti(this.mat);
      rig.group.rotation.y = Math.PI / 2; // går mod +x
      obj.add(rig.group);
    }
    obj.rotation.y = dir === 1 ? 0 : Math.PI;
    // Lidt forskellig dybde, så flere besøgende ikke går oven i hinanden
    const z = kind === 'yeti' ? -6.4 - Math.random() * 1.2 : -7.2 - Math.random() * 2;
    // Flere yetier ad gangen stopper forskellige steder
    const stopX = this.visibleStopX(z) + (this.visitors.filter((v) => v.kind === 'yeti').length % 3) * -2.3;
    const v: Visitor = { kind, obj, t0: now, dir, z, rig, stopX };
    this.visitors.push(v);
    this.scene.add(obj);
  }

  /** Finder et x på dybden z, der er tydeligt i billedet og ikke skjult bag træet eller hytten. */
  private visibleStopX(z: number): number {
    const tree = new THREE.Vector3(0, 1.5, 0).project(this.camera).x;
    const hut = HUT_POS.clone().setY(1).project(this.camera).x;
    let best = 3;
    let bestScore = Infinity;
    for (let x = -8; x <= 8; x += 0.25) {
      const p = new THREE.Vector3(x, 1.5, z).project(this.camera).x;
      if (Math.abs(p) > 0.7 || Math.abs(p - tree) < 0.35 || Math.abs(p - hut) < 0.3) continue;
      const score = Math.abs(p - 0.5); // helst lidt til højre for midten
      if (score < bestScore) {
        bestScore = score;
        best = x;
      }
    }
    return best;
  }

  private removeVisitor(v: Visitor): void {
    this.disposeObject(v.obj);
    this.visitors = this.visitors.filter((x) => x !== v);
  }

  /** Planlægger tilfældige besøg og bevæger alle besøgende. Ingen tilfældige besøg under finalen eller ved reduceret bevægelse. */
  private tickVisitors(now: number): boolean {
    if (this.visitors.length === 0) {
      if (this.finale || this.opts.reducedMotion || now < this.nextVisitorAt) return false;
      this.spawnVisitor(Math.random() < ThreeWorld.YETI_CHANCE ? 'yeti' : 'reindeer', now);
    }
    for (const v of [...this.visitors]) this.tickVisitor(v, now);
    if (this.visitors.length === 0) this.nextVisitorAt = now + 25 + Math.random() * 35;
    return true;
  }

  private tickVisitor(v: Visitor, now: number): void {
    const t = now - v.t0;
    const span = 15;
    if (v.kind === 'reindeer') {
      // Galopperer hen over sneen bag træet
      const u = t / 7;
      v.obj.position.set(v.dir * THREE.MathUtils.lerp(-span, span, u), Math.abs(Math.sin(t * 7)) * 0.35, v.z);
      v.obj.rotation.z = v.dir * Math.sin(t * 7) * 0.08;
      if (u >= 1) this.removeVisitor(v);
      return;
    }
    // Yetien tramper roligt forbi, stopper et synligt sted og vinker
    const walk1 = 7;
    const wave = 2.6;
    const walk2 = 7;
    const rig = v.rig!;
    let x: number;
    let walking = true;
    const stop = v.stopX * v.dir;
    if (t < walk1) x = THREE.MathUtils.lerp(-span, stop, t / walk1);
    else if (t < walk1 + wave) {
      x = stop;
      walking = false;
    } else x = THREE.MathUtils.lerp(stop, span, (t - walk1 - wave) / walk2);
    v.obj.position.set(v.dir * x, walking ? Math.abs(Math.sin(t * 4)) * 0.08 : 0, v.z);
    const swing = walking ? Math.sin(t * 4) * 0.5 : 0;
    rig.legL.rotation.x = swing;
    rig.legR.rotation.x = -swing;
    rig.armL.rotation.set(-swing * 0.8, 0, -0.2);
    if (walking) {
      rig.armR.rotation.set(swing * 0.8, 0, 0.2);
      rig.group.rotation.y = Math.PI / 2;
    } else {
      // Vender sig mod kameraet og vinker
      const k = Math.max(0, Math.min(1, (t - walk1) / 0.4, (walk1 + wave - t) / 0.4));
      const toCam = Math.atan2(this.camera.position.x - v.obj.position.x, this.camera.position.z - v.obj.position.z) - v.obj.rotation.y;
      rig.group.rotation.y = THREE.MathUtils.lerp(Math.PI / 2, toCam, k);
      rig.armR.rotation.set(0, 0, 0.2 + k * (2.6 + Math.sin(t * 9) * 0.35));
    }
    if (t >= walk1 + wave + walk2) this.removeVisitor(v);
  }

  private setCameraSpherical(theta: number, phi: number, radius: number): void {
    const v = new THREE.Vector3().setFromSpherical(new THREE.Spherical(radius, phi, theta));
    this.camera.position.copy(TARGET).add(v);
    this.camera.lookAt(TARGET);
  }

  /** Alternativ til touch-rotation: knapper. */
  rotate(deltaRad: number): void {
    const sph = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(TARGET));
    sph.theta += deltaRad;
    this.setCameraSpherical(sph.theta, sph.phi, sph.radius);
    this.controls.update();
    this.requestRender();
  }

  zoom(factor: number): void {
    const sph = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(TARGET));
    sph.radius = THREE.MathUtils.clamp(sph.radius * factor, this.controls.minDistance, this.controls.maxDistance);
    this.setCameraSpherical(sph.theta, sph.phi, sph.radius);
    this.controls.update();
    this.requestRender();
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Smalle portrætvisninger: træk kameraet lidt tilbage via FOV
    this.camera.fov = w / h < 0.8 ? 55 : 42;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  private needsRender = true;
  private requestRender(): void {
    this.needsRender = true;
    if (!this.running && !this.disposed) this.renderOnce();
  }

  private renderOnce(): void {
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);
    this.needsRender = false;
  }

  private onVisibility = () => {
    this.visible = document.visibilityState === 'visible';
    this.updateRunning();
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.stop();
    this.opts.onContextLost();
  };

  private updateRunning(): void {
    const should = this.visible && this.inView && !this.disposed;
    if (should && !this.running) {
      this.running = true;
      this.clock.update();
      this.raf = requestAnimationFrame(this.loop);
    } else if (!should) this.stop();
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private loop = () => {
    if (!this.running) return;
    this.clock.update();
    const dt = Math.min(0.05, this.clock.getDelta());
    const now = this.clock.getElapsed();
    const reduced = this.opts.reducedMotion;
    let animating = false;

    if (this.finale) {
      this.tickFinale(now, dt);
      animating = true;
    }
    if (this.tickVisitors(now)) animating = true;
    if (this.tickSanta(now, dt) && !this.opts.reducedMotion) animating = true;
    if (this.sparkleProgress > 0 && !this.finale) {
      this.updateSparkles(now);
      if (!reduced) animating = true;
    } else if (this.finale) this.updateSparkles(now);
    if (this.snow && !reduced) {
      const p = this.snow.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * (0.5 + (i % 5) * 0.08);
        if (y < 0) y = 12;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(now * 0.6 + i) * dt * 0.08);
      }
      p.needsUpdate = true;
      animating = true;
    }
    if (!reduced && this.bulbs.length) {
      this.bulbs.forEach((b, i) => {
        const m = b.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = 0.6 + this.litAmount * 1.6 + Math.sin(now * 2 + i * 1.7) * 0.25;
      });
    }
    if (this.star && this.star.visible && !this.finale && !reduced) {
      this.star.rotation.y = Math.sin(now * 0.8) * 0.3;
    }
    if (!this.finale && !this.opts.interactive && !reduced) {
      // Rolig vuggen i hjemmevisningen
      this.idleAz = Math.sin(now * 0.12) * 0.2 + 0.05;
      this.setCameraSpherical(this.idleAz, 1.18, 10.5);
      animating = true;
    }
    if (this.opts.interactive && this.controls.enableDamping) this.controls.update();

    if (animating || this.needsRender || this.opts.interactive) this.renderOnce();
    this.raf = requestAnimationFrame(this.loop);
  };

  private disposeGroup(g: THREE.Object3D, removeSelf: boolean): void {
    const geos = new Set<THREE.BufferGeometry>();
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && m.geometry !== this.giftBoxGeo) geos.add(m.geometry);
    });
    geos.forEach((x) => x.dispose());
    if (removeSelf) g.parent?.remove(g);
    else g.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.resizeObs.disconnect();
    this.interObs?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (import.meta.env.DEV) window.removeEventListener('julekalender:visitor', this.onDevVisitor);
    for (const v of [...this.visitors]) this.removeVisitor(v);
    if (this.santa) this.disposeObject(this.santa.rig.group);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.controls.dispose();
    this.disposeGroup(this.scene, false);
    this.giftBoxGeo.dispose();
    if (this.snow) (this.snow.material as THREE.Material).dispose();
    (this.sparkles.material as THREE.Material).dispose();
    (this.trail.material as THREE.Material).dispose();
    this.mat.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
