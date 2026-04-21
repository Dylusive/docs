import Anthropic from '@anthropic-ai/sdk'
import type { Chapter, BookImage, Book } from '../types'

export interface LayoutSection {
  type:
    | 'title'
    | 'subtitle'
    | 'epigraph'
    | 'dropcap'
    | 'body'
    | 'pullquote'
    | 'poetry'
    | 'fragment'
    | 'dialogue'
    | 'aria_data'
    | 'wordsplit'
    | 'scream'
    | 'whisper'
    | 'sigil_row'
    | 'letter'
    | 'spell'
    | 'etymology'
    | 'image'
    | 'divider'
    | 'subheading'
  content?: string
  speaker?: string
  glyphs?: string[]
  word?: string
  roots?: string
  imageId?: string
  imageUrl?: string
  caption?: string
  alignment?: 'left' | 'center' | 'right' | 'full'
  widthPercent?: number
  style?: string
  emphasis?: 'low' | 'medium' | 'high' | 'extreme'
}

export interface GeneratedLayout {
  style: string
  accentColor: string
  backgroundStyle: string
  fontPairing: string
  sections: LayoutSection[]
  designNotes: string
}

const STYLE_PRESET_INSTRUCTIONS: Record<string, string> = {
  auto: 'Choose the best style based on the content and mood.',
  'bloom-hour': `THE BLOOM HOUR aesthetic: blood-moon crimson (#8b0000 to #dc143c), \
void-black background (#050508), gold accents (#c8a951), electric violet (#7b2d8b). \
Embrace the sacred-profane. Use FRAGMENT for dramatic single lines. \
Use ARIA_DATA for clinical/analytical asides. Use WORDSPLIT to dissect words (BE-LIE-VE, F-V-C-K). \
Use POETRY for verse-like passages. Use SPELL for ritual/incantation moments. \
Use SIGIL_ROW for ornamental breaks (✦ 🩸 🌕 ⚡ ◈ ∴). Use SCREAM for peak intensity. \
Use WHISPER for quiet sacred asides. Background: deep radial gradients from near-black to deep crimson/violet.`,
  'cinematic-noir': 'Dark, moody, stark. High-contrast black/silver/electric blue. Film noir energy.',
  'editorial-literary': 'Clean, sophisticated. Serif-forward. Ivory tones, deep navy or forest green accents.',
  'mystical-oracle': 'Mystical, dreamy. Deep purple, midnight blue, gold. Stars and sacred geometry.',
  minimalist: 'White space is the aesthetic. Minimal color, maximum impact through space and silence.',
  'vintage-grimoire': 'Old manuscript. Sepia, parchment, ink-black, wax-seal crimson. Aged wisdom.',
  'terminal-arcane': 'Terminal/hacker meets occult. Monospaced fonts, terminal green on black. Data as ritual.',
}

