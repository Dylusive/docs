# START HERE

GlitchBind Studio is a book-making app that runs on your own computer, inside your web browser. Nothing you write is uploaded anywhere. You do not need an account.

This page is the whole manual for getting it running. The same guide is inside the app: open the **⋯** menu (top right) and choose **Help & getting started**.

## Starting the app every day

You need Node.js installed once (download the "LTS" version from nodejs.org).

1. Open a terminal (Windows: "Command Prompt" or "PowerShell"; Mac: "Terminal") and go to the `glitchbind-studio` folder.
2. Type these two commands, pressing Enter after each:

```
npm install
npm run dev
```

`npm install` is only needed the very first time, or after you update the app. `npm run dev` prints an address, normally `http://localhost:5173`. Open that address in Chrome or Edge. Leave the terminal window open while you work; closing it stops the app.

The first time you open it, a demo book is already on your shelf so you can see everything working.

## Installing it as a desktop app

In Chrome or Edge, with the app open, look at the right-hand end of the address bar for a small **Install** icon (a screen with a down arrow), or open the browser's menu and choose **Install GlitchBind Studio**. It then opens in its own window from your Start menu or Dock and keeps working with no internet.

If you want the installed app to open without typing `npm run dev` each day, run these once and install from the address the second command prints:

```
npm run build
npm run preview
```

## Where your books are stored

Books are saved automatically inside the browser you use, on this computer. The top bar always tells the truth about it: **Saved 14:32** means it is safely written; **Unsaved changes** means it is about to be.

Because books live in the browser:

- they do not appear in a different browser or on a different computer by themselves
- clearing the browser's "site data" or "cookies and other site data" deletes them

That is why you should keep backups.

## Backing up a book

Press **Ctrl+S** (**⌘S** on a Mac), or open the **⋯** menu and choose **Save project file**. You get one file whose name ends in `.glitchbind.json`. It contains the entire book: text, settings, cover and every image.

Keep that file somewhere safe: a USB stick, a cloud drive, or email it to yourself. To bring a book back, go to the Projects screen (click the GlitchBind logo) and choose **Open project file**.

Do this before you publish, and any time you would be upset to lose the day's work.

## Making the files for your printer

1. Click **Export**.
2. Click **Open print view** next to **Interior Print PDF**. Your browser's print window opens. Set:
   - Destination: **Save as PDF**
   - Margins: **None**
   - Untick **Headers and footers**
   - Tick **Background graphics**
3. Save. Then do the same for **Cover Print PDF**. Printers such as Amazon KDP and IngramSpark want the inside of the book and the cover as two separate files.

## If something goes wrong

**"Port 5173 is in use"**
The app is already running in another terminal window. Use that one. If you cannot find it, start on a different port:

```
npm run dev -- --port 5174
```

**An error when starting or building, especially after an update**
In the `glitchbind-studio` folder, delete the folder called `node_modules`, then run:

```
npm install
npm run dev
```

**Your books have vanished**
This happens if the browser's site data was cleared, or you opened the app in a different browser. Open the Projects screen, choose **Open project file**, and pick your `.glitchbind.json` backup. The book returns exactly as it was when you saved that file. Books that were never backed up cannot be recovered, which is the reason for the backup habit above.
