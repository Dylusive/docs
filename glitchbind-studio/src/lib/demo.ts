/** The demo book that opens on first launch. All prose and art are original to GlitchBind Studio. */
import type { PMDoc, Project, Section } from '@/types'
import { blankProject, makeSection } from './defaults'
import { importImage } from './images'
import { saveProject } from './storage'
import { uid } from './units'

type N = Record<string, unknown>
const t = (text: string, ...marks: string[]): N => (marks.length ? { type: 'text', text, marks: marks.map((m) => ({ type: m })) } : { type: 'text', text })
const fn = (text: string): N => ({ type: 'footnote', attrs: { id: uid('n_'), text } })
const p = (...content: (string | N)[]): N => ({ type: 'paragraph', content: content.map((c) => (typeof c === 'string' ? t(c) : c)) })
const pull = (text: string): N => ({ type: 'pullQuote', content: [t(text)] })
const scene: N = { type: 'sceneBreak' }
const fig = (attrs: N): N => ({ type: 'figure', attrs: { id: uid('f_'), ...attrs } })
const doc = (...content: N[]): PMDoc => ({ type: 'doc', content }) as PMDoc
const cell = (text: string, header = false): N => ({ type: header ? 'tableHeader' : 'tableCell', content: [p(text)] })
const row = (cells: string[], header = false): N => ({ type: 'tableRow', content: cells.map((c) => cell(c, header)) })

function towerSvg(): string {
  let rays = ''
  for (let i = 0; i < 9; i++) {
    const a = (-80 + i * 20) * (Math.PI / 180)
    rays += `<line x1="300" y1="250" x2="${(300 + Math.sin(a) * 640).toFixed(0)}" y2="${(250 - Math.cos(a) * 640).toFixed(0)}" stroke="#141418" stroke-width="${i % 2 ? 1 : 2.2}" opacity="${i % 2 ? 0.35 : 0.6}"/>`
  }
  let waves = ''
  for (let i = 0; i < 7; i++) {
    const y = 640 + i * 22
    let d = `M0 ${y}`
    for (let x = 0; x <= 600; x += 30) d += ` Q${x + 15} ${y + (i % 2 ? -9 : 9)} ${x + 30} ${y}`
    waves += `<path d="${d}" fill="none" stroke="#141418" stroke-width="1.6" opacity="${0.85 - i * 0.1}"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800"><rect width="600" height="800" fill="#F6F3EA"/>${rays}<circle cx="300" cy="250" r="34" fill="#F6F3EA" stroke="#141418" stroke-width="3"/><circle cx="300" cy="250" r="12" fill="#141418"/><path d="M262 296h76l22 330H240z" fill="#F6F3EA" stroke="#141418" stroke-width="3"/><path d="M256 380h88M250 460h100M245 540h110" stroke="#141418" stroke-width="3"/><rect x="250" y="280" width="100" height="18" fill="#141418"/><rect x="288" y="560" width="24" height="66" fill="#141418"/><path d="M150 626h300l40 30H110z" fill="#141418"/>${waves}</svg>`
}

function mapSvg(): string {
  let contours = ''
  for (let i = 0; i < 9; i++) {
    const r = 46 + i * 34
    let d = ''
    for (let k = 0; k <= 48; k++) {
      const a = (k / 48) * Math.PI * 2
      const wobble = 1 + 0.16 * Math.sin(a * 3 + i * 0.7) + 0.09 * Math.cos(a * 5 - i)
      const x = 450 + Math.cos(a) * r * wobble * 1.25
      const y = 300 + Math.sin(a) * r * wobble * 0.78
      d += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    }
    contours += `<path d="${d}Z" fill="none" stroke="#141418" stroke-width="${i === 0 ? 2.4 : 1.2}" opacity="${1 - i * 0.085}"/>`
  }
  let grid = ''
  for (let x = 60; x < 900; x += 60) grid += `<line x1="${x}" y1="20" x2="${x}" y2="580" stroke="#141418" stroke-width=".5" opacity=".18"/>`
  for (let y = 60; y < 600; y += 60) grid += `<line x1="20" y1="${y}" x2="880" y2="${y}" stroke="#141418" stroke-width=".5" opacity=".18"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600"><rect width="900" height="600" fill="#F6F3EA"/>${grid}${contours}<rect x="20" y="20" width="860" height="560" fill="none" stroke="#141418" stroke-width="2"/><g transform="translate(770 500)"><path d="M-9 26h18l-5-50h-8z" fill="#141418"/><circle cx="0" cy="-30" r="6" fill="none" stroke="#141418" stroke-width="2"/><path d="M24 26v-22M24 4l10-12M24 8l-9 8M24 26l-7 14M24 26l7 14" stroke="#141418" stroke-width="2" fill="none"/><circle cx="24" cy="-2" r="4" fill="#141418"/></g><text x="44" y="556" font-family="Georgia, serif" font-size="15" font-style="italic" fill="#141418">Sheet XIII — soundings in fathoms</text></svg>`
}

function nightSvg(): string {
  let stars = ''
  let seed = 7
  const rnd = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let i = 0; i < 150; i++) stars += `<circle cx="${(rnd() * 1250).toFixed(0)}" cy="${(rnd() * 1250).toFixed(0)}" r="${(rnd() * 1.9 + 0.4).toFixed(1)}" fill="#fff" opacity="${(rnd() * 0.7 + 0.25).toFixed(2)}"/>`
  let bands = ''
  for (let i = 0; i < 14; i++) {
    const y = 1260 + i * 44
    let d = `M0 ${y}`
    for (let x = 0; x <= 1250; x += 50) d += ` Q${x + 25} ${y + (i % 2 ? -12 : 12)} ${x + 50} ${y}`
    bands += `<path d="${d}" fill="none" stroke="${i % 3 === 0 ? '#00E5FF' : '#C9C9DE'}" stroke-width="${i % 3 === 0 ? 2 : 1.2}" opacity="${(0.75 - i * 0.04).toFixed(2)}"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1250 1850" width="1250" height="1850"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07070D"/><stop offset=".62" stop-color="#15152A"/><stop offset="1" stop-color="#0B0B10"/></linearGradient><linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".95"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></linearGradient></defs><rect width="1250" height="1850" fill="url(#g)"/>${stars}<path d="M640 520 L1250 330 L1250 640 Z" fill="url(#b)" opacity=".8"/><path d="M610 520 L0 400 L0 600 Z" fill="url(#b)" opacity=".28" transform="translate(1250 0) scale(-1 1) translate(1250 0) scale(-1 1)"/><path d="M584 560h82l34 660H550z" fill="#0B0B10" stroke="#C9C9DE" stroke-width="3"/><rect x="572" y="536" width="106" height="26" fill="#C9C9DE"/><rect x="590" y="474" width="70" height="64" fill="#FFE9A8"/><path d="M582 474h86l-43-52z" fill="#C9C9DE"/><path d="M568 760h114M560 900h130M552 1040h146" stroke="#C9C9DE" stroke-width="3"/><path d="M0 1240 Q300 1180 625 1222 T1250 1236 V1850 H0Z" fill="#0B0B10"/>${bands}<rect x="0" y="770" width="1250" height="5" fill="#FF2BD6" opacity=".55"/><rect x="0" y="781" width="760" height="2" fill="#00E5FF" opacity=".7"/></svg>`
}

/** Rasterise an SVG to a deliberately modest PNG so the demo shows the DPI Guardian at work. */
async function rasterize(svg: string, width: number, height: number): Promise<Blob | null> {
  try {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const img = new Image()
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('svg')); img.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(img, 0, 0, width, height)
    URL.revokeObjectURL(url)
    return await new Promise((res) => canvas.toBlob((b) => res(b), 'image/png'))
  } catch { return null }
}

