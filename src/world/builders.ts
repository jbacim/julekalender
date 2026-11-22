import * as THREE from 'three';
import type { DecorationVisual, RewardDefinition } from '../domain/types';

/** Fælles materialecache, så samme farve kun oprettes én gang (frigives ved dispose). */
export class Materials {
  private cache = new Map<string, THREE.Material>();
  constructor(private cheap: boolean) {}

  get(color: string, opts: { emissive?: string; emissiveIntensity?: number; roughness?: number; metalness?: number; transparent?: number } = {}): THREE.Material {
    const key = JSON.stringify([color, opts]);
    let m = this.cache.get(key);
    if (!m) {
      if (this.cheap) {
        m = new THREE.MeshLambertMaterial({
          color,
          emissive: opts.emissive ?? '#000000',
          emissiveIntensity: opts.emissiveIntensity ?? 1,
          transparent: opts.transparent !== undefined,
          opacity: opts.transparent ?? 1,
        });
      } else {
        m = new THREE.MeshStandardMaterial({
          color,
          roughness: opts.roughness ?? 0.7,
          metalness: opts.metalness ?? 0,
          emissive: opts.emissive ?? '#000000',
          emissiveIntensity: opts.emissiveIntensity ?? 1,
          flatShading: false,
          transparent: opts.transparent !== undefined,
          opacity: opts.transparent ?? 1,
        });
      }
      this.cache.set(key, m);
    }
    return m;
  }

  /** Unikt (ikke-delt) materiale, fx til animerede lys. */
  unique(color: string, emissive: string, intensity: number): THREE.MeshStandardMaterial | THREE.MeshLambertMaterial {
    const m = this.cheap
      ? new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: intensity })
      : new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.4 });
    this.cache.set(`unique-${this.cache.size}`, m);
    return m;
  }

  dispose(): void {
    for (const m of this.cache.values()) m.dispose();
    this.cache.clear();
  }
}

export const TREE = {
  baseY: 0.35,
  height: 3.4,
  baseRadius: 1.55,
};

export function treeRadiusAt(h: number): number {
  return TREE.baseRadius * (1 - h) * 0.95 + 0.08;
}

export function treePoint(angleDeg: number, h: number, outward = 1): THREE.Vector3 {
  const a = (angleDeg * Math.PI) / 180;
  const r = treeRadiusAt(h) * outward;
  return new THREE.Vector3(Math.sin(a) * r, TREE.baseY + h * TREE.height, Math.cos(a) * r);
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, cast = false): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  return m;
}

export function buildTree(mat: Materials): THREE.Group {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.6, 10), mat.get('#6b4226'), true);
  trunk.position.y = 0.3;
  g.add(trunk);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers;
    const h = TREE.height / tiers + 0.45;
    const r = treeRadiusAt(t0) * 1.08;
    const cone = mesh(new THREE.ConeGeometry(r, h, 16, 1), mat.get(i % 2 ? '#2f7a4c' : '#2a6d44', { roughness: 0.9 }), true);
    cone.position.y = TREE.baseY + t0 * TREE.height + h / 2 - 0.1;
    cone.rotation.y = i * 0.4;
    g.add(cone);
    // lidt sne på kanten
    const snow = mesh(new THREE.TorusGeometry(r * 0.9, 0.05, 6, 20), mat.get('#f5f9ff'), false);
    snow.rotation.x = Math.PI / 2;
    snow.position.y = TREE.baseY + t0 * TREE.height + 0.02;
    snow.scale.set(1, 1, 0.6);
    g.add(snow);
  }
  return g;
}

function starShape(outer: number, inner: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

export function buildStar(mat: Materials, color: string): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(starShape(0.34, 0.15), { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
  geo.center();
  const star = mesh(geo, mat.get(color, { emissive: '#ffcc33', emissiveIntensity: 0.9, metalness: 0.4, roughness: 0.3 }));
  g.add(star);
  const light = new THREE.PointLight('#ffe28a', 2.5, 6, 1.5);
  g.add(light);
  return g;
}

function heartShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, -0.12);
  s.bezierCurveTo(-0.16, 0, -0.12, 0.14, 0, 0.06);
  s.bezierCurveTo(0.12, 0.14, 0.16, 0, 0, -0.12);
  return s;
}

