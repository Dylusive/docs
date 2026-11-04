// SCENE 5 — the observers. Armillary measurement rings start misaligned and jittery, then converge on the
// bloom (their lock error decays: they are learning to watch). Radar sweeps trail across two rings;
// every bloom tip a sweep crosses releases a data-spark that spirals up into the instruments.
import * as THREE from 'three'
import { rng, smoothstep } from '../util.js'
import { C } from '../config.js'

const RADII = [4.2, 5.0, 5.9, 6.9]
const glow = (frag, vert) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uFade: { value: 1 },
      uTime: { value: 0 },
      uScale: { value: 989 },
      uCenter: { value: new THREE.Vector3() },
    },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })

export function createLabs(bloom) {
  const R = rng(505)
  const group = new THREE.Group()
  const center = new THREE.Vector3(...bloom.center)
  const rings = RADII.map((r, i) => {
    const p = []
    for (let k = 0; k < 256; k++) {
      const a0 = (k / 256) * 6.2832
      const a1 = ((k + 1) / 256) * 6.2832
      p.push(Math.cos(a0) * r, Math.sin(a0) * r, 0, Math.cos(a1) * r, Math.sin(a1) * r, 0)
    }
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * 6.2832
      const l = k % 6 === 0 ? 0.26 : 0.09
      p.push(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a) * (r - l), Math.sin(a) * (r - l), 0)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    const m = glow(
      `uniform float uFade; void main(){ gl_FragColor=vec4(vec3(${C.phosphor})*0.42*uFade,1.0);} `,
      `void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `
    )
    const obj = new THREE.Group()
    const lines = new THREE.LineSegments(g, m)
    lines.frustumCulled = false
    obj.add(lines)
    let fan = null
    if (i === 1 || i === 3) {
      // radar wedge: trailing alpha gradient
      const fp = []
      const fa = []
      const n = 40
      const span = 1.1
      for (let k = 0; k < n; k++) {
        const a0 = (-span * k) / n
        const a1 = (-span * (k + 1)) / n
        fp.push(
          0,
          0,
          0,
          Math.cos(a0) * r,
          Math.sin(a0) * r,
          0,
          Math.cos(a1) * r,
          Math.sin(a1) * r,
          0
        )
        fa.push(1 - k / n, 1 - k / n, 1 - (k + 1) / n)
      }
      const fg = new THREE.BufferGeometry()
      fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3))
      fg.setAttribute('aA', new THREE.Float32BufferAttribute(fa, 1))
      fan = new THREE.Mesh(
        fg,
        glow(
          `uniform float uFade; varying float vA; varying float vR; void main(){ float a = pow(vA,3.0)*(0.25+0.75*vR); gl_FragColor=vec4(vec3(${C.phosphor})*a*0.09*uFade,1.0);} `,
          `attribute float aA; varying float vA; varying float vR; void main(){ vA=aA; vR=length(position.xy)/${r.toFixed(
            2
          )}; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `
        )
      )
      fan.frustumCulled = false
      obj.add(fan)
    }
    group.add(obj)
    return {
      obj,
      lines,
      fan,
      r,
      tilt: [(R() - 0.5) * 2.2, (R() - 0.5) * 2.2],
      spin: (R() < 0.5 ? -1 : 1) * (0.15 + R() * 0.25),
      off0: [(R() - 0.5) * 3, (R() - 0.5) * 2.4, (R() - 0.5) * 3],
      wob: R() * 6.28,
    }
  })

  // data-sparks: analytic spiral trajectories from bloom tips (pure function of t)
  const NSP = 2200
  const tipsN = bloom.tips.length / 3
  const sp = []
  const sa = []
  for (let k = 0; k < NSP; k++) {
    const ti = Math.floor(R() * tipsN)
    sp.push(bloom.tips[ti * 3], bloom.tips[ti * 3 + 1], bloom.tips[ti * 3 + 2])
    sa.push(34.3 + R() * 6.6, R(), RADII[Math.floor(R() * 4)], 0)
  }
  const sg = new THREE.BufferGeometry()
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
  sg.setAttribute('aS', new THREE.Float32BufferAttribute(sa, 4))
  const sMat = glow(
    `uniform float uFade; varying float vA; void main(){ float r=length(gl_PointCoord-0.5)*2.0; gl_FragColor=vec4(mix(vec3(1.0,0.85,0.6),vec3(${C.phosphor}),vA)*exp(-r*r*5.0)*1.6*uFade*smoothstep(0.0,0.15,vA)*(1.0-smoothstep(0.75,1.0,vA)),1.0);} `,
    `attribute vec4 aS; uniform float uTime, uScale; uniform vec3 uCenter; varying float vA;
     void main(){ float life = 2.8; float tau = uTime - aS.x; vA = clamp(tau/life,0.0,1.0);
       vec3 rel = position - uCenter; float r0 = length(rel.xz); float th0 = atan(rel.z, rel.x);
       float e = 1.0 - pow(1.0-vA, 2.0);
       float r = mix(r0, aS.z, e); float th = th0 + (0.7+0.9*aS.y)*tau;
       vec3 p = uCenter + vec3(cos(th)*r, rel.y + tau*(0.5+0.6*aS.y), sin(th)*r);
       vec4 mv = modelViewMatrix*vec4(p,1.0);
       gl_PointSize = (tau < 0.0 || tau > life) ? 0.0 : (0.06+0.05*aS.y)*uScale/-mv.z; gl_Position=projectionMatrix*mv; }`
  )
  sMat.uniforms.uCenter.value.copy(center)
  const sparks = new THREE.Points(sg, sMat)
  sparks.frustumCulled = false
  group.add(sparks)

  function update(t, fade = 1) {
    const v = smoothstep(33.6, 35.0, t) * fade
    group.visible = v > 0.001
    if (!group.visible) return { err: 1 }
    const learn = Math.exp(-Math.max(0, t - 34.2) * 0.62) // the observers' error decays
    let err = 0
    rings.forEach((rg, i) => {
      const jit = learn * (0.35 + 0.65 * Math.sin(t * 3.1 + rg.wob))
      rg.obj.position.set(
        center.x + rg.off0[0] * learn,
        center.y + rg.off0[1] * learn,
        center.z + rg.off0[2] * learn
      )
      rg.obj.rotation.set(
        rg.tilt[0] + 0.5 * jit,
        rg.tilt[1] + 0.4 * jit * Math.cos(t * 2.3 + i),
        t * rg.spin
      )
      if (rg.fan) rg.fan.rotation.z = t * (1.6 + i * 0.2)
      rg.lines.material.uniforms.uFade.value = v * (0.45 + 0.55 * (1 - learn))
      if (rg.fan) rg.fan.material.uniforms.uFade.value = v
      err += Math.hypot(...rg.off0) * learn + Math.abs(jit) * 0.2
    })
    sMat.uniforms.uTime.value = t
    sMat.uniforms.uFade.value = v
    return {
      err: err / rings.length,
      sparks: Math.max(0, Math.min(NSP, Math.floor(((t - 34.3) / 6.6) * NSP))),
    }
  }
  return { object: group, update, center }
}
