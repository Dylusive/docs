// SCENE 1 — token-particles advected through a divergence-free flow field.
// The field is a sum of seeded streamfunction modes with incommensurate frequencies: it never repeats.
// Positions are integrated from frame 0 with a fixed step, so any frame is reproducible (pure f(frame)).
import * as THREE from 'three'
import { rng, smoothstep, clamp01 } from '../util.js'
import { C } from '../config.js'

export const GLYPHS =
  'abcdefghijklmnopqrstuvwxyz0123456789.,;:!?{}[]()<>/=+-*#&%$@_~^|ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const N = 9000
const DT = 1 / 60

const WORDS = [
  { text: 'next token', t0: 1.2, h0: 2.4, h1: 3.4, t1: 4.0 },
  { text: 'next thought', t0: 4.3, h0: 5.4, h1: 6.3, t1: 6.9 },
]

function glyphAtlas() {
  const cv = document.createElement('canvas')
  cv.width = 1024
  cv.height = 512
  const g = cv.getContext('2d')
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = '700 46px "JetBrains Mono"'
  for (let i = 0; i < GLYPHS.length; i++)
    g.fillText(GLYPHS[i], (i % 16) * 64 + 32, Math.floor(i / 16) * 64 + 34)
  const tex = new THREE.CanvasTexture(cv)
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  return tex
}

function sampleWord(text) {
  const cv = document.createElement('canvas')
  cv.width = 1400
  cv.height = 260
  const g = cv.getContext('2d')
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = '700 170px "Space Grotesk"'
  g.fillText(text, 700, 130)
  const d = g.getImageData(0, 0, 1400, 260).data
  const pts = []
  for (let y = 0; y < 260; y += 5)
    for (let x = 0; x < 1400; x += 5)
      if (d[(y * 1400 + x) * 4 + 3] > 140)
        pts.push([((x - 700) / 1400) * 8.6, (-(y - 130) / 1400) * 8.6 + 0.95])
  return pts
}