/** Bygger en lille træpynt. Origo er ophængningspunktet. */
export function buildOrnament(r: RewardDefinition, mat: Materials): THREE.Object3D {
  const [c1, c2] = r.colors;
  const g = new THREE.Group();
  const v: DecorationVisual = r.visual;
  switch (v) {
    case 'ball': {
      const b = mesh(new THREE.SphereGeometry(0.11, 16, 12), mat.get(c1, { metalness: 0.5, roughness: 0.2 }));
      const cap = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), mat.get('#d9c37a', { metalness: 0.7, roughness: 0.3 }));
      cap.position.y = 0.11;
      g.add(b, cap);
      break;
    }
    case 'candyCane': {
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.18, 0),
        new THREE.Vector3(0, 0.06, 0),
        new THREE.Vector3(0.03, 0.12, 0),
        new THREE.Vector3(0.09, 0.13, 0),
        new THREE.Vector3(0.12, 0.08, 0),
      ]);
      g.add(mesh(new THREE.TubeGeometry(path, 16, 0.025, 6), mat.get(c1)));
      for (let i = 0; i < 4; i++) {
        const ring = mesh(new THREE.TorusGeometry(0.027, 0.01, 4, 8), mat.get(c2));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.15 + i * 0.06;
        g.add(ring);
      }
      break;
    }
    case 'heart': {
      const geo = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.03, bevelEnabled: false });
      geo.center();
      const h = mesh(geo, mat.get(c1));
      h.scale.setScalar(1.3);
      g.add(h);
      const stripe = mesh(new THREE.BoxGeometry(0.03, 0.2, 0.045), mat.get(c2));
      stripe.rotation.z = 0.6;
      g.add(stripe);
      break;
    }
    case 'pinecone': {
      const c = mesh(new THREE.SphereGeometry(0.08, 8, 8), mat.get(c1, { roughness: 1 }));
      c.scale.set(1, 1.6, 1);
      const snow = mesh(new THREE.SphereGeometry(0.05, 8, 6), mat.get(c2));
      snow.position.y = 0.11;
      snow.scale.set(1.2, 0.5, 1.2);
      g.add(c, snow);
      break;
    }
    case 'bell': {
      const pts = [
        new THREE.Vector2(0.0, 0.1),
        new THREE.Vector2(0.04, 0.09),
        new THREE.Vector2(0.06, 0.02),
        new THREE.Vector2(0.08, -0.06),
        new THREE.Vector2(0.11, -0.09),
        new THREE.Vector2(0.0, -0.09),
      ];
      g.add(mesh(new THREE.LatheGeometry(pts, 16), mat.get(c1, { metalness: 0.7, roughness: 0.25 })));
      const clapper = mesh(new THREE.SphereGeometry(0.03, 8, 6), mat.get(c2));
      clapper.position.y = -0.1;
      g.add(clapper);
      break;
    }
    case 'icicle': {
      const ic = mesh(new THREE.ConeGeometry(0.04, 0.3, 6), mat.get(c1, { transparent: 0.85, roughness: 0.1 }));
      ic.rotation.x = Math.PI;
      ic.position.y = -0.1;
      g.add(ic);
      break;
    }
    case 'drum': {
      const d = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 14), mat.get(c1));
      d.rotation.x = Math.PI / 2;
      const rim1 = mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 16), mat.get(c2, { metalness: 0.6 }));
      rim1.position.z = 0.06;
      const rim2 = rim1.clone();
      rim2.position.z = -0.06;
      g.add(d, rim1, rim2);
      break;
    }
    case 'gingerbread': {
      const body = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.025, 12), mat.get(c1));
      body.rotation.x = Math.PI / 2;
      body.scale.set(1, 1, 1.5);
      const head = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 12), mat.get(c1));
      head.rotation.x = Math.PI / 2;
      head.position.y = 0.12;
      const arms = mesh(new THREE.BoxGeometry(0.24, 0.045, 0.025), mat.get(c1));
      arms.position.y = 0.04;
      const icing = mesh(new THREE.BoxGeometry(0.2, 0.01, 0.03), mat.get(c2));
      icing.position.y = 0.04;
      g.add(body, head, arms, icing);
      break;
    }
    case 'bird': {
      const body = mesh(new THREE.SphereGeometry(0.08, 12, 10), mat.get(c1));
      body.scale.set(1.3, 1, 1);
      const breast = mesh(new THREE.SphereGeometry(0.06, 10, 8), mat.get(c2));
      breast.position.set(0.05, -0.01, 0.03);
      const head = mesh(new THREE.SphereGeometry(0.05, 10, 8), mat.get(c1));
      head.position.set(0.09, 0.05, 0);
      const beak = mesh(new THREE.ConeGeometry(0.015, 0.05, 6), mat.get('#e8a33a'));
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(0.15, 0.05, 0);
      g.add(body, breast, head, beak);
      break;
    }
    case 'snowflake': {
      for (let i = 0; i < 3; i++) {
        const bar = mesh(new THREE.BoxGeometry(0.28, 0.02, 0.02), mat.get(c1, { emissive: c2, emissiveIntensity: 0.3 }));
        bar.rotation.z = (i * Math.PI) / 3;
        g.add(bar);
      }
      break;
    }
    case 'angel': {
      const dress = mesh(new THREE.ConeGeometry(0.08, 0.2, 12), mat.get(c1));
      const head = mesh(new THREE.SphereGeometry(0.045, 10, 8), mat.get('#f3c6a5'));
      head.position.y = 0.13;
      const halo = mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16), mat.get(c2, { emissive: c2, emissiveIntensity: 0.6 }));
      halo.position.y = 0.19;
      halo.rotation.x = Math.PI / 2;
      const wingGeo = new THREE.SphereGeometry(0.07, 8, 6);
      const w1 = mesh(wingGeo, mat.get(c2));
      w1.scale.set(1, 0.6, 0.2);
      w1.position.set(-0.08, 0.06, -0.03);
      const w2 = w1.clone();
      w2.position.x = 0.08;
      g.add(dress, head, halo, w1, w2);
      break;
    }
    case 'cone': {
      const c = mesh(new THREE.ConeGeometry(0.07, 0.22, 12, 1, true), mat.get(c1));
      c.rotation.x = Math.PI;
      const handle = mesh(new THREE.TorusGeometry(0.05, 0.008, 4, 12, Math.PI), mat.get(c2));
      handle.position.y = 0.11;
      g.add(c, handle);
      break;
    }
    case 'star':
      return buildStar(mat, c1);
    default:
      break;
  }
  return g;
}

