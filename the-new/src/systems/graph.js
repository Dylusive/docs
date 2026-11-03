// SCENE 2–3 — a layered neural graph read by a scanning ring. Each ring pass prunes weak edges
// (they retract and cool to oxblood) and grows stronger ones (bright heads crawling to new targets).
// The whole rewiring schedule is decided at init from the seed; drawing it is a pure function of t.
import * as THREE from 'three';
import { rng, hash, clamp01, smoothstep, ease } from '../util.js';
import { C } from '../config.js';

const L = 8, PER = 24, SEG = 10;
export const SWEEPS = [9.0, 11.9, 14.6], SWEEP_DUR = 2.3, RING_X0 = -5.2, RING_X1 = 5.2;
export const ringX = (t, k) => RING_X0 + (RING_X1 - RING_X0) * ease.inOutSine((t - SWEEPS[k]) / SWEEP_DUR);
const passTime = (x, k) => SWEEPS[k] + SWEEP_DUR * Math.acos(1 - 2 * clamp01((x - RING_X0) / (RING_X1 - RING_X0))) / Math.PI;

const glowMat = (extra = {}) => new THREE.ShaderMaterial({
  vertexShader: `attribute vec3 color; varying vec3 vC; void main(){ vC = color; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `uniform float uFade; varying vec3 vC; void main(){ gl_FragColor = vec4(vC*uFade,1.0);} `,
  uniforms: { uFade: { value: 1 } }, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, ...extra,
});

export function createGraph() {
  const R = rng(202);
  const nodes = [];
  for (let l = 0; l < L; l++) for (let i = 0; i < PER; i++) {
    const r = 1.8 * Math.sqrt((i + 0.5) / PER), th = i * 2.39996 + l * 0.7;
    const x = -4.2 + l * 1.2 + (R() - 0.5) * 0.24;
    nodes.push({ p: [x, Math.sin(th) * r + (R() - 0.5) * 0.15, Math.cos(th) * r * 0.9 - 0.04 * x * x], l, i, pass: SWEEPS.map((_, k) => passTime(x, k)) });
  }
  const edges = [];
  const addEdge = (a, b, w, born, dur, kind) => edges.push({ a, b, w, born, dur, die: Infinity, kind, ph: R() });
  for (const n of nodes) {
    if (n.l >= L - 1) continue;
    for (let k = 0; k < 3; k++) {
      const b = (n.l + 1) * PER + Math.floor(R() * PER);
      addEdge(nodes.indexOf(n), b, R(), 8.15 + n.l * 0.12 + R() * 0.35, 0.55, 'seed');
    }
  }
  const TH = [0.3, 0.42, 0.5];
  const pickNear = (src, layer) => {
    let best = -1, bs = -1e9;
    for (let j = 0; j < PER; j++) {
      const q = nodes[layer * PER + j].p, s = src.p;
      const sc = -Math.hypot(q[1] - s[1], q[2] - s[2]) + R() * 1.1;
      if (sc > bs) { bs = sc; best = layer * PER + j; }
    }
    return best;
  };
  for (let k = 0; k < 3; k++) {
    const alive = edges.filter((e) => e.die === Infinity);
    for (const e of alive) {
      const src = nodes[e.a], tp = src.pass[k];
      if (e.born + e.dur > tp) continue;
      if (e.w < TH[k]) {
        e.die = tp + 0.05;
        const layer = Math.min(L - 1, src.l + (R() < 0.25 && src.l < L - 2 ? 2 : 1));
        addEdge(e.a, pickNear(src, layer), 0.55 + R() * 0.45, tp + 0.12, 0.65, 'grown');
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]; if (n.l >= L - 1 || R() > 0.45) continue;
      addEdge(i, pickNear(n, n.l + 1), 0.6 + R() * 0.4, n.pass[k] + 0.18, 0.7, 'grown');
    }
  }
  // curve control points
  for (const e of edges) {
    const A = nodes[e.a].p, B = nodes[e.b].p;
    const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
    const rl = Math.hypot(m[1], m[2]) + 1e-3, bulge = 0.18 + 0.25 * e.ph;
    e.c = [m[0], m[1] + (m[1] / rl) * bulge, m[2] + (m[2] / rl) * bulge];
  }

  // ---- edge lines (CPU-updated per frame) ----
  const maxV = edges.length * SEG * 2;
  const ePos = new Float32Array(maxV * 3), eCol = new Float32Array(maxV * 3);
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3).setUsage(THREE.DynamicDrawUsage));
  eGeo.setAttribute('color', new THREE.BufferAttribute(eCol, 3).setUsage(THREE.DynamicDrawUsage));
  const eMat = glowMat();
  const lines = new THREE.LineSegments(eGeo, eMat); lines.frustumCulled = false;

  // ---- nodes ----
  const nPos = new Float32Array(nodes.length * 3), nAct = new Float32Array(nodes.length);
  nodes.forEach((n, i) => nPos.set(n.p, i * 3));
  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  nGeo.setAttribute('aAct', new THREE.BufferAttribute(nAct, 1).setUsage(THREE.DynamicDrawUsage));
  const nMat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 989 }, uFade: { value: 1 } },
    vertexShader: `attribute float aAct; uniform float uScale; varying float vA;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vA=aAct; gl_PointSize=(0.16+0.22*aAct)*uScale/-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uFade; varying float vA;
      void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d)*2.0; float core=smoothstep(0.32,0.0,r); float halo=exp(-r*r*5.0)*0.45;
        vec3 c = mix(vec3(${C.gold}), vec3(1.3,1.2,1.05), core) * (core*1.6+halo) * (0.35+1.6*vA);
        gl_FragColor=vec4(c*uFade,1.0);} `,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(nGeo, nMat); points.frustumCulled = false;

  // ---- scanning ring (circle + ticks + lens disc) ----
  const ringGroup = new THREE.Group();
  const rp = [];
  for (let i = 0; i < 192; i++) { const a0 = i / 192 * 6.2832, a1 = (i + 1) / 192 * 6.2832; rp.push(0, Math.cos(a0) * 2.35, Math.sin(a0) * 2.35, 0, Math.cos(a1) * 2.35, Math.sin(a1) * 2.35); }
  for (let i = 0; i < 48; i++) { const a = i / 48 * 6.2832, l = i % 4 === 0 ? 0.28 : 0.12; rp.push(0, Math.cos(a) * 2.35, Math.sin(a) * 2.35, 0, Math.cos(a) * (2.35 + l), Math.sin(a) * (2.35 + l)); }
  const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  const rc = new Float32Array(rp.length).fill(0); for (let i = 0; i < rc.length; i += 3) rc.set(C.phosphor.map((v) => v * 1.4), i);
  rGeo.setAttribute('color', new THREE.BufferAttribute(rc, 3));
  const rMat = glowMat(); const ringLines = new THREE.LineSegments(rGeo, rMat); ringLines.frustumCulled = false;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.35, 96), new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform float uFade,uTime; varying vec2 vP; void main(){ float r=length(vP)/2.35;
      float scan = 0.5+0.5*sin(r*40.0 - uTime*9.0); float rim = exp(-pow((1.0-r)*28.0,2.0)); float a = rim*0.6 + scan*0.006*r;
      gl_FragColor=vec4(vec3(${C.phosphor})*a*uFade*0.55,1.0);} `,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  disc.rotation.y = Math.PI / 2;
  ringGroup.add(ringLines, disc);

  const group = new THREE.Group(); group.add(lines, points, ringGroup);

  const bez = (A, Cc, B, s, out) => { const u = 1 - s; for (let k = 0; k < 3; k++) out[k] = u * u * A[k] + 2 * u * s * Cc[k] + s * s * B[k]; return out; };
  const p0 = [0, 0, 0], p1 = [0, 0, 0];
  const stats = { pruned: 0, grown: 0, alive: 0 };

  function update(t, { intensity = 1, broken = 0 } = {}) {
    const vis = smoothstep(7.6, 8.4, t) * (1 - smoothstep(24.8, 25.7, t));
    group.visible = vis > 0.001;
    if (!group.visible) return stats;
    let v = 0; stats.pruned = 0; stats.grown = 0; stats.alive = 0;
    const cold = [C.oxblood[0] * 1.5, C.oxblood[1] * 1.5, C.oxblood[2] * 1.5];
    for (const e of edges) {
      if (t < e.born) continue;
      if (t >= e.die) stats.pruned++;
      if (e.kind === 'grown') stats.grown++;
      const dq = (t - e.die) / 0.6; if (dq >= 1) continue;
      if (dq < 0) stats.alive++;
      const g = ease.outCubic((t - e.born) / e.dur);
      let s0 = 0, s1 = g, col, I;
      const fresh = Math.exp(-(t - e.born - e.dur) * 2.2) * (e.kind === 'grown' ? 1 : 0.3);
      if (dq >= 0) { s0 = ease.inQuad(dq); s1 = 1; col = cold; I = (1 - dq) * 2.4; }
      else { col = C.gold; I = (0.10 + 0.42 * e.w) * intensity; }
      const A = nodes[e.a].p, B = nodes[e.b].p;
      const pulsePh = (t * (0.45 + 0.5 * e.ph) + e.ph * 7) % 1;
      for (let k = 0; k < SEG; k++) {
        const a = s0 + (s1 - s0) * (k / SEG), b = s0 + (s1 - s0) * ((k + 1) / SEG);
        bez(A, e.c, B, a, p0); bez(A, e.c, B, b, p1);
        ePos.set(p0, v * 3); ePos.set(p1, v * 3 + 3);
        for (let q = 0; q < 2; q++) {
          const s = q ? b : a;
          const pulse = dq < 0 ? Math.exp(-Math.pow((s - pulsePh) * 9, 2)) * 1.4 : 0;
          const head = g < 1 ? Math.exp(-Math.pow((s - s1) * 14, 2)) * 3 : 0;
          const hot = fresh * 1.8 + pulse + head;
          const desat = broken;
          for (let c = 0; c < 3; c++) {
            const base = col[c] * I * (1 + hot) + hot * 0.12;
            const grey = (col[0] + col[1] + col[2]) / 3 * I;
            eCol[(v + q) * 3 + c] = (base * (1 - desat) + grey * [0.62, 0.42, 0.26][c] * desat) * 0.9;
          }
        }
        v += 2;
      }
    }
    eGeo.setDrawRange(0, v);
    eGeo.attributes.position.needsUpdate = true; eGeo.attributes.color.needsUpdate = true;
    // nodes: ignite as tokens arrive, flash on each ring pass
    nodes.forEach((n, i) => {
      let a = smoothstep(7.4 + n.l * 0.08, 8.8 + n.l * 0.08, t) * 0.5;
      for (const tp of n.pass) if (t >= tp) a += 1.6 * Math.exp(-(t - tp) * 2.6);
      a += 0.35 * smoothstep(16.5, 20.5, t) * (0.6 + 0.4 * Math.sin(t * 2.1 + i));
      nAct[i] = a * intensity * (1 - 0.5 * broken);
    });
    nGeo.attributes.aAct.needsUpdate = true;
    eMat.uniforms.uFade.value = vis; nMat.uniforms.uFade.value = vis;
    // ring
    let rv = 0, rx = RING_X0;
    for (let k = 0; k < 3; k++) {
      const w = smoothstep(SWEEPS[k] - 0.25, SWEEPS[k] + 0.2, t) * (1 - smoothstep(SWEEPS[k] + SWEEP_DUR - 0.2, SWEEPS[k] + SWEEP_DUR + 0.25, t));
      if (w > rv) { rv = w; rx = ringX(t, k); }
    }
    ringGroup.visible = rv > 0.001;
    ringGroup.position.x = rx; ringLines.rotation.x = t * 0.6;
    rMat.uniforms.uFade.value = rv; disc.material.uniforms.uFade.value = rv; disc.material.uniforms.uTime.value = t;
    return stats;
  }
  return { object: group, update, nodes: nodes.map((n) => n.p), stats, edgeCount: edges.length };
}
