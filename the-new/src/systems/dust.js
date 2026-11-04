// Atmosphere in depth: slow motes that drift on analytic paths (wrapped, never re-synchronising).
import * as THREE from 'three'
import { rng } from '../util.js'
export function createDust() {
  const R = rng(707)
  const N = 1600
  const a = []
  for (let i = 0; i < N; i++) a.push((R() - 0.5) * 44, (R() - 0.5) * 26, -22 + R() * 30, R())
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(N * 3).fill(0), 3))
  g.setAttribute('aS', new THREE.Float32BufferAttribute(a, 4))
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 989 }, uFade: { value: 1 } },
    vertexShader: `attribute vec4 aS; uniform float uTime, uScale; varying float vA;
      void main(){ vec3 p = aS.xyz + vec3(0.11+0.1*aS.w, 0.05*sin(uTime*0.2+aS.w*30.0), 0.04) * uTime;
        p.x = mod(p.x + 22.0, 44.0) - 22.0;
        vec4 mv = modelViewMatrix*vec4(p,1.0); vA = aS.w * smoothstep(-40.0,-4.0,mv.z);
        gl_PointSize = (0.03+0.05*aS.w)*uScale/-mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uFade; varying float vA; void main(){ float r=length(gl_PointCoord-0.5)*2.0; gl_FragColor=vec4(vec3(1.0,0.7,0.45)*exp(-r*r*3.0)*vA*0.35*uFade,1.0);} `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const pts = new THREE.Points(g, m)
  pts.frustumCulled = false
  return {
    object: pts,
    update: (t, f = 1) => {
      m.uniforms.uTime.value = t
      m.uniforms.uFade.value = f
    },
  }
}
