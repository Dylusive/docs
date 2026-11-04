// Preview: http://localhost:5173/?preview  — scrub or play (audio from build/score.wav).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
const ROOT = path.dirname(new URL(import.meta.url).pathname)
const PORT = +(process.env.PORT || 5173)
const T = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
}
http
  .createServer((q, r) => {
    let p = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname))
    if (p === ROOT + '/') p = path.join(ROOT, 'index.html')
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
      r.writeHead(404)
      return r.end()
    }
    r.writeHead(200, { 'content-type': T[path.extname(p)] || 'application/octet-stream' })
    fs.createReadStream(p).pipe(r)
  })
  .listen(PORT, () => console.log(`THE NEW preview → http://localhost:${PORT}/?preview`))