/** Spiralformede guirlander (flag og lyskæde). Returnerer også de enkelte lys til animation. */
export function buildGarland(r: RewardDefinition, mat: Materials): { obj: THREE.Group; bulbs: THREE.Mesh[] } {
  const g = new THREE.Group();
  const bulbs: THREE.Mesh[] = [];
  const isLights = r.visual === 'lightString';
  const turns = isLights ? 3.2 : 2.4;
  const count = isLights ? 46 : 34;
  const offset = isLights ? 0.4 : 0;
  const flagGeo = new THREE.BoxGeometry(0.1, 0.07, 0.01);
  const bulbGeo = new THREE.SphereGeometry(0.035, 8, 6);
  const crossGeo = new THREE.BoxGeometry(0.1, 0.014, 0.012);
  const crossGeoV = new THREE.BoxGeometry(0.014, 0.07, 0.012);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const h = 0.06 + t * 0.82;
    const angle = (t * turns + offset) * 360;
    const p = treePoint(angle, h, 1.0);
    if (isLights) {
      const m = mat.unique(i % 3 === 0 ? '#ffb070' : '#ffe0a0', i % 3 === 0 ? '#ff8a3a' : '#ffcf6a', 0.9);
      const b = new THREE.Mesh(bulbGeo, m);
      b.position.copy(p);
      g.add(b);
      bulbs.push(b);
    } else {
      const f = new THREE.Group();
      f.add(new THREE.Mesh(flagGeo, mat.get(r.colors[0])));
      const c1 = new THREE.Mesh(crossGeo, mat.get(r.colors[1]));
      c1.position.z = 0.002;
      const c2 = new THREE.Mesh(crossGeoV, mat.get(r.colors[1]));
      c2.position.set(-0.015, 0, 0.002);
      f.add(c1, c2);
      f.position.copy(p);
      f.lookAt(p.x * 2, p.y, p.z * 2);
      g.add(f);
    }
  }
  return { obj: g, bulbs };
}

