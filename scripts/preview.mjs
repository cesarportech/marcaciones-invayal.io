import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve('out')
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '/marcaciones-invayal.io'
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }
http.createServer(async (req, res) => {
  try {
    let url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (base && url === '/') { res.writeHead(302, { Location: `${base}/` }); res.end(); return }
    if (base && (url === base || url.startsWith(`${base}/`))) url = url.slice(base.length)
    let file = path.resolve(root, `.${url || '/'}`)
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Invalid path')
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html')
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream')
    res.end(await readFile(file))
  } catch { res.writeHead(404); res.end('Not found') }
}).listen(4173, '127.0.0.1', () => console.log(`Local: http://localhost:4173${base}/`))
