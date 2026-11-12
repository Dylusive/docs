# START HERE

GlitchBind Studio is a book-making app that runs on your own computer, inside your web browser. Nothing you write is uploaded anywhere. You do not need an account.

This page is the whole manual for getting it running. The same guide is inside the app: open the **⋯** menu (top right) and choose **Help & getting started**.

## Getting it onto your computer

1. Install **Node.js** once: go to nodejs.org and install the version marked **LTS**. It is the engine the app runs on.
2. Download the app. On the project's GitHub page click the green **Code** button, then **Download ZIP**. Unzip it somewhere you will find it again, such as your Documents folder.
3. Open the unzipped folder and go into the `glitchbind-studio` folder.

## Starting the app every day

**The easy way: double-click.**

- Windows: double-click **Start GlitchBind (Windows)**.
- Mac: double-click **Start GlitchBind (Mac)**. The first time, macOS may refuse because the file came from the internet. If so, right-click the file, choose **Open**, then **Open** again. You only do that once.

A black window appears, sets things up the first time (a minute or two, and it needs the internet that one time), then your browser opens with the app. Keep the black window open while you work. Closing it stops the app.

**The typed way.** Open a terminal in the `glitchbind-studio` folder and type these two commands, pressing Enter after each:

```
npm install
npm run dev
```

`npm install` is only needed the very first time, or after you update the app. `npm run dev` prints an address, normally `http://localhost:5173`. Open that address in Chrome or Edge.

The first time you open the app, a demo book is already on your shelf so you can see everything working.

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
