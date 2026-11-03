// Compositor: HDR scene -> bloom chain -> final pass (Voronoi shards, crack glow, haze atmosphere,
// chromatic aberration, ACES, generated type, flash, vignette, seeded grain).
import * as THREE from 'three';
import { W, H, C } from './config.js';
import { NS } from './systems/fracture.js';

const quadVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function createPost(renderer) {
  const hf = { type: THREE.HalfFloatType, depthBuffer: false };
  const sceneRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const half = [new THREE.WebGLRenderTarget(W / 2, H / 2, hf), new THREE.WebGLRenderTarget(W / 2, H / 2, hf)];
  const quarter = [new THREE.WebGLRenderTarget(W / 4, H / 4, hf), new THREE.WebGLRenderTarget(W / 4, H / 4, hf)];
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const scene = new THREE.Scene(); scene.add(quad);

  const bright = new THREE.ShaderMaterial({ uniforms: { tIn: { value: null }, uThresh: { value: 0.55 } }, vertexShader: quadVert,
    fragmentShader: `uniform sampler2D tIn; uniform float uThresh; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tIn, vUv).rgb; float l = max(c.r,max(c.g,c.b)); float k = max(l - uThresh, 0.0); k = k*k/(k+0.4);
        gl_FragColor = vec4(c * (k/max(l,1e-4)), 1.0);} ` });
  const blur = new THREE.ShaderMaterial({ uniforms: { tIn: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: quadVert,
    fragmentShader: `uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv;
      void main(){ vec3 s = texture2D(tIn,vUv).rgb*0.2270;
        s += (texture2D(tIn,vUv+uDir*1.3846).rgb + texture2D(tIn,vUv-uDir*1.3846).rgb)*0.3162;
        s += (texture2D(tIn,vUv+uDir*3.2308).rgb + texture2D(tIn,vUv-uDir*3.2308).rgb)*0.0703;
        gl_FragColor = vec4(s,1.0);} ` });

  const sites = Array.from({ length: NS }, () => new THREE.Vector2());
  const final = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: sceneRT.texture }, tB1: { value: half[0].texture }, tB2: { value: quarter[0].texture },
      tText: { value: null }, tUnder: { value: null },
      uTime: { value: 0 }, uFrame: { value: 0 }, uFlash: { value: 0 }, uShard: { value: 0 }, uFront: { value: 0 },
      uCrack: { value: new THREE.Vector3() }, uImpact: { value: new THREE.Vector2() },
      uSites: { value: sites }, uOff: { value: sites.map(() => new THREE.Vector2()) }, uRot: { value: new Array(NS).fill(0) }, uTint: { value: new Array(NS).fill(1) },
      uAber: { value: 0.0015 }, uExposure: { value: 1 }, uBloom: { value: 0.9 }, uHaze: { value: 1 }, uHazeCol: { value: new THREE.Vector3(...C.ember) },
      uGrain: { value: 0.045 }, uVig: { value: 1 }, uUnder: { value: 0 },
    },
    vertexShader: quadVert,
    fragmentShader: `
      #define NS ${NS}
      uniform sampler2D tScene, tB1, tB2, tText, tUnder;
      uniform float uTime, uFrame, uFlash, uShard, uFront, uAber, uExposure, uBloom, uHaze, uGrain, uVig, uUnder;
      uniform vec3 uCrack, uHazeCol; uniform vec2 uImpact;
      uniform vec2 uSites[NS]; uniform vec2 uOff[NS]; uniform float uRot[NS]; uniform float uTint[NS];
      varying vec2 vUv;
      const float ASPECT = ${(W / H).toFixed(6)};
      float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
      vec3 sceneAt(vec2 uv, vec2 d){
        vec3 c; c.r = texture2D(tScene, uv + d).r; c.g = texture2D(tScene, uv).g; c.b = texture2D(tScene, uv - d).b;
        vec3 b = texture2D(tB1, uv + d*1.5).rgb*0.6 + texture2D(tB2, uv).rgb*1.0;
        return c*uExposure + b*uBloom;
      }
      void main(){
        vec2 uv = vUv; vec2 p = vec2(uv.x*ASPECT, uv.y);
        vec2 suv = uv; float gap = 0.0; float edge = 1e3; float tint = 1.0; float front = 0.0;
        if (uShard > 0.0) {
          int found = -1; vec2 q = p;
          for (int i = 0; i < NS; i++) {
            vec2 s = uSites[i]; float a = -uRot[i]; vec2 d = p - s - uOff[i];
            vec2 qi = s + vec2(cos(a)*d.x - sin(a)*d.y, sin(a)*d.x + cos(a)*d.y);
            vec2 e0 = qi - s; float di = dot(e0,e0); bool ok = true;
            for (int j = 0; j < NS; j++) { if (j == i) continue; vec2 e1 = qi - uSites[j]; if (dot(e1,e1) < di) { ok = false; break; } }
            if (ok) { found = i; q = qi; break; }
          }
          if (found < 0) gap = 1.0;
          else {
            vec2 si = uSites[found]; vec2 e0 = q - si; float di = dot(e0,e0);
            for (int j = 0; j < NS; j++) { if (j == found) continue; vec2 sj = uSites[j]; vec2 e1 = q - sj;
              edge = min(edge, (dot(e1,e1) - di) / (2.0*length(sj - si))); }
            suv = vec2(q.x/ASPECT, q.y); tint = uTint[found];
            if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) gap = 1.0;
          }
          front = step(length(q - uImpact), uFront);
        }
        // atmosphere: warm ink with domain-warped haze drifting on non-repeating noise
        vec2 hp = uv*vec2(ASPECT,1.0)*1.6;
        float hz = fbm(hp + vec2(uTime*0.031, -uTime*0.017) + 1.5*fbm(hp*0.7 - uTime*0.013));
        vec3 bg = vec3(0.010,0.0075,0.006) + uHazeCol*0.05*pow(hz,2.2)*uHaze;
        bg *= 1.0 + 0.6*exp(-dot(uv-0.5,uv-0.5)*4.0);
        vec2 ad = (uv - 0.5)*uAber;
        vec3 col = bg + sceneAt(suv, ad) * tint;
        if (uShard > 0.0) {
          if (gap > 0.5) {
            col = bg*0.35;
            vec4 un = texture2D(tUnder, uv);
            col += un.rgb*un.a*uUnder*2.2;
          }
          float g = (gap > 0.5 ? 0.0 : (exp(-edge*1100.0)*1.0 + exp(-edge*140.0)*0.22)) * front;
          col += uCrack * g;
        }
        col = aces(col);
        col = pow(col, vec3(1.0/2.2));
        // generated type (sRGB canvas), with a soft halo so it lives in the light
        vec4 tx = texture2D(tText, uv);
        float halo = 0.0; vec2 px = vec2(1.0/${W}.0, 1.0/${H}.0);
        for (int k = 0; k < 8; k++) { float a = float(k)*0.785398; halo += texture2D(tText, uv + vec2(cos(a),sin(a))*px*3.5).a; }
        col += vec3(1.0,0.7,0.42)*halo/8.0*0.22;
        col = mix(col, tx.rgb, tx.a);
        // vignette, flash, grain
        vec2 vv = uv - 0.5; col *= mix(1.0, 1.0 - dot(vv,vv)*1.35, uVig);
        col = mix(col, vec3(1.0), clamp(uFlash,0.0,1.0));
        float gr = h21(uv*vec2(${W}.0,${H}.0) + fract(uFrame*0.6180339)*vec2(97.0,57.0)) - 0.5;
        col += gr*uGrain*(0.6 + 0.4*(1.0 - dot(col, vec3(0.33))));
        gl_FragColor = vec4(clamp(col,0.0,1.0), 1.0);
      }`,
  });

  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(scene, cam); }
  function render(world, camera) {
    renderer.setRenderTarget(sceneRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(world, camera);
    bright.uniforms.tIn.value = sceneRT.texture; pass(bright, half[0]);
    blur.uniforms.tIn.value = half[0].texture; blur.uniforms.uDir.value.set(2 / W, 0); pass(blur, half[1]);
    blur.uniforms.tIn.value = half[1].texture; blur.uniforms.uDir.value.set(0, 2 / H); pass(blur, half[0]);
    blur.uniforms.tIn.value = half[0].texture; blur.uniforms.uDir.value.set(4 / W, 0); pass(blur, quarter[1]);
    blur.uniforms.tIn.value = quarter[1].texture; blur.uniforms.uDir.value.set(0, 4 / H); pass(blur, quarter[0]);
    blur.uniforms.tIn.value = quarter[0].texture; blur.uniforms.uDir.value.set(8 / W, 0); pass(blur, quarter[1]);
    blur.uniforms.tIn.value = quarter[1].texture; blur.uniforms.uDir.value.set(0, 8 / H); pass(blur, quarter[0]);
    pass(final, null);
  }
  return { render, uniforms: final.uniforms };
}
