# DECISIONS

Professional choices made during the build, in the order they came up. Anything not finished is marked **DEFERRED** — never fake-done.

## Foundations
- **Location / git.** The app lives in `glitchbind-studio/` inside the existing repository (which already had git history), so `git init` was not run again; each phase is a commit on the working branch.
- **Pagination architecture (the hard problem).** Tiptap/ProseMirror cannot paginate, so GlitchBind does it itself in three layers:
  1. `lib/pagination/measure.ts` reads the *browser's own layout* of a chapter (one "unit" per laid-out line, one per unbreakable block).
  2. `lib/pagination/core.ts` is a pure function that packs units into pages: page height, widows/orphans (min 2 lines), keep-heading-with-next, forced breaks, footnote space at the page foot, float wrap zones, full-page plates and two-page spreads (which must start on a left page).
  3. `lib/pagination/fragments.ts` cuts the flow into **real page slices** with `Range.cloneContents()` — a paragraph that straddles a page is genuinely split at the measured line, so each page owns its text. Nothing is rasterised, clipped or drawn as "lines on a long page".
- **Editing on real pages.** One Tiptap editor exists per active chapter. It is shown through a "live window" positioned exactly over the page being edited; every other page is the static slice. Because the live flow and the static slices come from the same measurement and the same stylesheet (`styles/book.css`), they are pixel-equivalent — `/pagination-test` measures this ("slice drift") and it must stay under 1px.
- **Hyphenated page breaks.** When a page ends on an automatically hyphenated word, the rest of the word is kept invisibly on the first page so the browser hyphenates and justifies that line exactly as it did in the flow (`visibility:hidden`, so it is not painted into the PDF).
- **Unit tests vs. browser tests.** Node has no layout engine, so Vitest drives the *real* pagination core with a deterministic text-width model (`textMeasure.ts`), and Playwright asserts the true browser counts from `/pagination-test`. Both are reported.
- **Fixture.** The 10,000-word fixture is real prose: the opening of *The Wind in the Willows* (Kenneth Grahame, 1908, public domain, Project Gutenberg #289), cut at exactly 10,000 words by `scripts/gen-fixture.mjs`.

## Fonts
- All bundled fonts are self-hosted from `@fontsource/*` so the app works offline; `scripts/gen-fonts.mjs` refuses any package whose licence is not `OFL-1.1`.
- **Special Elite was requested but is Apache-2.0, not SIL OFL**, which conflicts with the "only bundle OFL fonts" rule. It is replaced by two OFL typewriter faces: **Courier Prime** and **Cutive Mono**. Authors can still upload Special Elite as a custom font.
- 30 families ship (the 23 requested minus Special Elite, plus Alegreya, Source Serif 4, Libre Caslon Text, Cardo, Montserrat, Work Sans, Courier Prime, Cutive Mono). Subsets: Latin + Latin Extended; weights 400–700 where the family has them.
