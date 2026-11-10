# PROGRESS

To resume: run `git log --oneline -- glitchbind-studio`, read `DECISIONS.md`, then this file.

| Phase | What | Status |
| --- | --- | --- |
| 0 | Pagination proof: engine, 10k-word fixture, `/pagination-test`, unit tests | done |
| 1 | Scaffold, design system, layout, projects + IndexedDB | done |
| 2 | Pagination engine in the live editor, trims/presets/gutter, spread/zoom | done |
| 3 | Formatting, styles, footnotes/pull quotes/tables, fonts/colour/themes | done |
| 4 | Images: inserts, wrap/crop/library/DPI, illustrated + spread pages | done |
| 5 | Metadata, front/back matter, auto TOC, headers/footers, Proof Mode | done |
| 6 | Cover Builder, Preflight, all exports | done |
| 7 | Demo, Focus Mode, snapshots, import, PWA, performance + polish | done |

Deferred items are listed in `DECISIONS.md` (hardcover case-wrap cover size, character-anchored inline images, table column resize and merged cells).

## Last full test run

- `tsc --noEmit`: clean
- Vitest: 28 passed in 4 files
- `npm run build`: passes; 346 files precached for offline use (8.9 MB)
- Playwright: 15 passed (13 acceptance, 1 smoke, 1 offline against the production build)

## Measured results (Chromium)

- 10,000-word fixture: **26 pages at 6 × 9 in, 31 pages at 5.5 × 8.5 in**. Every character placed once, 0 overflow, 0 rule breaks, slice drift ≤ 0.21 px.
  (The first Phase 0 run reported 27 and 33; that run measured with a fallback font. See DECISIONS.)
- Interior PDF of the demo: 14 pages at 432 × 648 pt (6 × 9 in), letters on every PDF page equal to the preview page.
- 136-page book: 136 PDF pages, 135 non-blank pages compared letter-for-letter with the preview, all equal.
- KDP gutter: 136 pages → 0.625 in inside margin; grown to 161 pages → 0.75 in, with a notice to the author.
- Cover PDF: 1 page, 884.88 × 666 pt against 884.52 × 666 expected (0.005 in wide; Chrome's 1/300 in page grid).
- 305-page book with 50 images and 110k words: opens in about 1.5 s, whole-book reflow about 330 ms, 3 ms layout per keystroke, 16.7 ms frames while scrolling with 2–4 pages mounted.