/** Selvstændige dekorationer i verdenen. */
export function buildWorldItem(r: RewardDefinition, mat: Materials): THREE.Object3D {
  const [c1, c2] = r.colors;
  const g = new THREE.Group();
  switch (r.visual) {
    case 'lantern': {
      const frame = mat.get(c1, { metalness: 0.5, roughness: 0.4 });
      const base = mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), frame, true);
      const top = mesh(new THREE.ConeGeometry(0.22, 0.14, 4), frame, true);
      top.position.y = 0.45;
      top.rotation.y = Math.PI / 4;
      const glass = mesh(new THREE.BoxGeometry(0.24, 0.36, 0.24), mat.get(c2, { emissive: c2, emissiveIntensity: 1.2, transparent: 0.85 }));
      glass.position.y = 0.21;
      const light = new THREE.PointLight('#ffc76a', 1.4, 3.5, 1.5);
      light.position.y = 0.3;
      g.add(base, glass, top, light);
      break;
    }
    case 'snowman': {
      const snow = mat.get(c1, { roughness: 1 });
      const b1 = mesh(new THREE.SphereGeometry(0.42, 18, 14), snow, true);
      b1.position.y = 0.38;
      const b2 = mesh(new THREE.SphereGeometry(0.3, 18, 14), snow, true);
      b2.position.y = 0.95;
      const b3 = mesh(new THREE.SphereGeometry(0.22, 16, 12), snow, true);
      b3.position.y = 1.38;
      const nose = mesh(new THREE.ConeGeometry(0.04, 0.2, 8), mat.get(c2));
      nose.rotation.x = Math.PI / 2;
      nose.position.set(0, 1.38, 0.28);
      const eyeGeo = new THREE.SphereGeometry(0.025, 6, 6);
      const black = mat.get('#1d1d24');
      const e1 = mesh(eyeGeo, black);
      e1.position.set(-0.07, 1.45, 0.19);
      const e2 = mesh(eyeGeo, black);
      e2.position.set(0.07, 1.45, 0.19);
      const scarf = mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 18), mat.get('#c8283c'));
      scarf.rotation.x = Math.PI / 2;
      scarf.position.y = 1.2;
      const hat = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 14), black, true);
      hat.position.y = 1.66;
      const brim = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 14), black);
      brim.position.y = 1.56;
      g.add(b1, b2, b3, nose, e1, e2, scarf, hat, brim);
      break;
    }
    case 'sled': {
      const wood = mat.get(c1);
      const seat = mesh(new THREE.BoxGeometry(0.9, 0.12, 0.45), wood, true);
      seat.position.y = 0.3;
      const back = mesh(new THREE.BoxGeometry(0.1, 0.3, 0.45), wood, true);
      back.position.set(-0.4, 0.45, 0);
      const runnerMat = mat.get(c2, { metalness: 0.6, roughness: 0.3 });
      for (const z of [-0.2, 0.2]) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.5, 0.05, z),
          new THREE.Vector3(0.45, 0.05, z),
          new THREE.Vector3(0.6, 0.15, z),
          new THREE.Vector3(0.55, 0.3, z),
        ]);
        g.add(mesh(new THREE.TubeGeometry(curve, 12, 0.025, 6), runnerMat));
        for (const x of [-0.3, 0.25]) {
          const post = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), runnerMat);
          post.position.set(x, 0.16, z);
          g.add(post);
        }
      }
      g.add(seat, back);
      g.rotation.y = 0.6;
      break;
    }
    case 'wreath': {
      const w = mesh(new THREE.TorusGeometry(0.17, 0.06, 8, 20), mat.get(c1, { roughness: 1 }));
      const bow = mesh(new THREE.SphereGeometry(0.05, 8, 6), mat.get(c2));
      bow.position.y = -0.17;
      bow.scale.set(1.6, 1, 0.6);
      for (let i = 0; i < 6; i++) {
        const berry = mesh(new THREE.SphereGeometry(0.022, 6, 6), mat.get('#c8283c'));
        const a = (i / 6) * Math.PI * 2;
        berry.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.05);
        g.add(berry);
      }
      g.add(w, bow);
      break;
    }
    case 'reindeer': {
      const fur = mat.get(c1);
      const body = mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 12), fur, true);
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.72;
      const belly = mesh(new THREE.SphereGeometry(0.18, 10, 8), mat.get(c2));
      belly.scale.set(1.8, 0.8, 1);
      belly.position.y = 0.62;
      const neck = mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.4, 8), fur, true);
      neck.position.set(0.42, 0.98, 0);
      neck.rotation.z = -0.5;
      const head = mesh(new THREE.SphereGeometry(0.14, 12, 10), fur, true);
      head.scale.set(1.4, 1, 1);
      head.position.set(0.58, 1.18, 0);
      const nose = mesh(new THREE.SphereGeometry(0.045, 8, 6), mat.get('#e3343f', { emissive: '#e3343f', emissiveIntensity: 0.5 }));
      nose.position.set(0.77, 1.17, 0);
      const antler = mat.get('#6b4428');
      for (const z of [-0.07, 0.07]) {
        const a = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.32, 5), antler);
        a.position.set(0.52, 1.38, z);
        a.rotation.x = z > 0 ? 0.4 : -0.4;
        const tine = mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.14, 5), antler);
        tine.position.set(0.58, 1.42, z * 1.8);
        tine.rotation.z = -0.8;
        g.add(a, tine);
      }
      const legGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.55, 6);
      for (const [x, z] of [[-0.3, -0.12], [-0.3, 0.12], [0.3, -0.12], [0.3, 0.12]] as const) {
        const leg = mesh(legGeo, fur, true);
        leg.position.set(x, 0.3, z);
        g.add(leg);
      }
      g.add(body, belly, neck, head, nose);
      g.rotation.y = -2.2;
      break;
    }
    case 'birdFeeder': {
      const wood = mat.get(c1);
      const pole = mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.2, 8), wood, true);
      pole.position.y = 0.6;
      const tray = mesh(new THREE.BoxGeometry(0.5, 0.04, 0.4), wood, true);
      tray.position.y = 1.2;
      const roof1 = mesh(new THREE.BoxGeometry(0.56, 0.03, 0.3), mat.get('#7c4f2c'), true);
      roof1.position.set(0, 1.45, 0.11);
      roof1.rotation.x = -0.6;
      const roof2 = roof1.clone();
      roof2.position.z = -0.11;
      roof2.rotation.x = 0.6;
      const snow = mesh(new THREE.BoxGeometry(0.58, 0.03, 0.08), mat.get(c2));
      snow.position.y = 1.54;
      const bird = mesh(new THREE.SphereGeometry(0.05, 8, 6), mat.get('#3d6db3'));
      bird.position.set(0.12, 1.27, 0.05);
      const birdB = mesh(new THREE.SphereGeometry(0.035, 8, 6), mat.get('#f2c94c'));
      birdB.position.set(0.15, 1.26, 0.08);
      g.add(pole, tray, roof1, roof2, snow, bird, birdB);
      break;
    }
    case 'porridge': {
      const bowl = mesh(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat.get(c1));
      bowl.position.y = 0.16;
      const grød = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), mat.get(c2));
      grød.position.y = 0.15;
      const butter = mesh(new THREE.BoxGeometry(0.05, 0.03, 0.05), mat.get('#f6c84a', { emissive: '#f6c84a', emissiveIntensity: 0.2 }));
      butter.position.y = 0.17;
      const spoon = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 4), mat.get('#c9c9d1', { metalness: 0.8, roughness: 0.2 }));
      spoon.position.set(0.06, 0.24, 0);
      spoon.rotation.z = -0.6;
      g.add(bowl, grød, butter, spoon);
      break;
    }
    case 'lampPost': {
      const iron = mat.get(c1, { metalness: 0.5, roughness: 0.5 });
      const pole = mesh(new THREE.CylinderGeometry(0.04, 0.07, 2.0, 8), iron, true);
      pole.position.y = 1.0;
      const lamp = mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.3, 6), mat.get(c2, { emissive: c2, emissiveIntensity: 1.3, transparent: 0.9 }));
      lamp.position.y = 2.15;
      const cap = mesh(new THREE.ConeGeometry(0.22, 0.16, 6), iron, true);
      cap.position.y = 2.38;
      const light = new THREE.PointLight('#ffd68a', 2, 5, 1.4);
      light.position.y = 2.1;
      g.add(pole, lamp, cap, light);
      break;
    }
    default:
      break;
  }
  return g;
}

