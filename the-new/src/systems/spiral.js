// SCENE 6 — a golden logarithmic spiral whose particles flow inward forever (log-radius wraps),
// with concentric rings shrinking by φ each cycle: a Droste recursion that never arrives.
import * as THREE from 'three';
import { rng, smoothstep } from '../util.js';
import { C } from '../config.js';

export function createSpiral() {
  const R = rng(606);
  const N = 7000, p = new Float32Array(N * 3), a = [];
  for (let i = 0; i < N; i++) a.push(R(), i % 3, R(), R());
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(a, 4));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 0 }, uScale: { value: 989 } },
    vertexShader: `attribute vec4 aS; uniform float uTime, uScale; varying float vR, vK;
      void main(){
        float span = 5.2; float b = 0.30635;                 // golden spiral: r grows by φ every quarter turn
        float L = mod(aS.x*span - uTime*0.42, span);          // log-radius flows inward and wraps: recursion
        float r = 0.035*exp(L);
        float th = L/b + aS.y*2.0944 + uTime*0.35 + (aS.z-0.5)*0.25;
        float w = (aS.w-0.5)*0.09*r;
        vec3 q = vec3(cos(th)*(r+w), sin(th)*(r+w), (aS.z-0.5)*0.15*r);
        vR = L/span; vK = aS.w;
        vec4 mv = modelViewMatrix*vec4(q,1.0);
        gl_PointSize = (0.025 + 0.03*vR) * uScale / -mv.z * (0.6+0.8*aS.z);
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uFade; varying float vR, vK;
      void main(){ float r=length(gl_PointCoord-0.5)*2.0; float a=exp(-r*r*4.5);
        vec3 c = mix(vec3(1.3,1.18,1.0)*1.6, vec3(${C.amber}), smoothstep(0.15,0.7,vR));
        c = mix(c, vec3(${C.phosphor})*0.9, step(0.93, vK));
        float edge = smoothstep(0.0,0.08,vR)*(1.0-smoothstep(0.8,1.0,vR));
        gl_FragColor=vec4(c*a*edge*uFade*1.1,1.0);} `,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  // Droste rings
  const rp = [], ri = [];
  const NR = 9;
  for (let n = 0; n < NR; n++) for (let k = 0; k < 128; k++) { const a0 = k / 128 * 6.2832, a1 = (k + 1) / 128 * 6.2832; rp.push(Math.cos(a0), Math.sin(a0), 0, Math.cos(a1), Math.sin(a1), 0); ri.push(n, n); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('aN', new THREE.Float32BufferAttribute(ri, 1));
  const rMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 0 } },
    vertexShader: `attribute float aN; uniform float uTime; varying float vR;
      void main(){ float k = aN + fract(uTime*0.32); float r = 6.0*pow(1.618034, -k); vR = k/${NR}.0;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position.xy*r, 0.0, 1.0);} `,
    fragmentShader: `uniform float uFade; varying float vR; void main(){ float a = smoothstep(0.0,0.12,vR)*(1.0-smoothstep(0.6,1.0,vR));
      gl_FragColor=vec4(vec3(${C.phosphor})*0.5*a*uFade,1.0);} `,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const rings = new THREE.LineSegments(rg, rMat); rings.frustumCulled = false;
  const group = new THREE.Group(); group.add(pts, rings);
  function update(t, camera) {
    const v = smoothstep(40.8, 42.6, t);
    group.visible = v > 0.001; if (!group.visible) return;
    // lives in camera space, 8 units ahead, tilting slowly so it keeps depth
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    group.position.copy(camera.position).addScaledVector(fwd, 8);
    group.quaternion.copy(camera.quaternion);
    group.rotateX(0.18 * Math.sin(t * 0.4)); group.rotateY(0.14 * Math.cos(t * 0.33));
    const grow = 0.25 + 0.75 * smoothstep(40.8, 43.0, t);
    group.scale.setScalar(grow);
    mat.uniforms.uTime.value = t; rMat.uniforms.uTime.value = t;
    mat.uniforms.uFade.value = v; rMat.uniforms.uFade.value = v;
  }
  return { object: group, update };
}
