#!/bin/bash
# Double-click this file to start GlitchBind Studio on a Mac.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo
  echo " GlitchBind Studio needs Node.js, which is not installed yet."
  echo " 1. Go to https://nodejs.org and install the version marked LTS."
  echo " 2. Then double-click this file again."
  echo
  read -r -p " Press Return to close." _
  exit 1
fi
if [ ! -d node_modules ]; then
  echo " First start: setting things up. This takes a minute or two and needs the internet once..."
  if ! npm install; then
    echo
    echo " Setup did not finish. Check your internet connection and double-click this file again."
    read -r -p " Press Return to close." _
    exit 1
  fi
fi
echo
echo " Starting GlitchBind Studio. Your browser will open by itself."
echo " Keep this window open while you work. Close it to stop the app."
echo
npm start