export async function buildChapterLayout(
  apiKey: string,
  chapter: Chapter,
  images: BookImage[],
  book?: Book
): Promise<GeneratedLayout> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const plainText = chapter.content.replace(/<[^>]+>/g, '').trim()
  const stylePreset = book?.stylePreset ?? chapter.stylePreset ?? 'auto'
  const presetInstruction = STYLE_PRESET_INSTRUCTIONS[stylePreset] ?? STYLE_PRESET_INSTRUCTIONS.auto

  const contentBlocks: Anthropic.MessageParam['content'] = []

  contentBlocks.push({
    type: 'text',
    text: `You are an expert book designer, art director, and typographer. \
Analyze this chapter and create a breathtaking visual layout.

BOOK: "${book?.title ?? 'Unknown'}" by ${book?.author ?? 'Unknown'}
${book?.synopsis ? `SYNOPSIS: ${book.synopsis}` : ''}
CHAPTER TITLE: "${chapter.title}"
CHAPTER ACCENT COLOR: ${chapter.accentColor}
STYLE PRESET: ${stylePreset}
STYLE DIRECTION: ${presetInstruction}

CHAPTER TEXT:
${plainText}

${images.length > 0 ? `There are ${images.length} image(s). Analyze their mood and relationship to the text.` : 'No images — create a powerful typography-focused layout.'}

Return a JSON object (no markdown, pure JSON) with this EXACT structure:
{
  "style": "one of: cinematic, editorial, literary, mystical, minimalist, graphic, vintage, bloom-hour, terminal-arcane",
  "accentColor": "hex color that fits the mood",
  "backgroundStyle": "CSS background string (e.g., 'radial-gradient(ellipse at 20% 20%, #1a0010, #050508)')",
  "fontPairing": "heading font + body font description",
  "designNotes": "2-3 sentences describing the visual concept",
  "sections": [
    // TYPOGRAPHY sections:
    { "type": "title", "content": "chapter title" },
    { "type": "subtitle", "content": "✦ I — THE BLEEDING HOUR ✦", "style": "ornate" },
    { "type": "epigraph", "content": "opening quote or lyric" },
    { "type": "dropcap", "content": "first paragraph — starts with big decorative letter" },
    { "type": "body", "content": "regular paragraph prose" },
    { "type": "pullquote", "content": "10-20 word power quote extracted from text" },
    { "type": "subheading", "content": "section break heading" },

    // POETIC/FRAGMENTED sections:
    { "type": "poetry", "content": "verse with line breaks using \\n — lyrical passages" },
    { "type": "fragment", "content": "single powerful line — stands alone with dramatic whitespace", "emphasis": "medium" },
    { "type": "scream", "content": "THE LOUDEST LINE — displayed large and urgent" },
    { "type": "whisper", "content": "quiet sacred aside — small, dim, intimate annotation" },

    // SPECIAL sections:
    { "type": "dialogue", "content": "a line of speech", "speaker": "CHARACTER NAME" },
    { "type": "aria_data", "content": "SYSTEM ANALYSIS:\\nword_count: 847\\nrecurring_sigils: ✦ (12)\\ntheme_density: critical" },
    { "type": "wordsplit", "word": "BELIEVE", "content": "BE | LIE | VE", "roots": "Old English: be (to be) + leogan (to lie) + life (to live)" },
    { "type": "letter", "content": "Text formatted as a handwritten letter or personal note" },
    { "type": "spell", "content": "ritual incantation text — sacred, mysterious, charged with power" },
    { "type": "etymology", "word": "NEMO", "content": "NEMO = NO ONE = OMEN reversed", "roots": "Latin: nemo (nobody, no man)" },

    // ORNAMENTAL sections:
    { "type": "sigil_row", "glyphs": ["✦", "🩸", "🌕", "⚡", "◈"] },
    { "type": "divider", "style": "ornamental" },

    // IMAGE sections:
    { "type": "image", "imageId": "use the provided id", "imageUrl": "copy the url", "caption": "evocative caption", "alignment": "left|center|right|full", "widthPercent": 40-100 }
  ]
}

DESIGN PHILOSOPHY:
- Think like an art director for a limited-edition literary press
- Mix section types dynamically — avoid chaining plain body paragraphs
- Isolate the most powerful individual lines as FRAGMENT sections
- Use ARIA_DATA for clinical/analytical/data-driven moments in the text
- Use WORDSPLIT for words that deserve etymological attention
- Use POETRY for lyrical, verse-like, rhythmically significant passages
- Extract 1-3 most quotable lines as PULLQUOTE
- Use SCREAM sparingly — only for absolute peak intensity
- SIGIL_ROW glyphs should thematically match the chapter content
- Interweave images between text sections organically
- Be bold, unexpected, and make this a book worth holding.`,
  })

  for (const img of images) {
    const mediaType = img.dataUrl.startsWith('data:image/png')
      ? 'image/png'
      : img.dataUrl.startsWith('data:image/gif')
      ? 'image/gif'
      : img.dataUrl.startsWith('data:image/webp')
      ? 'image/webp'
      : 'image/jpeg'

    const base64 = img.dataUrl.split(',')[1]
    contentBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64 },
    })
    contentBlocks.push({
      type: 'text',
      text: `[Image ID: "${img.id}", filename: "${img.name}"]`,
    })
  }

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: contentBlocks }],
  })

  const raw = response.content.find((b) => b.type === 'text')?.text ?? '{}'
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned) as GeneratedLayout
  } catch {
    const paragraphs = plainText.split(/\n\n+/).filter(Boolean)
    return {
      style: 'literary',
      accentColor: chapter.accentColor,
      backgroundStyle: 'linear-gradient(135deg, #080810, #0d0d20)',
      fontPairing: 'Georgia heading, readable body',
      designNotes: 'Clean literary layout with careful typography.',
      sections: [
        { type: 'title', content: chapter.title },
        ...paragraphs.slice(0, 1).map((p) => ({ type: 'dropcap' as const, content: p })),
        ...images.map((img) => ({
          type: 'image' as const,
          imageId: img.id,
          imageUrl: img.dataUrl,
          caption: img.name,
          alignment: 'center' as const,
          widthPercent: 80,
        })),
        ...paragraphs.slice(1).map((p) => ({ type: 'body' as const, content: p })),
      ],
    }
  }
}