export function buildHut(mat: Materials): { group: THREE.Group; door: THREE.Vector3; windowMat: THREE.Material } {
  const g = new THREE.Group();
  const wood = mat.get('#8b5a35', { roughness: 0.95 });
  const walls = mesh(new THREE.BoxGeometry(2.0, 1.4, 1.6), wood, true);
  walls.position.y = 0.7;
  walls.receiveShadow = true;
  // Sadeltag: trekant ekstruderet langs hyttens bredde (rygning langs x-aksen)
  const prism = (halfDepth: number, height: number, length: number) => {
    const s = new THREE.Shape();
    s.moveTo(-halfDepth, 0);
    s.lineTo(halfDepth, 0);
    s.lineTo(0, height);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
    geo.translate(0, 0, -length / 2);
    geo.rotateY(Math.PI / 2);
    return geo;
  };
  const roof = mesh(prism(1.0, 0.85, 2.3), mat.get('#6b3f26'), true);
  roof.position.y = 1.4;
  const snowRoof = mesh(prism(0.96, 0.82, 2.38), mat.get('#f6faff'), false);
  snowRoof.position.y = 1.52;
  const door = mesh(new THREE.BoxGeometry(0.5, 0.85, 0.06), mat.get('#5a341e'));
  door.position.set(0, 0.43, 0.81);
  const knob = mesh(new THREE.SphereGeometry(0.03, 6, 6), mat.get('#e3b23c', { metalness: 0.8 }));
  knob.position.set(0.15, 0.43, 0.85);
  const windowMat = mat.get('#ffd27a', { emissive: '#ffb347', emissiveIntensity: 1.2 });
  const win = mesh(new THREE.BoxGeometry(0.4, 0.36, 0.05), windowMat);
  win.position.set(0.62, 0.8, 0.81);
  const win2 = mesh(new THREE.BoxGeometry(0.05, 0.36, 0.4), windowMat);
  win2.position.set(1.01, 0.8, 0.2);
  const chimney = mesh(new THREE.BoxGeometry(0.28, 0.6, 0.28), mat.get('#7b4a2c'), true);
  chimney.position.set(-0.5, 2.1, -0.3);
  const glow = new THREE.PointLight('#ffb347', 1.8, 4, 1.4);
  glow.position.set(0.62, 0.8, 1.3);
  g.add(walls, roof, snowRoof, door, knob, win, win2, chimney, glow);
  return { group: g, door: new THREE.Vector3(0, 0, 1.2), windowMat };
}

