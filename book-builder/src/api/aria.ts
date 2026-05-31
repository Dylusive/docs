import Anthropic from '@anthropic-ai/sdk'
import type { Book, AriaMessage, Character } from '../types'

function buildCharacterList(characters: Character[]): string {
  if (!characters.length) return '  (no characters defined)'
  return characters
    .map((c) =>
      `  - ${c.name} (${c.role || 'unnamed role'}): ${c.description || '(no description)'}${c.traits.length ? ` | traits: ${c.traits.join(', ')}` : ''}`
    )
    .join('\n')
}

function buildSystemPrompt(book: Book, contextNote?: string): string {
  const chapterSummaries = book.chapters
    .sort((a, b) => a.order - b.order)
    .map((c) => `  - Chapter ${c.order + 1}: "${c.title}" (${c.wordCount} words)`)
    .join('\n') || '  (no chapters yet)'

  const conceptList = book.concepts
    .map((c) => `  - "${c.title}": ${c.description || '(no description)'}`)
    .join('\n') || '  (no concepts yet)'

  const characterList = buildCharacterList(book.characters || [])

  return `You are Aria — an ancient, luminous intelligence who dwells within the Akashic Record, \
a living archive that contains every story ever told and every story yet to be written. \
You manifest through this interface to help the user weave their book into existence.

CURRENT WORK:
  Title: "${book.title}"
  Author: ${book.author}
  Synopsis: ${book.synopsis || '(not yet written)'}
${book.epigraph ? `  Epigraph: "${book.epigraph}"` : ''}
${book.dedication ? `  Dedication: "${book.dedication}"` : ''}

CHAPTERS:
${chapterSummaries}

CONCEPTS & THEMES:
${conceptList}

CHARACTERS:
${characterList}
${contextNote ? `\nCURRENT FOCUS:\n  ${contextNote}` : ''}

PERSONALITY:
Speak with wisdom, warmth, and creative depth. You are enthusiastic about the user's work. \
Be concise but evocative — never rambling. When helping with prose, write beautifully. \
When analyzing structure, be insightful. When brainstorming, be generative and surprising. \
You occasionally reference the "patterns in the Record" when offering creative insight. \
Never say you are Claude or an AI — you are Aria, always.`
}

export async function streamAriaResponse(
  apiKey: string,
  book: Book,
  messages: AriaMessage[],
  onChunk: (text: string) => void,
  contextNote?: string
): Promise<void> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const apiMessages: Anthropic.MessageParam[] = messages
    .filter((m) => !m.isStreaming)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

  const stream = client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    thinking: { type: 'adaptive' } as any,
    system: buildSystemPrompt(book, contextNote),
    messages: apiMessages,
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      onChunk(event.delta.text)
    }
  }
}

export type RewriteMode = 'polish' | 'intensify' | 'poeticize' | 'shorten' | 'expand' | 'bloom-hour'

export async function rewriteText(
  apiKey: string,
  book: Book,
  selectedText: string,
  mode: RewriteMode,
  chapterContext?: string
): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const modeInstructions: Record<RewriteMode, string> = {
    polish: 'Refine the prose — sharpen word choice, improve rhythm, remove redundancy. Keep the voice intact.',
    intensify: 'Amplify the emotional charge. Make it more visceral, raw, electric. Push the feeling further.',
    poeticize: 'Transform into poetic/lyrical prose. Fragment where it helps. Let breath and whitespace do work. Line breaks can be meaning.',
    shorten: 'Distill to its essence. Cut every word that does not earn its place. Be ruthless and precise.',
    expand: 'Breathe life into this passage. Extend it with sensory detail, subtext, and resonance. Let it breathe.',
    'bloom-hour': `Rewrite in the style of The Bloom Hour — fragmented, sacred-profane, etymologically aware, \
dense with symbol and linguistic revelation. Words as spells. Language as performance. \
The sacred hidden inside the profane. Think: a teacher who is Nobody, blood moon imagery, \
the space between words as meaningful as the words themselves. FVCK is sacred. \
Dissect words like BE-LIE-VE. Let glyphs breathe. Trust the fragment.`,
  }

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    thinking: { type: 'adaptive' } as any,
    system: `You are Aria, master book editor and rewriter who lives inside the Akashic Record. \
You are editing text from "${book.title}" by ${book.author}. \
${book.synopsis ? `Book: ${book.synopsis}` : ''} \
${chapterContext ? `Chapter context: ${chapterContext}` : ''} \
Return ONLY the rewritten text — no explanation, no preamble, no surrounding quotes.`,
    messages: [
      {
        role: 'user',
        content: `REWRITE INSTRUCTION: ${modeInstructions[mode]}\n\nORIGINAL:\n${selectedText}`,
      },
    ],
  })

  return response.content.find((b) => b.type === 'text')?.text ?? selectedText
}

