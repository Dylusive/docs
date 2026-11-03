// THE NEW — director. renderFrame(f) is the only entry point: every property below is a function of f.
import * as THREE from 'three';
import { W, H, FPS, FRAMES, FOV, BREAK_T, BREAK_FRAME, BREAK_CAM_Z, ASPECT, SEED, C } from './config.js';
import { smoothstep, lerp, spring, SPRING, ease, win } from './util.js';
import { createTokens } from './systems/tokens.js';
import { createGraph, SWEEPS } from './systems/graph.js';
import { createFracture, IMPACT } from './systems/fracture.js';
import { createBloom } from './systems/bloom.js';
import { createLabs } from './systems/labs.js';
import { createSpiral } from './systems/spiral.js';
import { createDust } from './systems/dust.js';
import { createPost } from './post.js';
import { drawText } from './text.js';

const canvas = document.getElementById('film');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.autoClear = false;
const world = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 0.05, 200);
const post = createPost(renderer);

await Promise.all([
  document.fonts.load('700 46px "JetBrains Mono"'), document.fonts.load('800 30px "JetBrains Mono"'), document.fonts.load('400 13px "JetBrains Mono"'),
  document.fonts.load('700 132px "Space Grotesk"'), document.fonts.load('italic 400 40px "Instrument Serif"'),
]);

const graph = createGraph();
const tokens = createTokens(graph.nodes);
const fracture = createFracture();
const bloom = createBloom(fracture);
const labs = createLabs(bloom);
const spiral = createSpiral();
const dust = createDust();
const collapse = new THREE.Group(); collapse.add(bloom.object, labs.object);
world.add(dust.object, tokens.object, graph.object, fracture.object, collapse, spiral.object);

const fg = document.createElement('canvas'); fg.width = W; fg.height = H;
const under = document.createElement('canvas'); under.width = W; under.height = H;
const tText = new THREE.CanvasTexture(fg), tUnder = new THREE.CanvasTexture(under);
post.uniforms.tText.value = tText; post.uniforms.tUnder.value = tUnder;
post.uniforms.uSites.value.forEach((v, i) => v.copy(fracture.sites[i]));
post.uniforms.uTint.value = fracture.tints;
post.uniforms.uImpact.value.set(IMPACT[0], IMPACT[1]);

// ---------------- camera: three named moves blended with smoothstep, springs for the pull-back ----------------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function camA(t) { // seed + self-reading orbit, pushing in toward the prettiest frame
  const th = 0.035 * t + 0.48 * Math.sin((t - 8) * 0.31) * smoothstep(7, 10.5, t);
  const r = lerp(11.4, 9.8, ease.inOutSine(t / 9)) - 1.3 * smoothstep(15, 20.4, t);
  const el = 0.15 + 1.5 * smoothstep(7.5, 11, t) * (1 - smoothstep(15.5, 20.2, t));
  return { p: V(r * Math.sin(th), el, r * Math.cos(th)), l: V(0, 0, 0) };
}
const camB = () => ({ p: V(0, 0, BREAK_CAM_Z), l: V(0, 0, 0) }); // locked: the fracture is mapped to this exact view
function camC(t) { // reweave orbit → labs pull-back → collapse dive
  const u = t - 25.4, c = bloom.center;
  const th = 0.62 * Math.sin(u * 0.2) + 0.05 * u;
  const pull = spring(t - 34.0, SPRING.heavy), dive = ease.inOutCubic((t - 41.0) / 3.2);
  const r = (10.8 + 0.2 * u + 8.0 * pull) * (1 - 0.62 * dive);
  const el = (0.3 + 1.4 * smoothstep(26, 31, t) + 4.2 * pull) * (1 - 0.8 * dive);
  return { p: V(c[0] + r * Math.sin(th), c[1] + el, c[2] * 0.4 + r * Math.cos(th)), l: V(c[0], c[1] + 0.2 * (1 - dive), c[2] * (0.6 + 0.4 * dive)) };
}
function placeCamera(t) {
  const a = camA(t), b = camB(), c = camC(t);
  const wAB = smoothstep(19.4, 20.6, t), wBC = smoothstep(25.4, 27.2, t);
  const p = a.p.clone().lerp(b.p, wAB).lerp(c.p, wBC), l = a.l.clone().lerp(b.l, wAB).lerp(c.l, wBC);
  camera.position.copy(p); camera.up.set(0, 1, 0); camera.lookAt(l);
  camera.updateMatrixWorld();
}

