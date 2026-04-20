import Anthropic from '@anthropic-ai/sdk'
import type { Chapter, BookImage } from '../types'

export interface LayoutSection {
  type: 'title' | 'dropcap' | 'body' | 'pullquote' | 'image' | 'divider' | 'subheading'
  content?: string
  imageId?: string
  imageUrl?: string
  caption?: string
  alignment?: 'left' | 'center' | 'right' | 'full'
  widthPercent?: number
  style?: string
}

export interface GeneratedLayout {
  style: string
  accentColor: string
  backgroundStyle: string
  fontPairing: string
  sections: LayoutSection[]
  designNotes: string
}

export async function buildChapterLayout(
  apiKey: string,
  chapter: Chapter,
  images: BookImage[]
): Promise<GeneratedLayout> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const plainText = chapter.content.replace(/<[^>]+>/g, '').trim()

  // Build content array with text + images
  const contentBlocks: Anthropic.MessageParam['content'] = []

  contentBlocks.push({
    type: 'text',
    text: `You are an expert book designer and art director. Analyze this chapter and its images, then create a stunning visual layout.

CHAPTER TITLE: "${chapter.title}"
CHAPTER ACCENT COLOR: ${chapter.accentColor}

CHAPTER TEXT:
${plainText}

${images.length > 0 ? `There are ${images.length} image(s) included. Analyze their visual content, mood, and how they relate to the text.` : 'No images provided — create a typography-focused layout.'}

Return a JSON object (no markdown, pure JSON) with this exact structure:
{
  "style": "one of: cinematic, editorial, literary, mystical, minimalist, graphic, vintage",
  "accentColor": "a hex color that fits the mood (can keep ${chapter.accentColor} or suggest better)",
  "backgroundStyle": "describe a CSS background (e.g., 'linear-gradient(135deg, #0a0a1a, #1a0a2e)' or 'radial-gradient...')",
  "fontPairing": "heading font description and body font description",
  "designNotes": "2 sentences describing the visual concept",
  "sections": [
    // Order the content thoughtfully. Available section types:
    // { "type": "title", "content": "chapter title text" }
    // { "type": "dropcap", "content": "first paragraph text (starts with big decorative letter)" }
    // { "type": "body", "content": "paragraph text" }
    // { "type": "pullquote", "content": "a powerful 10-20 word quote extracted from the text" }
    // { "type": "image", "imageId": "use the id provided", "imageUrl": "copy the url", "caption": "evocative caption", "alignment": "left|center|right|full", "widthPercent": 40-100 }
    // { "type": "subheading", "content": "section break heading" }
    // { "type": "divider", "style": "ornamental|line|stars" }
  ]
}

Be creative and bold. Interweave images with text in unexpected ways. Extract the most powerful lines as pull quotes. Break the text into natural sections with subheadings if it helps. Think like a high-end book designer.`,
  })

  // Attach images for vision analysis
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
      text: `[Above image ID: "${img.id}", filename: "${img.name}"]`,
    })
  }

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: contentBlocks }],
  })

  const raw = response.content.find((b) => b.type === 'text')?.text ?? '{}'
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned) as GeneratedLayout
  } catch {
    // Fallback layout if JSON parse fails
    const paragraphs = plainText.split(/\n\n+/).filter(Boolean)
    return {
      style: 'literary',
      accentColor: chapter.accentColor,
      backgroundStyle: 'linear-gradient(135deg, #080810, #0d0d20)',
      fontPairing: 'Serif heading, readable body',
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
