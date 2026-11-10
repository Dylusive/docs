/** Plain-language help. The in-app Help panel and START-HERE.md say the same things. */
export interface HelpSection { title: string; body: string[]; steps?: string[] }

export const HELP: HelpSection[] = [
  {
    title: 'Starting the app each day',
    body: ['GlitchBind Studio runs on your own computer. Nothing is uploaded anywhere. To start it, open a terminal in the glitchbind-studio folder and type these two commands:'],
    steps: ['npm install   (only needed the very first time, or after an update)', 'npm run dev   (then open the address it prints, normally http://localhost:5173)'],
  },
  {
    title: 'Installing it as a desktop app',
    body: [
      'In Chrome or Edge, open the app and look at the right-hand end of the address bar for the small “Install” icon (a screen with a down arrow), or open the browser menu and choose “Install GlitchBind Studio”.',
      'After that it opens in its own window from your Start menu or Dock, and it keeps working with no internet connection. For the installed app to open without the terminal, run “npm run build” once and then “npm run preview”, and install from that address.',
    ],
  },
  {
    title: 'Where your books are stored',
    body: [
      'Books are saved automatically inside this browser on this computer (in its built-in database, IndexedDB). The top bar always tells you the truth: “Saved 14:32” means it is safely written; “Unsaved changes” means it is about to be.',
      'Because they live in the browser, books do not follow you to another browser or computer by themselves, and clearing the browser’s site data deletes them. That is why backups matter.',
    ],
  },
  {
    title: 'Backing up a book',
    body: ['Press Ctrl+S (⌘S on a Mac), or open the ⋯ menu and choose “Save project file”. You get one file ending in .glitchbind.json that holds the whole book — text, settings, cover and every image.', 'Keep that file somewhere safe (a USB stick, cloud drive, or email it to yourself). To bring a book back, go to the Projects screen and choose “Open project file”.'],
  },
  {
    title: 'Making the print PDF',
    body: ['Click Export, then “Interior Print PDF”. Your browser’s print window opens. Set it like this:'],
    steps: ['Destination / Printer: Save as PDF', 'Margins: None', 'Untick “Headers and footers”', 'Tick “Background graphics”', 'Save. Then do the same for “Cover Print PDF” — the printer wants the two files separately.'],
  },
  {
    title: 'If something goes wrong',
    body: [],
    steps: [
      '“Port 5173 is in use” — the app is already running in another terminal window. Use that one, or start it on another port with:  npm run dev -- --port 5174',
      'A build or start error after an update — in the glitchbind-studio folder, delete the node_modules folder, then run  npm install  followed by  npm run dev  again.',
      'Your books have vanished (browser data was cleared, or you switched browser) — open the Projects screen, choose “Open project file” and pick your .glitchbind.json backup. Each book you backed up comes back exactly as it was.',
    ],
  },
]

export const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  { group: 'File', items: [['Ctrl+S', 'Save a project file backup (autosave is always on)'], ['Ctrl+P', 'Open the print view for the interior PDF'], ['Ctrl+Shift+P', 'Proof Mode — flip through the finished book'], ['Ctrl+/', 'Show this shortcut list']] },
  { group: 'Editing', items: [['Ctrl+Z / Ctrl+Shift+Z', 'Undo / redo (text edits and book changes share one history)'], ['Ctrl+B / I / U', 'Bold / italic / underline'], ['Ctrl+Alt+F', 'Insert a footnote'], ['Ctrl+Enter', 'Insert a page break'], ['Ctrl+Shift+8 / 7', 'Bulleted / numbered list'], ['Ctrl+V', 'Paste text, or paste an image straight onto the page']] },
  { group: 'View', items: [['Ctrl+F', 'Find & replace across the whole book'], ['Ctrl+Shift+F', 'Focus Mode (Esc to leave)'], ['Ctrl + mouse wheel', 'Zoom in and out'], ['Ctrl+0', 'Fit the page to the window'], ['Ctrl+= / Ctrl+-', 'Zoom in / out']] },
  { group: 'Proof Mode', items: [['← →  or  Space', 'Turn the page'], ['Home / End', 'First / last page'], ['Esc', 'Back to editing']] },
  { group: 'Images', items: [['Drag a corner', 'Resize, keeping proportions'], ['Shift + drag a corner', 'Free shape — the picture is cropped, never stretched'], ['Drag the round handle', 'Rotate (Shift snaps to 15°)'], ['Delete', 'Remove the selected image']] },
]