export function buildNisse(mat: Materials): { group: THREE.Group; sack: THREE.Object3D } {
  const g = new THREE.Group();
  const body = mesh(new THREE.ConeGeometry(0.22, 0.5, 12), mat.get('#9aa6bd'), true);
  body.position.y = 0.35;
  const belt = mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.05, 12), mat.get('#5a4630'));
  belt.position.y = 0.3;
  const head = mesh(new THREE.SphereGeometry(0.14, 14, 12), mat.get('#f3c6a5'), true);
  head.position.y = 0.7;
  const beard = mesh(new THREE.SphereGeometry(0.13, 12, 10, 0, Math.PI * 2, Math.PI / 2.2, Math.PI / 2), mat.get('#fbfbfb'));
  beard.position.set(0, 0.68, 0.03);
  const nose = mesh(new THREE.SphereGeometry(0.04, 8, 6), mat.get('#e98b7a'));
  nose.position.set(0, 0.7, 0.14);
  const hat = mesh(new THREE.ConeGeometry(0.15, 0.42, 12), mat.get('#d52b3a'), true);
  hat.position.set(0, 0.98, -0.02);
  hat.rotation.x = -0.35;
  const brim = mesh(new THREE.TorusGeometry(0.13, 0.035, 6, 16), mat.get('#f6f2ea'));
  brim.rotation.x = Math.PI / 2;
  brim.position.y = 0.8;
  const pom = mesh(new THREE.SphereGeometry(0.05, 8, 6), mat.get('#f6f2ea'));
  pom.position.set(0, 1.15, -0.12);
  const eyeGeo = new THREE.SphereGeometry(0.018, 6, 6);
  const e1 = mesh(eyeGeo, mat.get('#2a1d18'));
  e1.position.set(-0.05, 0.75, 0.125);
  const e2 = e1.clone();
  e2.position.x = 0.05;
  const sack = new THREE.Group();
  const s = mesh(new THREE.SphereGeometry(0.2, 12, 10), mat.get('#a77a4a'), true);
  s.scale.set(1, 1.15, 1);
  sack.add(s);
  sack.position.set(-0.22, 0.45, -0.15);
  g.add(body, belt, head, beard, nose, hat, brim, pom, e1, e2, sack);
  return { group: g, sack };
}

