/** Builds a long book from the public-domain fixture — used to prove performance and the KDP gutter rule. */
import type { PMDoc, Project, Section } from '@/types'
import { blankProject, makeSection } from './defaults'
import { FIXTURE } from './pagination/fixture'
import { importImage } from './images'
import { saveProject } from './storage'
import { uid } from './units'

function plate(i: number): string {
  const hue = (i * 47) % 360
  let rings = ''
  for (let k = 0; k < 7; k++) rings += `<circle cx="${300 + ((i * 31 + k * 53) % 200) - 100}" cy="${200 + ((i * 17 + k * 29) % 120) - 60}" r="${30 + k * 22}" fill="none" stroke="hsl(${hue} 30% ${25 + k * 6}%)" stroke-width="2"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400"><rect width="600" height="400" fill="hsl(${hue} 25% 94%)"/>${rings}<text x="300" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#222">Plate ${i + 1}</text></svg>`
}

export async function createStressProject(chapters: number, wordsPerChapter: number, images: number): Promise<Project> {
  const p = blankProject(`Stress Test — ${chapters} chapters`, 'GlitchBind Fixture')
  const paras = FIXTURE.filter((b) => b.p).map((b) => b.p as string)
  const metas = []
  for (let i = 0; i < images; i++) metas.push(await importImage(new Blob([plate(i)], { type: 'image/svg+xml' }), `plate-${i + 1}.svg`))
  const sections: Section[] = []
  let cursor = 0
  let img = 0
  for (let c = 0; c < chapters; c++) {
    const content: Record<string, unknown>[] = []
    let words = 0
    let n = 0
    while (words < wordsPerChapter) {
      const text = paras[cursor++ % paras.length]
      content.push({ type: 'paragraph', content: [{ type: 'text', text }] })
      words += text.split(' ').length
      n++
      if (img < images && n % 9 === 4 && Math.floor((img * chapters) / Math.max(1, images)) <= c) {
        content.push({ type: 'figure', attrs: { id: uid('f_'), imageId: metas[img].id, wrap: img % 3 === 0 ? 'right' : 'inline', widthIn: img % 3 === 0 ? 2 : 3.4, caption: `Plate ${img + 1}`, alt: `Plate ${img + 1}` } })
        img++
      }
    }
    sections.push({ ...makeSection('chapter', `Chapter ${c + 1} of the Long Book`), doc: { type: 'doc', content } as PMDoc })
  }
  const project: Project = { ...p, sections: [p.sections[0], p.sections[1], p.sections[2], ...sections], images: metas }
  await saveProject(project)
  return project
}
