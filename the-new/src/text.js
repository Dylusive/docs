// Generated type. Nothing is pasted: every glyph on screen is chosen per frame by a pure function
// (type / decrypt / reassemble / measure / resolve), seeded by character index and frame number.
import { W, H, BREAK_T } from './config.js'
import { hash, spring, SPRING, clamp01, smoothstep } from './util.js'

const SCR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>?'
const FRAG = "_-/\\|:.'`,"
const scr = (i, f, salt, set = SCR) =>
  set[Math.floor(hash(i, Math.floor(f / 2), salt) * set.length)]
const BONE = [244, 234, 219]
const AMBER = [255, 170, 96]
const GOLD = [255, 226, 176]
const PHOS = [178, 245, 199]
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

function monoLine(g, text, t, f, o) {
  const { y, size = 30, weight = 800, track = 7, style, tIn, tOut = Infinity, salt = 1, words } = o
  g.font = `${weight} ${size}px "JetBrains Mono"`
  const cw = g.measureText('M').width + track
  const n = text.length
  const x0 = W / 2 - (n * cw - track) / 2
  let lastVisible = -1
  for (let i = 0; i < n; i++) {
    const ch = text[i]
    if (ch === ' ') continue
    let show = null
    let col = BONE
    let a = 1
    let dy = 0
    if (style === 'type') {
      // word-by-word: each word starts at its own beat, its letters are typed 45ms apart
      let wi = 0
      let k = 0
      for (let j = 0; j < i; j++)
        if (text[j] === ' ') {
          wi++
          k = j + 1
        }
      const ti = words[wi] + (i - k) * 0.045
      if (t >= ti) {
        show = ch
        lastVisible = i
      }
    } else if (style === 'decrypt') {
      const s = tIn + i * 0.03
      const l = tIn + 0.35 + (i / n) * 1.0 + hash(i, 7, salt) * 0.15
      if (t >= l) show = ch
      else if (t >= s) {
        show = scr(i, f, salt)
        col = AMBER
        a = 0.85
      }
    } else if (style === 'reassemble') {
      const l = tIn + 0.2 + hash(i, 3, salt) * 1.2
      const s = l - 0.6
      if (t >= l) {
        show = ch
        dy = 16 * (1 - spring(t - l, SPRING.settle)) * (hash(i, 5, salt) < 0.5 ? -1 : 1)
      } else if (t >= s) {
        show = scr(i, f, salt, FRAG)
        col = AMBER
        a = 0.7
        dy = (hash(i, 9, salt) - 0.5) * 30 * (l - t)
      }
    } else if (style === 'measure') {
      const l = tIn + 0.3 + (i / n) * 1.1
      const s = tIn + hash(i, 4, salt) * 0.3
      if (t >= l) show = ch
      else if (t >= l - 0.18) {
        show = scr(i, f, salt)
        col = PHOS
      } else if (t >= s) {
        show = '·'
        col = PHOS
        a = 0.6
      }
    }
    // out: every caption is un-written, not faded
    const lo = tOut + hash(i, 11, salt) * 0.45
    if (t >= lo + 0.15) show = null
    else if (t >= lo && show) {
      show = scr(i, f, salt + 9)
      col = AMBER
      a = 0.7
    }
    if (!show) continue
    g.fillStyle = rgba(col, a)
    g.fillText(show, x0 + i * cw, y + dy)
  }
  if (style === 'type' && t < tOut) {
    // the machine's cursor
    const on = Math.floor(f / 9) % 2 === 0
    if (on) {
      g.fillStyle = rgba(AMBER, 0.9)
      g.fillRect(x0 + (lastVisible + 1) * cw + 2, y - size * 0.78, size * 0.5, size * 0.95)
    }
  }
}