/** Deterministiske positioner til gavebunken rundt om træets fod (forrest først). */
export function giftSlots(max: number): { pos: THREE.Vector3; size: THREE.Vector3; rot: number; color: number }[] {
  const out: { pos: THREE.Vector3; size: THREE.Vector3; rot: number; color: number }[] = [];
  let i = 0;
  const layers = [
    { r: 1.9, n: 16, y: 0 },
    { r: 2.45, n: 20, y: 0 },
    { r: 1.95, n: 14, y: 0.3 },
    { r: 2.5, n: 16, y: 0.3 },
    { r: 2.1, n: 10, y: 0.58 },
  ];
  for (const L of layers) {
    for (let k = 0; k < L.n && out.length < max; k++) {
      // Spred rundt, men start forrest (vinkel 0 = mod kameraet)
      const order = k % 2 === 0 ? k / 2 : -(k + 1) / 2;
      const a = (order / L.n) * Math.PI * 2 * 0.9;
      const s = 0.26 + ((i * 37) % 10) / 50;
      const h = 0.22 + ((i * 53) % 10) / 45;
      out.push({
        pos: new THREE.Vector3(Math.sin(a) * L.r, L.y + h / 2, Math.cos(a) * L.r),
        size: new THREE.Vector3(s, h, s * (0.8 + ((i * 17) % 5) / 10)),
        rot: ((i * 29) % 20) / 10,
        color: i,
      });
      i++;
    }
  }
  return out;
}

export const GIFT_COLORS: [string, string][] = [
  ['#d33a45', '#f3d27a'],
  ['#2f7d55', '#f6efe3'],
  ['#3a6cc8', '#ffd27a'],
  ['#c9a227', '#c8283c'],
  ['#8a4fb8', '#f6efe3'],
  ['#e0773a', '#2f7d55'],
];

export function buildGift(slot: ReturnType<typeof giftSlots>[number], mat: Materials, boxGeo: THREE.BoxGeometry): THREE.Group {
  const [paper, ribbon] = GIFT_COLORS[slot.color % GIFT_COLORS.length];
  const g = new THREE.Group();
  const box = new THREE.Mesh(boxGeo, mat.get(paper));
  box.castShadow = true;
  box.scale.copy(slot.size);
  const r1 = new THREE.Mesh(boxGeo, mat.get(ribbon));
  r1.scale.set(slot.size.x * 1.02, slot.size.y * 1.02, slot.size.z * 0.18);
  const r2 = new THREE.Mesh(boxGeo, mat.get(ribbon));
  r2.scale.set(slot.size.x * 0.18, slot.size.y * 1.02, slot.size.z * 1.02);
  g.add(box, r1, r2);
  g.position.copy(slot.pos);
  g.rotation.y = slot.rot;
  return g;
}