export const DEMO_TITLE = 'The Lighthouse at the Edge of the Signal'

export async function createDemoProject(): Promise<Project> {
  const base = blankProject(DEMO_TITLE, 'Mara Ellison')
  const towerSrc = towerSvg()
  const towerPng = await rasterize(towerSrc, 420, 560)
  const tower = await importImage(towerPng ?? new Blob([towerSrc], { type: 'image/svg+xml' }), towerPng ? 'harrow-point.png' : 'harrow-point.svg')
  const map = await importImage(new Blob([mapSvg()], { type: 'image/svg+xml' }), 'sheet-thirteen.svg')
  const night = await importImage(new Blob([nightSvg()], { type: 'image/svg+xml' }), 'the-light-comes-on.svg')

  const ch = (title: string, d: PMDoc): Section => ({ ...makeSection('chapter', title), doc: d })
  const chapters: Section[] = [
    ch('The Keeper of Dead Air', doc(
      p('Nobody applied for the job at Harrow Point, which is how Imogen Vale came to have it. The lighthouse had not guided a ship in forty years. What it guided now was signal: every stray broadcast that slid off the mainland and out over the water passed through the old lamp room, where a rack of receivers hummed like a hive in winter.'),
      fig({ imageId: tower.id, wrap: 'right', widthIn: 1.75, caption: 'Harrow Point, from the keepers’ log.', alt: 'Ink drawing of a lighthouse sending out rays over the sea' }),
      p('Her work was simple to describe and impossible to finish. She listened for the places where the signal tore — a newsreader’s sentence that skipped, a song that repeated one bar until it meant something else — and she mended them by hand.', fn('The keepers’ log calls this “darning.” The word appears in entries as early as 1961, long before anyone admitted the station existed.'), ' Most nights the tears were small. A breath of static. A dropped vowel.'),
      p('The night the map arrived, the tear was the size of the sky.'),
      p('It began as a flicker on the third receiver, the one she kept tuned to nothing. Then the nothing developed edges. Lines crawled across the green glass of the oscilloscope and did not behave like sound; they closed into loops, the loops nested, and the nest resolved into something Imogen recognised from the charts pinned above her bunk. Contours. Soundings. A coastline.'),
      pull('Someone was broadcasting a place.'),
      p('She copied it the only way she knew, pencil on the back of a tide table, while the tape reels turned and the lamp above her, dark for four decades, ticked once as though clearing its throat.'),
      scene,
      p('By morning the fog had come in and the drawing covered eleven sheets. She laid them edge to edge on the lamp-room floor and walked around them in her socks. It was not Harrow Point. It was not anywhere on the mainland charts. But in the lower corner, in the place where a cartographer signs their work, the static had drawn a small, careful lighthouse — and beside it, a figure with its hand raised.'),
    )),
    ch('Eleven Sheets', doc(
      p('She did what the manual said to do with an anomaly, which was to log it and wait. The manual had been written by people who believed waiting was a form of action.'),
      p('On the second night the broadcast returned at the same minute and added a twelfth sheet. This one was different: not coastline but interior, a pattern of rooms nested like the chambers of a shell. Imogen held it against the window. The rooms matched the lighthouse. Not roughly. ', t('Exactly', 'italic'), ' — down to the bricked-up door on the second landing that she had always assumed led nowhere.', fn('Trinity House drawings from 1887 show the door opening onto an “instrument store.” No later plan includes it.')),
      fig({ imageId: night.id, wrap: 'page', alt: 'A lighthouse at night, its beam cutting across a field of stars above a dark sea' }),
      { type: 'textBox', content: [p(t('From the Keeper’s Manual, Section 9', 'bold')), p('An unrecognised transmission is to be recorded in full, timed against the station clock, and never answered. The station listens. It does not speak.')] },
      p('She read Section 9 twice, as she always did, and then she fetched the crowbar.'),
      p('The mortar came away like wet sugar. Behind the bricks the air was cold and perfectly dry and smelled faintly of hot dust, the smell of a valve radio warming up. There was a desk. On the desk there was a transmitter older than the lighthouse had any right to contain, its dial lit a low amber, and in front of it a chair pushed back as though someone had only just stood up.'),
      { type: 'table', content: [row(['Sheet', 'Received', 'Subject'], true), row(['1 – 11', 'First night, 02:14', 'Coastline and soundings']), row(['12', 'Second night, 02:14', 'Interior of the lighthouse']), row(['13', 'Not yet received', 'Unknown'])] },
      p('The logbook lay open beside the key. The last entry was in her own handwriting. It was dated tomorrow.'),
    )),
    ch('The Answer', doc(
      p('There is a particular silence that falls when a machine is waiting for you. Imogen had heard it in lifts and in hospital corridors. She heard it now, in the hidden room, with her own future handwriting drying on the page.'),
      p('The entry was short. ', t('Sheet thirteen sent 02:14. Reply expected.', 'italic'), ' Below it, in pencil, the same hand had added a line she would think about for the rest of her life: ', t('You will be tempted to mend this. Don’t. It isn’t torn.', 'italic')),
      fig({ imageId: map.id, wrap: 'inline', widthIn: 3.6, caption: 'Sheet thirteen, as transmitted.', alt: 'A contour map of an unknown island with a tiny lighthouse and waving figure in the corner' }),
      p('She understood then what the forty years of darning had been for. Not repair. Practice. Every skipped sentence she had stitched, every looping bar of music she had eased back into time, had been teaching her hands the grammar of the signal — so that when the moment came she could do more than listen.'),
      pull('The station listens. It does not speak. But nobody had ever said anything about drawing.'),
      p('At 02:13 she sat down in the chair. At 02:14 she put her hand on the key and, instead of words, sent the only honest answer she had: the lamp room, the eleven sheets on the floor, a small figure with its hand raised.'),
      p('Out past the fog, where no chart had ever put anything at all, a light came on.'),
    )),
  ]
  const dedication: Section = { ...makeSection('dedication'), doc: doc(p('For everyone who keeps a light on'), p('for a signal that has not arrived yet.')) }
  const about: Section = { ...makeSection('about'), doc: doc(p('Mara Ellison writes quiet science fiction about lonely machines and the people who look after them. She lives on a stretch of coast with famously unreliable radio reception, which she insists is a coincidence.'), p('This demo book was set entirely in GlitchBind Studio. Change the trim size, apply a Book Theme, or drop an image onto any page — every page reflows as you watch.')) }

  const project: Project = {
    ...base,
    meta: { ...base.meta, subtitle: 'A GlitchBind demo novella', publisher: 'Static Lantern Press', copyrightHolder: 'Mara Ellison', description: 'Imogen Vale keeps a lighthouse that no longer guides ships. It guides signal — and one night the static starts drawing her a map of somewhere that does not exist.' },
    sections: [base.sections[0], base.sections[1], dedication, base.sections[2], ...chapters, about],
    images: [tower, map, night],
    cover: { background: '#0B0B10', spineColor: null, backColor: null, items: [], laidOutFor: null },
  }
  await saveProject(project)
  return project
}