export function buildMockLayout(chapter: Chapter, images: BookImage[]): GeneratedLayout {
  const plainText = chapter.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const rawParas = plainText.split(/(?<=[.!?])\s{2,}|(?<=\n)\n/).map((p) => p.trim()).filter((p) => p.length > 10)

  // Fall back to splitting on sentences if paragraphs are sparse
  const paras = rawParas.length < 2
    ? plainText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 20)
    : rawParas

  const sections: LayoutSection[] = []

  // Title
  sections.push({ type: 'title', content: chapter.title })

  // Subtitle ornament
  sections.push({
    type: 'subtitle',
    content: '✦  I  —  THE BLOOM HOUR  —  ✦',
    style: 'ornate',
  })

  // Opening sigils
  sections.push({ type: 'sigil_row', glyphs: ['✦', '🩸', '🌕', '◈', '∴'] })

  // First paragraph as dropcap
  if (paras[0]) sections.push({ type: 'dropcap', content: paras[0] })

  // Walk remaining paragraphs and classify them
  for (let i = 1; i < paras.length; i++) {
    const p = paras[i]
    const wordCount = p.split(/\s+/).length
    const isDialogue = p.startsWith('"') || p.startsWith('“')
    const isShort = wordCount <= 12
    const isMedium = wordCount > 12 && wordCount <= 30

    if (isDialogue) {
      // Extract a speaker guess from surrounding text or default
      sections.push({ type: 'dialogue', content: p, speaker: '—' })
    } else if (isShort && i % 3 === 0) {
      sections.push({ type: 'fragment', content: p, emphasis: 'high' })
    } else if (isMedium && i % 4 === 1) {
      sections.push({ type: 'pullquote', content: p })
    } else {
      sections.push({ type: 'body', content: p })
    }

    // Inject an image after roughly 1/3 through
    if (images.length > 0 && i === Math.floor(paras.length / 3)) {
      sections.push({
        type: 'image',
        imageId: images[0].id,
        imageUrl: images[0].dataUrl,
        caption: images[0].name,
        alignment: 'center',
        widthPercent: 85,
      })
    }

    // Second image at 2/3
    if (images.length > 1 && i === Math.floor((paras.length * 2) / 3)) {
      sections.push({
        type: 'image',
        imageId: images[1].id,
        imageUrl: images[1].dataUrl,
        caption: images[1].name,
        alignment: 'right',
        widthPercent: 60,
      })
    }

    // Mid-chapter sigil break
    if (i === Math.floor(paras.length / 2)) {
      sections.push({ type: 'sigil_row', glyphs: ['🩸', '∴', '🌕'] })
    }
  }

  // Closing whisper
  const lastLine = paras[paras.length - 1]
  if (lastLine && lastLine.split(/\s+/).length <= 20) {
    // Replace the last body with a whisper for impact
    const last = sections[sections.length - 1]
    if (last?.type === 'body') sections.pop()
    sections.push({ type: 'whisper', content: lastLine })
  }

  // Final sigil
  sections.push({ type: 'divider', style: 'ornamental' })

  return {
    style: 'bloom-hour',
    accentColor: '#dc143c',
    backgroundStyle: 'radial-gradient(ellipse at 30% 20%, #1a0008 0%, #050508 70%)',
    fontPairing: 'Playfair Display + Georgia',
    designNotes:
      'Demo layout — Bloom Hour aesthetic. Blood-moon crimson, void-black, sacred-profane typography. Add your API key to let Aria generate a fully custom layout tailored to your exact prose.',
    sections,
  }
}
