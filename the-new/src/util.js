import { SEED } from './config.js'

// ---------- deterministic randomness (no Math.random anywhere) ----------
export function ihash(x) {
  x |= 0
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  x = Math.imul(x, 0x846ca68b)
  x ^= x >>> 16
  return x >>> 0
}
/** hash(a,b,c) -> [0,1), stable for given ints and the global SEED */
export function hash(a, b = 0, c = 0) {
  return ihash(ihash(ihash((a | 0) ^ SEED) + (b | 0)) + (c | 0)) / 4294967296
}
/** seeded stream: rng(salt) gives an independent generator per system */
export function rng(salt = 0) {
  let a = ihash(SEED ^ ihash(salt + 0x9e3779b9))
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- named easing curves ----------
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x)
export const lerp = (a, b, t) => a + (b - a) * t
export const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}
export const ease = {
  inOutSine: (t) => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2,
  inOutCubic: (t) => {
    t = clamp01(t)
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  },
  outCubic: (t) => 1 - Math.pow(1 - clamp01(t), 3),
  outQuart: (t) => 1 - Math.pow(1 - clamp01(t), 4),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(t))),
  inQuad: (t) => clamp01(t) * clamp01(t),
}
/** window: 0 before a, ramps to 1 over fi, holds, ramps back to 0 over fo ending at b */
export const win = (t, a, b, fi, fo) => smoothstep(a, a + fi, t) * (1 - smoothstep(b - fo, b, t))

// ---------- springs: closed-form damped harmonic step response (pure function of time) ----------
export const SPRING = {
  snap: { w: 18, z: 0.38 }, // fracture jolt
  settle: { w: 9, z: 0.62 }, // re-forming shards, title glyphs
  soft: { w: 5, z: 0.9 }, // captions, camera nudges
  heavy: { w: 2.2, z: 1.0 }, // camera pull-back
}
export function spring(t, s = SPRING.soft) {
  if (t <= 0) return 0
  const { w, z } = s
  if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t)
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}
