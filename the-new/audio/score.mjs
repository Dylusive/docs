// THE NEW — score synthesized from nothing. 48 kHz, 100 BPM (one beat = 18 video frames = 28 800 samples).
// D minor. Before THE BREAK: drone, heartbeat, pad, token rain, riser. Impact on frame 630, sample-exact.
// After THE BREAK the score gains a layer it never had: an arpeggio that *learns* — it starts with two notes
// and sparse steps, and adds pitches and density as the bloom grows. It ends unresolved, mid-phrase.
import fs from 'node:fs'
import path from 'node:path'
import { SEED, BPM, FPS, BREAK_FRAME, DURATION } from '../src/config.js'

const SR = 48000
const N = SR * DURATION
const BEAT = 60 / BPM
const IMPACT = BREAK_FRAME * (SR / FPS) // 1 008 000
const L = new Float32Array(N)
const R = new Float32Array(N)
const RL = new Float32Array(N)
const RR = new Float32Array(N) // reverb send
const ROOT = path.dirname(new URL(import.meta.url).pathname)

// seeded rng (same family as picture)
let s = SEED ^ 0xa0d10
const rnd = () => {
  s |= 0
  s = (s + 0x6d2b79f5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const hash = (k, salt = 0) => {
  let x = (k * 374761393 + salt * 668265263 + SEED) | 0
  x = Math.imul(x ^ (x >>> 13), 1274126177)
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
const sst = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5))
const tri = (ph) => 1 - 4 * Math.abs(ph - Math.floor(ph + 0.5))
function add(i, l, r, send = 0) {
  if (i < 0 || i >= N) return
  L[i] += l
  R[i] += r
  RL[i] += l * send
  RR[i] += r * send
}

// ---------- 1. drone: detuned saws on D1/A1 through a wandering one-pole lowpass ----------
{
  let lp1 = 0
  let lp2 = 0
  const ph = [0, 0, 0, 0]
  const fr = [mtof(26), mtof(26) * 1.004, mtof(33), mtof(33) * 0.997]
  for (let i = 0; i < N; i++) {
    const t = i / SR
    let x = 0
    for (let k = 0; k < 4; k++) {
      ph[k] += fr[k] / SR
      x += saw(ph[k] % 1) * (k < 2 ? 0.5 : 0.32)
    }
    const cut =
      90 +
      160 * (0.5 + 0.5 * Math.sin(t * 0.21) * Math.sin(t * 0.077 + 1)) +
      260 * sst(17, 21, t) * (t < 21 ? 1 : 0) +
      140 * sst(25, 34, t)
    const a = 1 - Math.exp((-2 * Math.PI * cut) / SR)
    lp1 += a * (x - lp1)
    lp2 += a * (lp1 - lp2)
    const env =
      sst(0, 3, t) * (t < 21 ? 1 : 0.7 + 0.3 * sst(22, 26, t)) * (1 - 0.5 * sst(44, 48, t))
    const v = lp2 * 0.22 * env
    add(i, v, v, 0.15)
  }
}
// ---------- 2. heartbeat: sine kick on every beat (frame-locked) ----------
function kick(t0, amp) {
  const i0 = Math.round(t0 * SR)
  let ph = 0
  for (let j = 0; j < SR * 0.5; j++) {
    const t = j / SR
    const f = 42 + 80 * Math.exp(-t * 28)
    ph += f / SR
    const v = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 7) * amp
    add(i0 + j, v, v, 0.05)
  }
}
for (let b = 2; b * BEAT < 44.5; b++) {
  const t = b * BEAT
  if (t > 20.9 && t < 25.1) continue // the heart stops for the break
  const amp =
    0.18 +
    0.12 * sst(8, 12, t) +
    0.25 * sst(17, 20.8, t) * (t < 21 ? 1 : 0) +
    0.18 * sst(25, 27, t) -
    0.25 * sst(40, 44, t)
  kick(t, Math.max(0.05, amp))
}
// ---------- 3. pad: Dm | Bb | Gm | A, two bars each; final chord Bb(add9) never resolves ----------
const CHORDS = [
  [50, 53, 57, 62],
  [46, 53, 58, 62],
  [43, 50, 55, 58],
  [45, 52, 57, 61],
]
const BAR = BEAT * 4
function chordAt(t) {
  if (t >= 43.2) return [46, 53, 60, 62, 69]
  return CHORDS[Math.floor(t / (BAR * 2)) % 4]
}
{
  const voices = 5
  const ph = new Float64Array(voices * 3)
  let lpL = 0
  let lpR = 0
  const cur = new Float64Array(voices).fill(50)
  for (let i = 0; i < N; i++) {
    const t = i / SR
    const ch = chordAt(t)
    let l = 0
    let r = 0
    for (let v = 0; v < voices; v++) {
      const target = ch[v % ch.length] + (v >= ch.length ? 12 : 0)
      cur[v] += (target - cur[v]) * 0.0004 // slow glide = voice-leading
      for (let d = 0; d < 3; d++) {
        const k = v * 3 + d
        ph[k] += (mtof(cur[v]) * (1 + (d - 1) * 0.0035)) / SR
        const x = saw(ph[k] % 1)
        if (d === 0) l += x
        else if (d === 2) r += x
        else {
          l += x * 0.5
          r += x * 0.5
        }
      }
    }
    const cut =
      380 +
      520 * sst(10, 20, t) -
      300 * sst(20.8, 21.2, t) +
      900 * sst(25, 33, t) -
      700 * sst(42, 48, t)
    const a = 1 - Math.exp((-2 * Math.PI * Math.max(120, cut)) / SR)
    lpL += a * (l - lpL)
    lpR += a * (r - lpR)
    const env = sst(6.5, 11, t) * (t < 21 ? 1 : 0.35 + 0.65 * sst(23.5, 27, t))
    add(i, lpL * 0.03 * env, lpR * 0.03 * env, 0.5)
  }
}
// ---------- 4. token rain (scene 1): seeded glints in D minor pentatonic ----------
{
  const PENT = [74, 77, 79, 81, 84, 86, 89, 91, 93]
  let t = 0.4
  while (t < 8.6) {
    const m = PENT[Math.floor(rnd() * PENT.length)]
    const f = mtof(m)
    const amp = 0.035 * (0.4 + rnd()) * sst(0.2, 2, t) * (1 - sst(7.2, 8.6, t))
    const pan = rnd()
    const i0 = Math.round(t * SR)
    for (let j = 0; j < SR * 0.35; j++) {
      const tt = j / SR
      const v = Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * 14) * amp
      add(i0 + j, v * (1 - pan), v * pan, 0.6)
    }
    t += 0.03 + rnd() * 0.11
  }
}
// ---------- 5. scan ticks (scene 2): sixteenth-note clicks while the ring reads the graph ----------
{
  const SW = [9.0, 11.9, 14.6]
  for (let k = 0; (k * BEAT) / 4 < 17; k++) {
    const t = (k * BEAT) / 4
    const on = SW.some((s0) => t >= s0 && t < s0 + 2.3)
    if (!on) continue
    const i0 = Math.round(t * SR)
    const amp = k % 4 === 0 ? 0.05 : 0.025
    for (let j = 0; j < 600; j++) {
      const v = (rnd() * 2 - 1) * Math.exp(-j / 70) * amp
      add(i0 + j, v * 0.6, v, 0.3)
    }
  }
}
// ---------- 6. riser into the break, the inhale, and THE IMPACT (sample-exact on frame 630) ----------
{
  let bp1 = 0
  let bp2 = 0
  let ph = 0
  const i0 = Math.round(18.6 * SR)
  const inhale = IMPACT - 3 * (SR / FPS)
  for (let i = i0; i < inhale; i++) {
    const t = i / SR
    const u = (t - 18.6) / (inhale / SR - 18.6)
    const f = 300 + 5200 * u * u
    const a = 1 - Math.exp((-2 * Math.PI * f) / SR)
    const n = rnd() * 2 - 1
    bp1 += a * (n - bp1)
    bp2 += a * (bp1 - bp2)
    ph += (110 + 330 * u * u) / SR
    const v = ((bp1 - bp2) * 0.35 + Math.sin(2 * Math.PI * ph) * 0.06) * u * u
    add(i, v, v * 0.9, 0.4)
  }
  // impact: sub drop + noise crack + inharmonic glass, all starting at IMPACT
  let sp = 0
  for (let j = 0; j < SR * 4; j++) {
    const t = j / SR
    const i = IMPACT + j
    sp += (30 + 60 * Math.exp(-t * 6)) / SR
    const sub = Math.sin(2 * Math.PI * sp) * Math.exp(-t * 1.1) * 0.75
    const crack = (rnd() * 2 - 1) * Math.exp(-t * 26) * 0.7
    let glass = 0
    ;[1183, 1731, 2417, 3169, 4211].forEach((f, k) => {
      glass += (Math.sin(2 * Math.PI * f * t + k) * Math.exp(-t * (0.9 + k * 0.5))) / (k + 1.5)
    })
    add(i, sub + crack + glass * 0.12, sub + crack * 0.9 + glass * 0.12 * 0.9, 0.55)
  }
}
// ---------- 7. THE NEW LAYER (after the break only): a learning arpeggio ----------
const STAGES = [
  [25.0, [62, 69]],
  [27.0, [62, 65, 69, 74]],
  [29.4, [62, 65, 69, 72, 74, 77]],
  [31.8, [62, 65, 69, 72, 74, 76, 77, 81]],
]
const arpHits = []
{
  const STEP = BEAT / 4
  const k0 = Math.ceil(25.0 / STEP)
  for (let k = k0; k * STEP < DURATION; k++) {
    const t = k * STEP
    const density = 0.22 + 0.78 * sst(25, 33, t)
    if (k % 4 !== 0 && hash(k, 1) > density) continue
    let set = STAGES.filter((st) => t >= st[0])
      .pop()[1]
      .slice()
    if (Math.floor(t / (BAR * 2)) % 4 === 3 && t < 43.2)
      set = set.map((m) => (m === 72 ? 73 : m === 65 ? 64 : m === 77 ? 76 : m))
    if (t >= 43.2)
      set = [62, 65, 69, 72, 74].slice(0, Math.max(1, 5 - Math.floor((t - 43.2) / 1.0))) // thinning to one stubborn note
    const m = set[(k * 3 + Math.floor(k / 4)) % set.length]
    arpHits.push([t, m])
    const f = mtof(m)
    const i0 = Math.round(t * SR)
    const pan = k % 2 ? 0.3 : 0.7
    const bright = 0.5 + 0.5 * Math.min(1, (t - 25) / 8) - 0.4 * sst(42, 48, t)
    const amp = 0.075 * sst(25.0, 26.5, t) * (1 + 0.2 * (k % 4 === 0))
    let ph = 0
    for (let j = 0; j < SR * 0.6; j++) {
      const tt = j / SR
      const i = i0 + j
      if (i >= N) break
      ph += f / SR
      const env = Math.min(1, tt / 0.003) * Math.exp(-tt * (7 - 2 * bright))
      const v = (tri(ph % 1) * 0.7 + Math.sin(4 * Math.PI * ph) * 0.3 * bright) * env * amp
      add(i, v * (1 - pan), v * pan, 0.35)
    }
  }
  // ping-pong delay on the arp only (dotted eighth = 0.45 s = 13.5 frames)
  const D = Math.round(BEAT * 0.75 * SR)
  const dl = new Float32Array(N)
  const dr = new Float32Array(N)
  const tmpL = new Float32Array(N)
  const tmpR = new Float32Array(N)
  // re-render arp dry into tmp for the delay feed (cheap: second pass using the same hits)
  for (const [t, m] of arpHits) {
    const f = mtof(m)
    const i0 = Math.round(t * SR)
    let ph = 0
    for (let j = 0; j < SR * 0.4; j++) {
      const i = i0 + j
      if (i >= N) break
      ph += f / SR
      const v = tri(ph % 1) * Math.exp(-(j / SR) * 7) * 0.03 * sst(25, 26.5, t)
      tmpL[i] += v
      tmpR[i] += v
    }
  }
  for (let i = D; i < N; i++) {
    dl[i] = tmpR[i - D] + dr[i - D] * 0.38
    dr[i] = tmpL[i - D] + dl[i - D] * 0.38
    add(i, dl[i], dr[i], 0.2)
  }
}
// ---------- 8. labs sonar: a ping every two beats, panned with the sweep ----------
for (let b = Math.ceil(34.8 / BEAT); b * BEAT < 41.5; b += 2) {
  const t = b * BEAT
  const i0 = Math.round(t * SR)
  const pan = 0.5 + 0.45 * Math.sin(t * 1.6)
  for (let j = 0; j < SR * 1.2; j++) {
    const tt = j / SR
    const v = Math.sin(2 * Math.PI * 1318.5 * tt) * Math.exp(-tt * 5) * 0.05 * sst(34.5, 36, t)
    add(i0 + j, v * (1 - pan), v * pan, 0.6)
  }
}
// ---------- 9. spiral shimmer (41–48): high fifths swelling into the reverb ----------
for (let i = Math.round(40.5 * SR); i < N; i++) {
  const t = i / SR
  const env = sst(40.5, 44, t) * 0.03
  const v =
    (Math.sin(2 * Math.PI * mtof(86) * t) +
      Math.sin(2 * Math.PI * mtof(93) * t * 1.001) * 0.7 +
      Math.sin(2 * Math.PI * mtof(96) * t) * 0.4 * sst(44, 47, t)) *
    env *
    (0.7 + 0.3 * Math.sin(t * 5.3))
  add(i, v, v * 0.95, 0.9)
}
// ---------- reverb: Freeverb (8 combs + 4 allpasses per side) ----------
function freeverb(inp, spread) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({
    b: new Float32Array(d + spread),
    i: 0,
    f: 0,
  }))
  const aps = [556, 441, 341, 225].map((d) => ({ b: new Float32Array(d + spread), i: 0 }))
  const out = new Float32Array(N)
  const fb = 0.86
  const damp = 0.3
  for (let n = 0; n < N; n++) {
    const x = inp[n] * 0.015
    let y = 0
    for (const c of combs) {
      const o = c.b[c.i]
      c.f = o * (1 - damp) + c.f * damp
      c.b[c.i] = x + c.f * fb
      c.i = (c.i + 1) % c.b.length
      y += o
    }
    for (const a of aps) {
      const o = a.b[a.i]
      const v = -y + o
      a.b[a.i] = y + o * 0.5
      a.i = (a.i + 1) % a.b.length
      y = v
    }
    out[n] = y
  }
  return out
}
const wl = freeverb(RL, 0)
const wr = freeverb(RR, 23)
// ---------- master: sum, gentle tanh, normalise to -1 dBFS, 8 ms tail-guard (the ending is a cut, not a fade) ----------
let peak = 0
const outL = new Float32Array(N)
const outR = new Float32Array(N)
for (let i = 0; i < N; i++) {
  outL[i] = Math.tanh((L[i] + wl[i] * 2.2) * 1.4)
  outR[i] = Math.tanh((R[i] + wr[i] * 2.2) * 1.4)
  peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]))
}
const g = 0.891 / peak
const guard = SR * 0.008
const buf = Buffer.alloc(44 + N * 4)
buf.write('RIFF', 0)
buf.writeUInt32LE(36 + N * 4, 4)
buf.write('WAVEfmt ', 8)
buf.writeUInt32LE(16, 16)
buf.writeUInt16LE(1, 20)
buf.writeUInt16LE(2, 22)
buf.writeUInt32LE(SR, 24)
buf.writeUInt32LE(SR * 4, 28)
buf.writeUInt16LE(4, 32)
buf.writeUInt16LE(16, 34)
buf.write('data', 36)
buf.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) {
  const inh = i >= IMPACT - 3 * (SR / FPS) && i < IMPACT ? 0.18 : 1 // the inhale: 3 frames of near-silence, matching the picture
  const e = (i > N - guard ? (N - i) / guard : 1) * inh
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[i] * g * e)) * 32767), 44 + i * 4)
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[i] * g * e)) * 32767), 46 + i * 4)
}
fs.mkdirSync(path.join(ROOT, '..', 'build'), { recursive: true })
fs.writeFileSync(path.join(ROOT, '..', 'build', 'score.wav'), buf)
console.log(
  `score.wav: ${DURATION}s, impact at sample ${IMPACT} (= frame ${BREAK_FRAME}), arp hits ${
    arpHits.length
  } (all after t=25.0s: ${arpHits.every(([t]) => t >= 25)})`
)
