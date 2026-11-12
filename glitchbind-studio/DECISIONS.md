# DECISIONS

Professional choices made during the build. Anything not finished is marked **DEFERRED** and is not presented as done.

## The pagination engine

- Tiptap/ProseMirror cannot paginate, so GlitchBind does it in three layers:
  1. `measure.ts` reads the browser's own layout of a chapter: one unit per laid-out line of text, one per unbreakable block.
  2. `core.ts` is a pure function that packs units into pages. It enforces page height, widows and orphans (two lines minimum), keep-heading-with-next, forced breaks, footnote space at the page foot, no break inside a float's wrap zone, full-page plates, and two-page spreads that must start on a left page.
  3. `fragments.ts` cuts the flow into real page slices with `Range.cloneContents()`. A paragraph that straddles a page is split at the measured line, so each page owns its own text.
- **Editing on real pages.** One Tiptap editor exists for the chapter being edited. It is displayed through a window placed exactly over the page under the caret or pointer; every other page shows the static slice. Both come from the same measurement and the same stylesheet (`styles/book.css`). `/pagination-test` measures the difference ("slice drift"); it stays under 0.25 px.
- **No hyphen at the foot of a page.** A page never ends on a hyphenated line when another legal break exists. An earlier approach kept the rest of the word invisibly on the first page; the PDF test showed the browser then dropped the visible fragment, so it was removed. If no other break is possible the hyphen is drawn explicitly and hangs slightly into the margin.
- **Fonts must be loaded before measuring.** In development (React StrictMode) a second measurement ran while fonts were still downloading and used a fallback font. The first Phase 0 numbers (27 and 33 pages) came from that. `ensureFonts` now shares in-flight loads, and the correct counts are 26 and 31 pages.
- **Unit tests vs browser tests.** Node has no layout engine, so Vitest drives the real pagination core with a deterministic text-width model (`textMeasure.ts`), and Playwright asserts the real browser counts. Both are reported separately.
- **Fixture.** The 10,000-word fixture is the opening of *The Wind in the Willows* (Kenneth Grahame, 1908, public domain, Project Gutenberg #289), cut at exactly 10,000 words by `scripts/gen-fixture.mjs`.

## Print and PDF

- PDFs are written by the browser's print engine from a print view that renders the same `<BookPage>` component and the same page data as the canvas. `@page` is set to the exact sheet size with zero margin. Text stays real text in embedded fonts.
- The export is labelled **KDP-Ready Print PDF (RGB)**. The app never claims PDF/X or CMYK; the Export dialog says so plainly.
- **Page size precision.** Chrome snaps PDF page sizes to a 1/300-inch grid. Sizes such as 6 × 9 in are exact; a 6.125 in bleed sheet comes out 0.002 in narrow and the demo cover 0.005 in wide. This is inside printer tolerance and is reported in the test output, not hidden.
- With bleed on, each interior sheet is trim + 0.125 in on the top, bottom and outside edge, none at the spine.
- **Image adjustments in the PDF.** Brightness, contrast and the other adjustments are CSS filters. Measured: Chrome rasterises a filtered image at 300 ppi when printing; unfiltered images (including cropped, rotated or rounded ones) are embedded untouched at their original pixels. Crop, size, rotation, border and radius are vector operations. EPUB and DOCX bake crop and adjustments into a new bitmap; the stored original is never changed.
- **KDP gutter.** The inside margin is the KDP table value plus a "comfort" allowance (0.25 in by default) so pages are not cramped at the minimum. The page count and gutter are solved together and the author is told when a band is crossed.

- **Static pages use the browser's DOM.** `@tiptap/html`'s `generateHTML` uses a virtual DOM that drops CSS it does not know (for example `aspect-ratio`). Pages that are not being edited are therefore serialised with ProseMirror's `DOMSerializer` and the real `document`, so they are identical to the live editor.

## Getting it onto a computer

- `Start GlitchBind (Windows).bat` and `Start GlitchBind (Mac).command` (and `start-glitchbind.sh` for Linux) check for Node.js, run `npm install` the first time, then `npm start`, which opens the browser. This keeps the "no server, all local" promise: the app runs from the author's own machine.

## Editor choices

- The chapter title is a property of the section (shown in the structure panel, contents page and running heads) and rendered as a generated opener, not typed in the text.
- Title page, copyright page and contents page are generated from Book Metadata and the section list. They are not editable as text, so details are never typed twice.
- **"Inline" images** sit in the text flow as their own block with left/centre/right alignment. Images anchored inside a line of text like a character are **DEFERRED**.
- **Shift while resizing** changes the frame's shape and crops the picture. It never stretches it.
- In-flow images are moved by dragging them to a new place in the text. Behind-text images move freely with snap guides to the margins and page centre.
- Undo is one timeline: text edits (per chapter, 300 steps) and book-level changes such as themes, trim size or deleting a chapter are undone in the order they happened.
- A text selection cannot span two chapters, because each chapter is its own document.
- Tables support insert, add/remove rows and columns and a header row. Column resizing and merged cells are **DEFERRED**.
- Footnotes have a fixed style; they cannot be restyled individually.
- Native browser spellcheck is on. Its underlines show on the page being edited.

## Fonts

- All bundled fonts are self-hosted from `@fontsource/*` so the app works offline. `scripts/gen-fonts.mjs` refuses any package whose licence is not `OFL-1.1`, ships woff2 only, and keeps each face's exact `unicode-range`.
- **Special Elite was requested but is Apache-2.0, not SIL OFL.** That conflicts with the "only bundle OFL fonts" rule, so it is replaced by two OFL typewriter faces: Courier Prime and Cutive Mono. It can still be uploaded as a custom font.
- 30 families ship: the 23 requested minus Special Elite, plus Alegreya, Source Serif 4, Libre Caslon Text, Cardo, Montserrat, Work Sans, Courier Prime and Cutive Mono. Subsets are Latin and Latin Extended.
- Ornament glyphs (✦ ❧ ⁂ ❦) are not in those subsets and come from the system's symbol font, so their exact shape can differ between computers.
- EPUB export does not embed the bundled fonts (reflowable e-books use the reader's fonts). A custom font is embedded only if the author ticks its licence box; otherwise the export warns and leaves it out.

## Cover

- The cover builder computes the paperback full wrap: bleed + back + spine + front + bleed, with the same spine calculator Export uses (0.002252 in per page white, 0.0025 in cream).
- **DEFERRED: hardcover case-wrap dimensions.** The KDP Hardcover preset sets interior margins, but the cover builder still produces the paperback full-wrap size and says so on screen.
- The barcode box is a white 2 × 1.2 in area carrying the ISBN as text. The printer adds the scannable barcode; the app does not generate one.

## Not verified

- `epubcheck` is not installed here. The EPUB is checked structurally instead: mimetype entry first and uncompressed, manifest matches the files, every content document parses as XHTML.
- Tested in Chromium only. Firefox and Safari were not run.
- The "install as desktop app" prompt was not clicked through by hand; the manifest and service worker it depends on are tested.

## Housekeeping

- The app lives in `glitchbind-studio/` inside an existing repository, so `git init` was not run again. Each phase is a commit on the working branch. Phases 1–2 and 3–6 were committed together rather than one commit each.
- A three-route app does not need a router library; `lib/router.ts` is 12 lines.
- `window.__gb` and `window.__gbPrint` are small handles used by the automated tests.
