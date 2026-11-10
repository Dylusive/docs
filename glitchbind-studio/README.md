# GlitchBind Studio

An offline book-creation studio: write, drop in pictures, style the book, see the real printed pages as you type, then export a print PDF that matches the preview.

New here and not a programmer? Read **[START-HERE.md](START-HERE.md)**.

```
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | start the app for daily use |
| `npm run build` | type-check and build the production app into `dist/` |
| `npm run preview` | serve the production build (installable, works offline) |
| `npm test` | Vitest unit tests |
| `npm run e2e` | build, then run the Playwright smoke, acceptance and offline tests |
| `npm run fonts` | regenerate the bundled font CSS from `@fontsource` packages |

The end-to-end tests use `pdfinfo`, `pdftotext` and `pdffonts` (poppler-utils) to inspect the exported PDFs, and need `npx playwright install chromium` on a new machine.

## How it works

- `src/lib/pagination/` is the pagination engine. `measure.ts` reads the browser's own line layout, `core.ts` (pure, unit-tested) packs lines into pages, `fragments.ts` splits straddling paragraphs into real page slices, `book.ts` assembles the physical book (sides, blanks, folios, contents mapping).
- `src/components/BookPage.tsx` is the one page component. The editor canvas, Proof Mode and the print view all render it from the same page data, which is why the PDF matches the preview.
- One Tiptap editor is shown through a window positioned over the page being edited; every other page is a static slice of the same flow.
- All data lives in IndexedDB in the browser. There is no server, account, analytics or tracking.

See [DECISIONS.md](DECISIONS.md) for the reasoning and for what is deferred, and [PROGRESS.md](PROGRESS.md) for status.
