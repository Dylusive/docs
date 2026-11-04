// SCENE 3 — screen-space Voronoi fracture. Sites cluster around a horizontal fault through frame centre;
// upper and lower plates separate, opening a jagged gap in which the line is written.
// The same Voronoi edges are lifted into 3D (z=0 plane under the locked break camera) so scene 4 can grow from them.
import * as THREE from 'three'
import { rng, spring, SPRING, smoothstep } from '../util.js'
import { ASPECT, BREAK_T, PLANE_H, C } from '../config.js'

export const NS = 30
export const IMPACT = [0.565 * ASPECT, 0.52]

export function createFracture() {
  const R = rng(303)
  const sites = []
  for (let i = 0; i < 10; i++) {
    // mirrored pairs hugging the fault -> straight-ish, readable gap
    const x = ((i + 0.5) / 10) * ASPECT + (R() - 0.5) * 0.06
    sites.push([x, 0.5 + 0.07 + R() * 0.03], [x + (R() - 0.5) * 0.08, 0.5 - 0.07 - R() * 0.03])
  }
  while (sites.length < NS) {
    // outer shards, denser near impact
    const a = R() * 6.2832
    const r = 0.12 + Math.pow(R(), 1.25) * 1.1
    const s = [IMPACT[0] + Math.cos(a) * r, IMPACT[1] + Math.sin(a) * r * 0.75]
    if (
      s[0] < 0.02 ||
      s[0] > ASPECT - 0.02 ||
      s[1] < 0.02 ||
      s[1] > 0.98 ||
      Math.abs(s[1] - 0.5) < 0.16
    )
      continue
    sites.push(s)
  }
  const shard = sites.map((s, i) => {
    const dx = s[0] - IMPACT[0]
    const dy = s[1] - IMPACT[1]
    const d = Math.hypot(dx, dy) + 1e-4
    return {
      s,
      dir: [dx / d, dy / d],
      mag: 0.006 + 0.016 * R(),
      up: s[1] > 0.5 ? 1 : -1,
      delay: Math.abs(dx) * 0.16,
      rot: (R() - 0.5) * 0.06,
      tint: 0.88 + 0.24 * R(),
    }
  })

  // offsets as pure functions of t: snap open at the break (underdamped spring), drift, then settle closed at 25s
  function state(t) {
    const tb = t - BREAK_T
    const off = []
    const rot = []
    for (const sh of shard) {
      const open = spring(tb - sh.delay, SPRING.snap) * (1 + 0.04 * Math.max(0, tb - sh.delay))
      const close = 1 - spring(t - 25.0 - sh.delay * 0.6, SPRING.settle)
      const k = tb > 0 ? open * close : 0
      const gap = 0.052
      off.push(new THREE.Vector2(sh.dir[0] * sh.mag * k, (sh.dir[1] * sh.mag + sh.up * gap) * k))
      rot.push(sh.rot * k)
    }
    return { off, rot }
  }

  // ---- Voronoi cells via half-plane clipping (CPU) -> unique edges ----
  const clip = (poly, a, b) => {
    // keep points closer to a than b
    const out = []
    const nx = b[0] - a[0]
    const ny = b[1] - a[1]
    const c = (b[0] * b[0] + b[1] * b[1] - a[0] * a[0] - a[1] * a[1]) / 2
    const f = (p) => c - (p[0] * nx + p[1] * ny)
    for (let i = 0; i < poly.length; i++) {
      const P = poly[i]
      const Q = poly[(i + 1) % poly.length]
      const fp = f(P)
      const fq = f(Q)
      if (fp >= 0) out.push(P)
      if (fp >= 0 !== fq >= 0) {
        const u = fp / (fp - fq)
        out.push([P[0] + (Q[0] - P[0]) * u, P[1] + (Q[1] - P[1]) * u])
      }
    }
    return out
  }
  const edgeMap = new Map()
  const segs = []
  sites.forEach((s, i) => {
    let poly = [
      [0, 0],
      [ASPECT, 0],
      [ASPECT, 1],
      [0, 1],
    ]
    sites.forEach((o, j) => {
      if (j !== i) poly = clip(poly, s, o)
    })
    for (let k = 0; k < poly.length; k++) {
      const P = poly[k]
      const Q = poly[(k + 1) % poly.length]
      const onBorder = (p, q) =>
        (Math.abs(p[0] - q[0]) < 1e-6 && (p[0] < 1e-6 || p[0] > ASPECT - 1e-6)) ||
        (Math.abs(p[1] - q[1]) < 1e-6 && (p[1] < 1e-6 || p[1] > 1 - 1e-6))
      if (onBorder(P, Q)) continue
      const key = [P, Q]
        .map((p) => p.map((v) => v.toFixed(4)).join(','))
        .sort()
        .join('|')
      if (edgeMap.has(key)) continue
      edgeMap.set(key, 1)
      segs.push([P, Q])
    }
  })
  const toWorld = (p) => [(p[0] - ASPECT / 2) * PLANE_H, (p[1] - 0.5) * PLANE_H, 0]
  const segs3 = segs.map(([P, Q]) => [toWorld(P), toWorld(Q)])
  const impact3 = toWorld(IMPACT)

  // 3D fault lines (visible 24.6s → fading by 33s as the bloom takes over)
  const fp = []
  const fc = []
  segs3.forEach(([A, B]) => {
    const n = 8
    for (let k = 0; k < n; k++) {
      const a = k / n
      const b = (k + 1) / n
      fp.push(
        A[0] + (B[0] - A[0]) * a,
        A[1] + (B[1] - A[1]) * a,
        0,
        A[0] + (B[0] - A[0]) * b,
        A[1] + (B[1] - A[1]) * b,
        0
      )
      const d0 = Math.hypot(
        A[0] + (B[0] - A[0]) * a - impact3[0],
        A[1] + (B[1] - A[1]) * a - impact3[1]
      )
      const d1 = Math.hypot(
        A[0] + (B[0] - A[0]) * b - impact3[0],
        A[1] + (B[1] - A[1]) * b - impact3[1]
      )
      fc.push(d0, d1)
    }
  })
  const fGeo = new THREE.BufferGeometry()
  fGeo.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3))
  fGeo.setAttribute('aD', new THREE.Float32BufferAttribute(fc, 1))
  const fMat = new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `attribute float aD; varying float vD; void main(){ vD=aD; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform float uFade,uTime; varying float vD;
      void main(){ float wave = 0.6+0.4*sin(vD*3.0 - uTime*4.0); gl_FragColor=vec4(vec3(${C.gold})*2.2*wave*uFade,1.0);} `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const faults = new THREE.LineSegments(fGeo, fMat)
  faults.frustumCulled = false
  function update(t) {
    const v = smoothstep(24.7, 25.5, t) * (1 - smoothstep(29.5, 33.0, t))
    faults.visible = v > 0.001
    fMat.uniforms.uFade.value = v
    fMat.uniforms.uTime.value = t
  }

  return {
    sites: sites.map((s) => new THREE.Vector2(s[0], s[1])),
    tints: shard.map((s) => s.tint),
    state,
    segs3,
    impact3,
    object: faults,
    update,
  }
}
