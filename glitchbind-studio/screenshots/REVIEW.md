# Screenshot review

Five views were captured with Playwright (`node scripts/screenshots.mjs before`), critiqued against the design rules, given one fix each, and captured again (`after`). Files are `before-N-*.png` and `after-N-*.png` in this folder.

| View | Critique | Worst issue | Fix |
| --- | --- | --- | --- |
| 1. Projects screen | Good negative space, one primary action, glitch limited to the logo and the top rule. Alignment is clean. | Dark covers (#0B0B10, #12121A) dissolved into the dark background, so the books did not read as objects. | Each cover gets a one-pixel inner hairline, a soft diagonal sheen and a spine shadow. |
| 2. Editor, page 1 | Page is real paper on a dark canvas; no glitch on the page. Toolbar is dense but grouped. | The canvas showed the title page while the sidebar highlighted chapter one and the inspector showed text controls for it. The chrome described a page that was not on screen. | A book now opens where the author left off; the first time, on page 1 with that section active and the Page inspector showing. |
| 3. Editor, spread view | Reads as an open book; mirrored margins, running head and folio are correct; footnote sits at the page foot. | The drop cap was undersized: its cap-height stopped about half a line short of the third line. | Drop cap is now sized from the line height so its top meets the first line's capitals and its foot sits on the Nth baseline. |
| 4. Cover Builder | Canvas is centred with clear trim, fold and safe guides. | The full-wrap dimensions were printed twice, in the toolbar and in the inspector. | Removed the toolbar copy; the inspector's "Cover size" panel is the one place for it. |
| 5. Export dialog | Honest labelling; preflight and backup are prominent. | Seven equal-weight rows made the dialog taller than the window, so the plain-language PDF note was cut off. | The three PDFs stay as rows; the four other formats became a compact two-by-two grid. The dialog fits on one screen. |

Glitch effects were checked by test as well as by eye: no element inside a book page has a running animation in either mode, and Clean Pro removes the logo effect.