export function drawText(fg, under, t, f, hud) {
  const g = fg.getContext('2d')
  const u = under.getContext('2d')
  g.clearRect(0, 0, W, H)
  u.clearRect(0, 0, W, H)
  g.textBaseline = 'alphabetic'
  g.textAlign = 'left'
  g.shadowColor = 'rgba(0,0,0,0.9)'
  g.shadowBlur = 22
  const capY = H - 112
  if (t < 8.2)
    monoLine(g, 'IT BEGAN AS WORDS.', t, f, {
      y: capY,
      style: 'type',
      words: [0.9, 1.8, 2.6, 3.5],
      tOut: 7.3,
      salt: 11,
    })
  if (t > 9 && t < 17.2)
    monoLine(g, 'THEN IT LEARNED TO READ ITSELF.', t, f, {
      y: capY,
      style: 'decrypt',
      tIn: 9.6,
      tOut: 16.3,
      salt: 12,
    })
  if (t > 26 && t < 34.2)
    monoLine(g, 'EVERY FAILURE BECOMES ARCHITECTURE.', t, f, {
      y: capY,
      style: 'reassemble',
      tIn: 26.6,
      tOut: 33.2,
      salt: 14,
    })
  if (t > 35 && t < 41.2)
    monoLine(g, 'AND THE LABS LEARNED TO WATCH IT LEARN.', t, f, {
      y: capY,
      style: 'measure',
      tIn: 35.3,
      tOut: 40.4,
      salt: 15,
    })

  // THE BREAK line lives *under* the shards: only the opened fault can show it
  if (t > BREAK_T && t < 25.4) {
    const text = 'IT IMPROVES BY BREAKING WHAT IT BELIEVES.'
    u.font = '800 27px "JetBrains Mono"'
    u.textBaseline = 'middle'
    const cw = u.measureText('M').width + 5
    const n = text.length
    const x0 = W / 2 - (n * cw - 5) / 2
    for (let i = 0; i < n; i++) {
      const ch = text[i]
      if (ch === ' ') continue
      const cx = (x0 + i * cw) / W
      const dx = Math.abs(cx - 0.565)
      const s = BREAK_T + 0.08 + dx * 0.9
      const l = BREAK_T + 0.35 + dx * 2.0 + hash(i, 2, 13) * 0.2
      const lo = 24.5 + hash(i, 6, 13) * 0.35
      let show = null
      let col = GOLD
      if (t >= l) show = ch
      else if (t >= s) {
        show = scr(i, f, 13)
        col = AMBER
      }
      if (t >= lo + 0.15) show = null
      else if (t >= lo && show) {
        show = scr(i, f, 31)
        col = AMBER
      }
      if (!show) continue
      u.fillStyle = rgba(col, 1)
      u.fillText(show, x0 + i * cw, H / 2)
    }
  }

  // HUD: the numbers are the mechanism, read live from the systems
  g.shadowBlur = 10
  g.font = '400 13px "JetBrains Mono"'
  const hudLine = (s, a, x = 48, y = H - 44) => {
    g.fillStyle = rgba(PHOS, 0.72 * a)
    g.fillText(s, x, y)
  }
  if (hud.graph && t > 9.2 && t < 16.8) {
    const a = smoothstep(9.2, 9.8, t) * (1 - smoothstep(16.3, 16.8, t))
    const s = hud.graph
    hudLine(
      `self-read pass ${hud.pass}/3   pruned ${String(s.pruned).padStart(3, '0')}   grown ${String(
        s.grown
      ).padStart(3, '0')}   edges ${String(s.alive).padStart(4, '0')}`,
      a
    )
  }
  if (t > 17.4 && t < 24.9) {
    const pre = t < BREAK_T
    const a = smoothstep(17.4, 18, t) * (1 - smoothstep(24.4, 24.9, t))
    const conf = pre ? 0.912 + 0.085 * smoothstep(17.4, 20.9, t) : 0.31 + 0.02 * Math.sin(t * 9)
    const glitch = !pre && t < BREAK_T + 0.5 ? scr(0, f, 77) : ''
    hudLine(`self-model confidence ${conf.toFixed(3)}${pre ? '' : '  // revising'}${glitch}`, a)
  }
  if (hud.bloom && t > 25.8 && t < 33.8) {
    const a = smoothstep(25.8, 26.4, t) * (1 - smoothstep(33.3, 33.8, t))
    hudLine(
      `structure  ${hud.graphEdges} edges before the break  ->  ${hud.bloom.toLocaleString(
        'en-US'
      )} segments grown from its faults`,
      a
    )
  }
  if (hud.labs && t > 35 && t < 40.8) {
    const a = smoothstep(35, 35.6, t) * (1 - smoothstep(40.3, 40.8, t))
    hudLine(
      `observer lock error ${hud.labs.err.toFixed(3)}   observations ${String(
        hud.labs.sparks
      ).padStart(4, '0')}`,
      a
    )
  }

  // SCENE 6 — title resolves from the centre outward; subtitle typed; the price; a cursor that never stops
  if (t > 42.2) {
    g.shadowBlur = 30
    g.shadowColor = 'rgba(0,0,0,0.95)'
    const title = 'THE NEW'
    const ty = H * 0.47
    g.font = '700 132px "Space Grotesk"'
    const track = 10
    const widths = [...title].map((c) => g.measureText(c).width)
    const total = widths.reduce((a, b) => a + b, 0) + track * (title.length - 1)
    let x = W / 2 - total / 2
    for (let i = 0; i < title.length; i++) {
      const ch = title[i]
      const w = widths[i]
      if (ch !== ' ') {
        const d = Math.abs(i - 3)
        const s = 42.3 + d * 0.12
        const l = 42.75 + d * 0.22 + hash(i, 1, 21) * 0.1
        const rev = i === 4 && t > 46.45 && t < 46.75 // one live revision of the title
        let show = null
        let col = BONE
        let a = 1
        let sc = 1
        if (t >= l && !rev) {
          show = ch
          const rl = i === 4 && t > 46.75 ? 46.75 : l
          sc = 1 + 0.28 * (1 - spring(t - rl, SPRING.settle))
        } else if (t >= s) {
          show = scr(i, f, 21)
          col = AMBER
          a = 0.75
        }
        if (show) {
          g.save()
          g.translate(x + w / 2, ty)
          g.scale(sc, sc)
          g.textAlign = 'center'
          g.fillStyle = rgba(col, a)
          g.fillText(show, 0, 0)
          g.restore()
        }
      }
      x += w + track
    }
    g.textAlign = 'center'
    g.shadowBlur = 18
    const sub = 'the machine, revising the machine'
    const ns = Math.floor(clamp01((t - 44.3) / 1.15) * sub.length)
    if (ns > 0) {
      g.font = 'italic 400 40px "Instrument Serif"'
      g.fillStyle = rgba(BONE, 0.92)
      g.fillText(sub.slice(0, ns), W / 2, ty + 74)
    }
    const fin = 'the price of getting better is never being finished.'
    const nf = Math.floor(clamp01((t - 45.9) / 1.43) * fin.length)
    if (t > 45.9) {
      g.font = '400 17px "JetBrains Mono"'
      g.textAlign = 'left'
      const fw = g.measureText(fin).width
      const fx = W / 2 - fw / 2
      const fy = H - 92
      g.fillStyle = rgba([220, 205, 185], 0.88)
      g.fillText(fin.slice(0, nf), fx, fy)
      const cx = fx + g.measureText(fin.slice(0, nf)).width + 4
      if (nf < fin.length || Math.floor(f / 15) % 2 === 0) {
        g.fillStyle = rgba(AMBER, 0.95)
        g.fillRect(cx, fy - 13, 9, 16)
      }
    }
  }
}