export function createTokens(graphNodes) {
  const R = rng(101)
  const modes = []
  for (let k = 0; k < 7; k++) {
    const ang = R() * Math.PI * 2
    const kk = 0.25 + R() * 0.9
    modes.push({
      kx: Math.cos(ang) * kk,
      ky: Math.sin(ang) * kk,
      w: 0.17 + R() * 0.41,
      ph: R() * 6.283,
      A: (0.55 + R() * 0.6) / (kk * 1.3),
    })
  }
  const pos0 = new Float32Array(N * 3)
  const vel = new Float32Array(N * 3)
  const pos = new Float32Array(N * 3)
  const rand = new Float32Array(N)
  const glyph = new Float32Array(N)
  const bright = new Float32Array(N)
  const alpha = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    pos0[i * 3] = -7.8 + R() * 15.6
    pos0[i * 3 + 1] = -3.9 + R() * 7.8
    pos0[i * 3 + 2] = -3.2 + R() * 5.4
    rand[i] = R()
    glyph[i] = Math.floor(R() * GLYPHS.length)
  }
  // word targets use disjoint particle subsets
  const targets = WORDS.map((w, k) => {
    const pts = sampleWord(w.text)
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1))
      ;[pts[i], pts[j]] = [pts[j], pts[i]]
    }
    return { ...w, pts: pts.slice(0, 2600), base: k * 2700 }
  })

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
  geo.setAttribute('aGlyph', new THREE.BufferAttribute(glyph, 1))
  geo.setAttribute('aBright', new THREE.BufferAttribute(bright, 1).setUsage(THREE.DynamicDrawUsage))
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage))
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: { value: glyphAtlas() },
      uTime: { value: 0 },
      uScale: { value: 989 },
      uFade: { value: 1 },
      uCol: { value: new THREE.Vector3(...C.amber) },
      uHot: { value: new THREE.Vector3(...C.bone) },
    },
    vertexShader: `
      attribute float aRand, aGlyph, aBright, aAlpha; uniform float uTime, uScale;
      varying float vG, vB, vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        float flick = floor(uTime * (1.5 + 7.0*aRand));
        vG = mod(aGlyph + flick * 7.0 * step(aBright, 0.6), ${GLYPHS.length}.0);
        vB = aBright; vA = aAlpha * smoothstep(-26.0, -6.0, mv.z);
        gl_PointSize = (0.085 + 0.07*aRand + 0.03*aBright) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uAtlas; uniform vec3 uCol, uHot; uniform float uFade; varying float vG, vB, vA;
      void main(){
        vec2 cell = vec2(mod(vG,16.0), floor(vG/16.0));
        vec2 uv = vec2((cell.x + gl_PointCoord.x)/16.0, 1.0 - (cell.y + gl_PointCoord.y)/8.0);
        float a = texture2D(uAtlas, uv).a;
        vec3 c = mix(uCol*0.9, uHot*2.2, vB);
        gl_FragColor = vec4(c * a * vA * uFade, 1.0);
      }`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false

  let simT = -1
  function reset() {
    pos.set(pos0)
    vel.fill(0)
    simT = 0
  }
  function field(x, y, t, out) {
    let u = 0.62
    let v = 0
    for (const m of modes) {
      const c = Math.cos(m.kx * x + m.ky * y + m.w * t + m.ph) * m.A
      u += c * m.ky
      v -= c * m.kx
    }
    out[0] = u
    out[1] = v
    out[2] = 0.25 * Math.sin(0.4 * x + 0.31 * t)
  }
  const f = [0, 0, 0]
  function step(t) {
    const absorb = smoothstep(6.9, 8.3, t)
    for (let i = 0; i < N; i++) {
      const ix = i * 3
      let x = pos[ix]
      let y = pos[ix + 1]
      let z = pos[ix + 2]
      field(x, y, t, f)
      let ax = (f[0] - vel[ix]) * 2.2
      let ay = (f[1] - vel[ix + 1]) * 2.2
      let az = (f[2] - vel[ix + 2]) * 2.2
      let b = 0
      for (const w of targets) {
        const j = i - w.base
        if (j >= 0 && j < w.pts.length) {
          const a = smoothstep(w.t0, w.h0, t) * (1 - smoothstep(w.h1, w.t1, t))
          b = a
          if (a > 0) {
            const tx = w.pts[j][0]
            const ty = w.pts[j][1]
            ax = ax * (1 - a) + ((tx - x) * 34 - vel[ix] * 10.5) * a
            ay = ay * (1 - a) + ((ty - y) * 34 - vel[ix + 1] * 10.5) * a
            az = az * (1 - a) + ((0 - z) * 34 - vel[ix + 2] * 10.5) * a
          }
        }
      }
      if (absorb > 0 && graphNodes) {
        const n = graphNodes[i % graphNodes.length]
        const k = 14 * absorb
        const c = 6.5 * Math.sqrt(absorb)
        ax = ax * (1 - absorb) + ((n[0] - x) * k - vel[ix] * c) * absorb
        ay = ay * (1 - absorb) + ((n[1] - y) * k - vel[ix + 1] * c) * absorb
        az = az * (1 - absorb) + ((n[2] - z) * k - vel[ix + 2] * c) * absorb
      }
      vel[ix] += ax * DT
      vel[ix + 1] += ay * DT
      vel[ix + 2] += az * DT
      x += vel[ix] * DT
      y += vel[ix + 1] * DT
      z += vel[ix + 2] * DT
      if (absorb < 0.05) {
        if (x > 7.9) x -= 15.8
        if (x < -7.9) x += 15.8
      }
      pos[ix] = x
      pos[ix + 1] = y
      pos[ix + 2] = z
      bright[i] = b
    }
  }

  function update(t) {
    const tt = Math.min(t, 9.4)
    if (simT < 0 || tt < simT - 1e-6) reset()
    while (simT + DT <= tt + 1e-6) {
      step(simT)
      simT += DT
    }
    // alpha: fade in at start, vanish into graph nodes
    for (let i = 0; i < N; i++) {
      let a = 0.55 + 0.45 * rand[i]
      if (graphNodes && t > 6.9) {
        const n = graphNodes[i % graphNodes.length]
        const ix = i * 3
        const d = Math.hypot(pos[ix] - n[0], pos[ix + 1] - n[1], pos[ix + 2] - n[2])
        a *= clamp01(d / 0.6)
      }
      alpha[i] = a
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.aBright.needsUpdate = true
    geo.attributes.aAlpha.needsUpdate = true
    mat.uniforms.uTime.value = t
    mat.uniforms.uFade.value = smoothstep(0, 0.9, t) * (1 - smoothstep(8.6, 9.3, t))
    points.visible = t < 9.4
  }
  return { object: points, update, count: N }
}
