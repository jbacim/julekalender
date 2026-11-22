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
  giftSlots,
  treePoint,
} from './builders';

export interface WorldState {
  rewards: RewardDefinition[];
  gifts: number;
  lit: boolean;
}

export interface WorldOptions {
  quality: QualityTier;
  reducedMotion: boolean;
  interactive: boolean;
  onContextLost: () => void;
}

const HUT_POS = new THREE.Vector3(-3.6, 0, -1.85);
const TARGET = new THREE.Vector3(0, 1.55, 0);

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
  private finale: { t0: number; fromGifts: number; done: () => void; startAz: number; startPolar: number; startDist: number } | null = null;
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
    this.setCameraSpherical(0.35, 1.18, 10);

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
    this.nisse = n.group;
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
    for (const [x, z, s] of [[4.5, -4, 1.6], [-5.5, 2.5, 1.2], [6, 3.5, 1.4], [-1.5, -5, 1.8], [2.5, 5.5, 1]] as const) {
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
    const door = new THREE.Vector3(0.9, 0, 1.15).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.45).add(HUT_POS);
    this.nisse.position.copy(door);
    this.nisse.rotation.y = 0.7;
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
    const sameRewards = prev.rewards.map((r) => r.id).join() === state.rewards.map((r) => r.id).join();
    if (!sameRewards || this.decorGroup.children.length === 0) this.rebuildDecorations();
    if (!this.finale) {
      this.setGiftBoxes(boxesForGifts(state.gifts, this.slots.length), 1);
      this.litAmount = state.lit ? 1 : 0;
      this.applyLit();
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
   * Afspiller finalen: nissen afleverer gaver, stjernen placeres, træet lyser op og kameraet
   * præsenterer træet. Belønningerne er gemt FØR dette kaldes; afbrydelse mister intet.
   */
  playFinale(fromGifts: number, done: () => void): void {
    this.setInteractive(false);
    this.setGiftBoxes(boxesForGifts(fromGifts, this.slots.length), 1);
    this.litAmount = 0;
    this.applyLit();
    if (this.star) this.star.visible = false;
    const sph = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(TARGET));
    this.finale = { t0: this.clock.getElapsed(), fromGifts, done, startAz: sph.theta, startPolar: sph.phi, startDist: sph.radius };
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
    this.giftGroup.children.forEach((c) => c.scale.setScalar(1));
    if (this.star) {
      this.star.visible = true;
      this.star.position.y = TREE.baseY + TREE.height + 0.25;
    }
    this.litAmount = 1;
    this.applyLit();
    this.placeNisseNearTree(1);
    if (!this.opts.reducedMotion) this.setCameraSpherical(0.0, 1.2, 9);
    this.controls.update();
    this.requestRender();
    f.done();
  }

  private placeNisseNearTree(t: number): void {
    const home = new THREE.Vector3(0.9, 0, 1.15).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.45).add(HUT_POS);
    const dest = new THREE.Vector3(-1.2, 0, 2.6);
    this.nisse.position.lerpVectors(home, dest, t);
    this.nisse.position.y = Math.abs(Math.sin(t * Math.PI * 8)) * 0.06 * (t < 1 ? 1 : 0);
    this.nisse.lookAt(t < 1 ? dest.x : 0, 0, t < 1 ? dest.z : 9);
  }

  private tickFinale(now: number): void {
    const f = this.finale!;
    const t = now - f.t0;
    const reduced = this.opts.reducedMotion;
    const total = reduced ? 3.2 : 8.5;
    const target = boxesForGifts(this.state.gifts, this.slots.length);
    const fromBoxes = boxesForGifts(f.fromGifts, this.slots.length);

    if (reduced) {
      // Rolig version uden kameraflyvning og kraftige effekter: trinvise skift med korte fades.
      this.placeNisseNearTree(1);
      const giftsT = clamp01((t - 0.3) / 0.8);
      this.setGiftBoxes(Math.round(fromBoxes + (target - fromBoxes) * giftsT), 1);
      if (this.star) {
        this.star.visible = t > 1.4;
      }
      this.litAmount = clamp01((t - 1.8) / 0.8);
      this.applyLit();
    } else {
      // 0–2.4 s: nissen går med sækken
      this.placeNisseNearTree(ease(clamp01(t / 2.4)));
      // 2.2–4.4 s: gaverne popper frem
      const giftsT = clamp01((t - 2.2) / 2.2);
      const shown = Math.round(fromBoxes + (target - fromBoxes) * giftsT);
      this.setGiftBoxes(shown, 0.01);
      this.giftGroup.children.forEach((c, i) => {
        if (i < fromBoxes) {
          c.scale.setScalar(1);
          return;
        }
        const s = c.scale.x;
        c.scale.setScalar(Math.min(1, s + 0.12 + (1 - s) * 0.15));
      });
      // 4.4–5.8 s: stjernen daler ned og drejer
      if (this.star) {
        const st = clamp01((t - 4.4) / 1.4);
        this.star.visible = t > 4.4;
        const topY = TREE.baseY + TREE.height + 0.25;
        this.star.position.y = topY + (1 - ease(st)) * 2.5;
        this.star.rotation.y = (1 - st) * Math.PI * 4;
      }
      // 5.8–7.0 s: træet lyser op
      this.litAmount = clamp01((t - 5.8) / 1.2);
      this.applyLit();
      // Kamera: blød bue rundt om træet, ender forfra
      const ct = ease(clamp01(t / total));
      const az = THREE.MathUtils.lerp(f.startAz, Math.PI * 2, ct);
      const polar = THREE.MathUtils.lerp(f.startPolar, 1.2, ct) - Math.sin(ct * Math.PI) * 0.25;
      const dist = THREE.MathUtils.lerp(f.startDist, 9, ct) - Math.sin(ct * Math.PI) * 1.5;
      this.setCameraSpherical(az, polar, dist);
    }
    if (t >= total) this.finishFinale();
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
      this.tickFinale(now);
      animating = true;
    }
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
      this.idleAz = Math.sin(now * 0.12) * 0.35 + 0.3;
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
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.controls.dispose();
    this.disposeGroup(this.scene, false);
    this.giftBoxGeo.dispose();
    if (this.snow) (this.snow.material as THREE.Material).dispose();
    this.mat.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