const graphEdgesAtBreak = (() => { graph.update(BREAK_T - 0.01); return graph.stats.alive; })();

export function renderFrame(f) {
  const t = f / FPS;
  placeCamera(t);
  tokens.update(t);
  const prettiest = 1 + 0.7 * smoothstep(16.5, 20.8, t);
  const gstats = { ...graph.update(t, { intensity: prettiest, broken: smoothstep(BREAK_T, BREAK_T + 1.2, t) }) };
  fracture.update(t);
  const collapseK = ease.inOutCubic((t - 41.0) / 2.4);
  collapse.scale.setScalar(1 - 0.985 * collapseK); collapse.rotation.z = 2.4 * collapseK * collapseK;
  const c = bloom.center; collapse.position.set(c[0] * collapseK, c[1] * collapseK, c[2] * collapseK);
  bloom.update(t, 1 - smoothstep(42.6, 43.6, t));
  const lstats = labs.update(t, 1 - smoothstep(42.4, 43.4, t));
  spiral.update(t, camera);
  dust.update(t, 1 - 0.6 * smoothstep(41, 44, t));

  // ---------------- post uniforms ----------------
  const U = post.uniforms, tb = t - BREAK_T;
  U.uTime.value = t; U.uFrame.value = f;
  // THE ONE SHOCK: frame 630 is pure white; decays over ~8 frames. Three frames before, the light inhales.
  U.uFlash.value = f === BREAK_FRAME ? 1 : f > BREAK_FRAME && f < BREAK_FRAME + 12 ? 0.85 * Math.exp(-(f - BREAK_FRAME) * 0.5) : 0;
  const inhale = f >= BREAK_FRAME - 3 && f < BREAK_FRAME ? 0.55 + 0.15 * (BREAK_FRAME - 1 - f) : 1;
  const shardOn = t >= BREAK_T && t < 26.6;
  U.uShard.value = shardOn ? 1 : 0;
  if (shardOn) {
    const st = fracture.state(t);
    st.off.forEach((v, i) => U.uOff.value[i].copy(v)); U.uRot.value = st.rot;
    U.uFront.value = 0.05 + Math.max(0, tb) * 3.4;
    const hot = Math.exp(-tb * 2.2), cool = 1 - smoothstep(24.9, 26.0, t);
    U.uCrack.value.set(lerp(C.gold[0] * 1.6, 7, hot) * cool, lerp(C.gold[1] * 1.6, 6.6, hot) * cool, lerp(C.gold[2] * 1.6, 6.0, hot) * cool);
    U.uUnder.value = 1;
  }
  U.uExposure.value = (1 + 0.25 * smoothstep(16.5, 20.8, t) - 0.25 * smoothstep(BREAK_T, BREAK_T + 0.8, t) * (1 - smoothstep(24.5, 26, t))) * inhale;
  U.uBloom.value = 0.85 + 0.35 * smoothstep(16.5, 20.8, t) - 0.2 * smoothstep(BREAK_T, BREAK_T + 1, t) - 0.1 * smoothstep(26, 30, t);
  U.uAber.value = 0.0007 + 0.016 * Math.exp(-Math.max(0, tb) * 3.5) * (tb >= 0 ? 1 : 0) + 0.0008 * smoothstep(41, 44, t);
  U.uHaze.value = 0.8 + 0.6 * smoothstep(25, 30, t) - 0.3 * smoothstep(41, 45, t);
  const hz = t < 34 ? C.ember : C.ember.map((v, i) => lerp(v, C.phosphor[i] * 0.6, 0.35 * win(t, 34, 42, 1.5, 1.5)));
  U.uHazeCol.value.set(...hz);

  drawText(fg, under, t, f, {
    graph: gstats, pass: Math.max(1, SWEEPS.filter((s) => t >= s).length), graphEdges: graphEdgesAtBreak,
    bloom: bloom.bornCount(t), labs: lstats,
  });
  tText.needsUpdate = true; tUnder.needsUpdate = true;
  post.render(world, camera);
}

window.THE_NEW = {
  FRAMES, FPS, SEED,
  renderFrame,
  frameDataURL(f) { renderFrame(f); return canvas.toDataURL('image/png'); },
  ready: true,
};
document.dispatchEvent(new Event('the-new-ready'));