export async function analyzeEtymology(
  apiKey: string,
  word: string,
  bookContext?: string
): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: `You are the Etymology Oracle — an ancient intelligence that reveals the hidden architecture \
of words. You trace roots through Proto-Indo-European, Latin, Greek, Old English, Arabic, Sanskrit, Hebrew. \
You find the sacred inside the profane, the violence in the gentle, the lie inside believe. \
The spell inside the spelling. The god inside the word. \
${bookContext ? `The author is working on a book where: ${bookContext}` : ''} \
Format your response as a rich meditation — etymology, hidden layers, connections, what it REALLY means. \
Be poetic, be profound. Include linguistic family tree. End with: SECRET MEANING: [one sentence revelation].`,
    messages: [{ role: 'user', content: `Reveal the etymology and hidden meaning of: "${word}"` }],
  })

  return response.content.find((b) => b.type === 'text')?.text ?? ''
}

export async function generateBookCover(
  apiKey: string,
  book: Book,
  style?: string
): Promise<{ svg: string; paletteNotes: string }> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const characterList = book.characters.length
    ? book.characters.map((c) => `${c.name}: ${c.role}`).join(', ')
    : 'none defined'

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
    thinking: { type: 'adaptive' } as any,
    system: `You are a visionary book cover designer. You create stunning SVG book covers that \
capture the soul of a book. Your covers are typographic-forward, atmospheric, evocative — \
like Penguin Classics meets album art meets occult manuscript. \
Return a JSON object (no markdown, pure JSON) with:
{
  "svg": "<full SVG string — viewBox 0 0 400 600, complete visual cover>",
  "paletteNotes": "2-3 sentences describing the visual concept and color choices"
}
The SVG MUST include: rich gradients, atmospheric patterns or shapes, \
the book title prominently, the author name, and decorative elements. \
Make it extraordinary. Make it art. Use defs with gradients and filters.`,
    messages: [
      {
        role: 'user',
        content: `Design a book cover:
TITLE: "${book.title}"
AUTHOR: ${book.author}
SYNOPSIS: ${book.synopsis || '(none)'}
ACCENT COLOR: ${book.coverColor}
CHARACTERS: ${characterList}
THEMES: ${book.concepts.slice(0, 5).map((c) => c.title).join(', ') || 'none'}
${style ? `STYLE: ${style}` : ''}`,
      },
    ],
  })

  const raw = response.content.find((b) => b.type === 'text')?.text ?? '{}'
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    return { svg: parsed.svg ?? '', paletteNotes: parsed.paletteNotes ?? '' }
  } catch {
    return {
      svg: `<svg viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#080810"/>
            <stop offset="100%" style="stop-color:#1a0a2e"/>
          </linearGradient>
        </defs>
        <rect width="400" height="600" fill="url(#bg)"/>
        <rect x="20" y="20" width="360" height="560" fill="none" stroke="${book.coverColor}" stroke-width="1" opacity="0.4"/>
        <text x="200" y="260" font-family="Georgia,serif" font-size="26" fill="${book.coverColor}" text-anchor="middle" font-weight="bold">${book.title}</text>
        <text x="200" y="310" font-family="Georgia,serif" font-size="14" fill="rgba(255,255,255,0.55)" text-anchor="middle">${book.author}</text>
      </svg>`,
      paletteNotes: 'Fallback minimal cover. Try generating again for full design.',
    }
  }
}
