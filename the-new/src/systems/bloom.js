// SCENE 4 — the fault lines become roots. A recursive branching bloom grows out of every crack,
// timed as a wave from the impact point. Segment growth is evaluated on the GPU from per-vertex birth times.
import * as THREE from 'three'
import { rng } from '../util.js'
import { C } from '../config.js'

const DEPTH = 7
const GOLD = 2.39996

export function createBloom(fracture) {
  const R = rng(404)
  const { segs3, impact3 } = fracture
  const center = [impact3[0] * 0.5, impact3[1] * 0.5, 2.2]
  const roots = []
  for (const [A, B] of segs3) {
    const len = Math.hypot(B[0] - A[0], B[1] - A[1])
    const n = Math.max(1, Math.round(len / 1.5))
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n
      roots.push([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, 0])
    }
  }
  const A = []
  const B = []
  const T = []
  const P = []
  const tips = []
  const tipT = []
  const tipP = []
  const norm = (v) => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1
    return [v[0] / l, v[1] / l, v[2] / l]
  }
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
  const rotate = (v, ax, ang) => {
    // Rodrigues
    const c = Math.cos(ang)
    const s = Math.sin(ang)
    const d = v[0] * ax[0] + v[1] * ax[1] + v[2] * ax[2]
    const cr = cross(ax, v)
    return [
      v[0] * c + cr[0] * s + ax[0] * d * (1 - c),
      v[1] * c + cr[1] * s + ax[1] * d * (1 - c),
      v[2] * c + cr[2] * s + ax[2] * d * (1 - c),
    ]
  }
  function branch(p, dir, len, depth, t0, phase) {
    const dur = 0.3 + depth * 0.05
    // gentle curl toward the shared axis gives the bloom its dome
    const toC = norm([center[0] - p[0], center[1] - p[1], center[2] - p[2]])
    dir = norm([dir[0] + toC[0] * 0.18, dir[1] + toC[1] * 0.18, dir[2] + toC[2] * 0.18])
    const q = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len]
    A.push(...p)
    B.push(...q)
    T.push(t0, t0 + dur)
    P.push(depth, phase)
    if (depth >= DEPTH - 1) {
      tips.push(...q)
      tipT.push(t0 + dur)
      tipP.push(R())
      return
    }
    let perp = norm(cross(dir, Math.abs(dir[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]))
    perp = rotate(perp, dir, depth * GOLD + phase * 6.283)
    const kids = R() < 0.1 ? 3 : 2
    for (let k = 0; k < kids; k++) {
      const ax = rotate(perp, dir, (k / kids) * 6.283)
      const spread = 0.36 + R() * 0.22
      branch(
        q,
        rotate(dir, ax, spread),
        len * (0.75 + R() * 0.07),
        depth + 1,
        t0 + dur + R() * 0.08,
        phase
      )
    }
  }
  roots.forEach((r) => {
    const rad = norm([r[0] - impact3[0], r[1] - impact3[1], 0])
    const d = Math.hypot(r[0] - impact3[0], r[1] - impact3[1])
    const dir = norm([rad[0] * 0.55 + (R() - 0.5) * 0.3, rad[1] * 0.55 + (R() - 0.5) * 0.3, 1.0])
    branch(r, dir, 0.34 + R() * 0.14, 0, 25.15 + d * 0.11 + R() * 0.15, R())
  })

  const nSeg = T.length / 2
  // two vertices per segment; vertex attributes carry the whole segment so the shader can grow it
  const aA = new Float32Array(nSeg * 6)
  const aB = new Float32Array(nSeg * 6)
  const aT = new Float32Array(nSeg * 4)
  const aP = new Float32Array(nSeg * 4)
  const aW = new Float32Array(nSeg * 2)
  for (let i = 0; i < nSeg; i++)
    for (let v = 0; v < 2; v++) {
      aA.set(A.slice(i * 3, i * 3 + 3), (i * 2 + v) * 3)
      aB.set(B.slice(i * 3, i * 3 + 3), (i * 2 + v) * 3)
      aT.set([T[i * 2], T[i * 2 + 1]], (i * 2 + v) * 2)
      aP.set([P[i * 2], P[i * 2 + 1]], (i * 2 + v) * 2)
      aW[i * 2 + v] = v
    }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(aA, 3))
  geo.setAttribute('aB', new THREE.BufferAttribute(aB, 3))
  geo.setAttribute('aT', new THREE.BufferAttribute(aT, 2))
  geo.setAttribute('aP', new THREE.BufferAttribute(aP, 2))
  geo.setAttribute('aW', new THREE.BufferAttribute(aW, 1))
  const sway = `
    vec3 swayed(vec3 p, float depth, float ph){
      float k = depth*depth*0.0045;
      return p + k*vec3(sin(uTime*0.73 + p.y*0.9 + ph*6.0), sin(uTime*0.61 + p.x*0.8 + ph*4.0), sin(uTime*0.52 + p.z + ph*3.0));
    }`
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
    vertexShader: `attribute vec3 aB; attribute vec2 aT, aP; attribute float aW; uniform float uTime; varying float vI, vD, vG;
      ${sway}
      void main(){
        float g = clamp((uTime - aT.x)/(aT.y - aT.x), 0.0, 1.0); g = 1.0 - pow(1.0-g, 3.0);
        vec3 p = mix(position, mix(position, aB, g), aW);
        p = swayed(p, aP.x + aW, aP.y);
        vI = step(aT.x, uTime); vD = aP.x / ${DEPTH - 1}.0; vG = (g < 1.0 ? 1.0 : 0.0) * aW;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader: `uniform float uFade; varying float vI, vD, vG;
      void main(){
        vec3 c = mix(vec3(1.25,1.1,0.9)*1.6, vec3(${C.gold})*1.2, smoothstep(0.0,0.35,vD));
        c = mix(c, vec3(${C.coral})*1.1, smoothstep(0.35,0.8,vD));
        c = mix(c, vec3(1.0,0.82,0.74)*1.3, smoothstep(0.8,1.0,vD));
        c *= 0.30 + vG*2.2;
        gl_FragColor = vec4(c*vI*uFade,1.0);
      }`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const lines = new THREE.LineSegments(geo, mat)
  lines.frustumCulled = false

  // blossoms at tips
  const tGeo = new THREE.BufferGeometry()
  tGeo.setAttribute('position', new THREE.Float32BufferAttribute(tips, 3))
  tGeo.setAttribute('aT', new THREE.Float32BufferAttribute(tipT, 1))
  tGeo.setAttribute('aR', new THREE.Float32BufferAttribute(tipP, 1))
  const tMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 }, uScale: { value: 989 } },
    vertexShader: `attribute float aT, aR; uniform float uTime, uScale; varying float vA;
      ${sway}
      void main(){ float age = uTime - aT; float pop = age < 0.0 ? 0.0 : 1.0 - exp(-age*5.0)*cos(age*14.0);
        float tw = 0.65 + 0.35*sin(uTime*(1.3+aR*2.0) + aR*40.0);
        vA = step(0.0, age) * tw * (1.0 + 2.5*exp(-age*3.0));
        vec4 mv = modelViewMatrix*vec4(swayed(position, ${DEPTH}.0, aR),1.0);
        gl_PointSize = max(0.0, pop) * (0.04 + 0.035*aR) * uScale / -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uFade; varying float vA;
      void main(){ float r = length(gl_PointCoord-0.5)*2.0; float a = exp(-r*r*4.0);
        gl_FragColor = vec4(vec3(1.0,0.86,0.76)*a*vA*0.55*uFade,1.0);} `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const blossoms = new THREE.Points(tGeo, tMat)
  blossoms.frustumCulled = false

  const group = new THREE.Group()
  group.add(lines, blossoms)
  const born = T.filter((_, i) => i % 2 === 1).sort((a, b) => a - b)
  const bornCount = (t) => {
    let lo = 0
    let hi = born.length
    while (lo < hi) {
      const m = (lo + hi) >> 1
      if (born[m] <= t) lo = m + 1
      else hi = m
    }
    return lo
  }

  function update(t, fade = 1) {
    group.visible = t > 25.0 && fade > 0.001
    mat.uniforms.uTime.value = t
    tMat.uniforms.uTime.value = t
    mat.uniforms.uFade.value = fade
    tMat.uniforms.uFade.value = fade
  }
  return { object: group, update, tips, tipT, center, bornCount, segments: nSeg }
}
