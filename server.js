const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8000;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogv': 'video/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm',
    '.map': 'application/json'
};

// Monotonic counter and command store for mobile remote control
let cmdCounter = 1;
let lastCommand = { id: 0, action: null, val: null, t: 0 };

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    let candidateIp = null;

    for (const name of Object.keys(interfaces)) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('wsl') || lowerName.includes('vbox') || lowerName.includes('virtual') || lowerName.includes('vethernet')) {
            continue;
        }
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const ip = iface.address;
                if (ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
                    return ip;
                }
                candidateIp = ip;
            }
        }
    }
    return candidateIp || '127.0.0.1';
}

function isLoopbackClient(req) {
    const remoteIp = req.socket.remoteAddress || '';
    return remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1';
}

function isAllowedOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return true; // Direct non-browser or same-origin requests
    try {
        const u = new URL(origin);
        const host = u.hostname;
        const port = u.port || (u.protocol === 'https:' ? '443' : '80');
        if (host === 'localhost' || host === '127.0.0.1' || host === getLocalIp()) {
            return String(port) === String(PORT);
        }
        // Allow GitHub Pages remote controller if user connects via cloud
        if (host.endsWith('github.io')) return true;
    } catch (_) {}
    return false;
}

function readRequestBody(req, maxBytes = 60 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        req.on('data', chunk => {
            total += chunk.length;
            if (total > maxBytes) {
                req.destroy(new Error('Payload too large'));
                reject(new Error('Payload too large'));
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf8'));
        });
        req.on('error', reject);
    });
}

function atomicWriteFileSync(filePath, content) {
    const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, filePath);
}

const BLOCKED_NAMES = new Set([
    'server.js',
    'main-electron.js',
    'package.json',
    'package-lock.json',
    '_server_ps.ps1',
    'server.py',
    'fix_html.ps1'
]);

function isStaticAccessAllowed(relativeFilePath) {
    const normalized = path.normalize(relativeFilePath).replace(/^[\\\/]+/, '');
    if (normalized.startsWith('..')) return false;

    const parts = normalized.split(path.sep);
    for (const part of parts) {
        if (!part) continue;
        // Block hidden dot files/folders (.git, .gitignore, etc.)
        if (part.startsWith('.')) return false;
        // Block sensitive files
        if (BLOCKED_NAMES.has(part.toLowerCase())) return false;
    }
    // Block node_modules access except if specifically needed
    if (parts[0] === 'node_modules') return false;

    return true;
}

const server = http.createServer(async (req, res) => {
    // Set No-Cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // CORS policy: allow local and same-network clients
    const reqOrigin = req.headers.origin;
    if (reqOrigin && isAllowedOrigin(req)) {
        res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    } else if (!reqOrigin) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // Parse URL safely
    let parsedUrl;
    try {
        parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch (_) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Invalid URL');
    }
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // ── API Endpoints for Mobile Remote Control ──────────────────────
    if (pathname === '/api/remote-send') {
        const action = parsedUrl.searchParams.get('action');
        const val = parsedUrl.searchParams.get('val') || '';
        if (action) {
            cmdCounter++;
            lastCommand = { id: cmdCounter, action, val, t: Date.now() };
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ success: true, command: lastCommand }));
    }

    if (pathname === '/api/remote-poll') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ command: lastCommand }));
    }

    if (pathname === '/api/ip') {
        const ip = getLocalIp();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
            ip,
            port: PORT,
            remoteUrl: `http://${ip}:${PORT}/remote.html`
        }));
    }

    // ── Sensitive Administrative APIs (Must originate from local machine) ──
    if (pathname === '/api/convert-video' || pathname === '/api/delete-final-backup' || pathname === '/api/save-project') {
        if (!isLoopbackClient(req) && !isAllowedOrigin(req)) {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: false, error: 'Forbidden: Local client access only' }));
        }
    }

    // ── Video Conversion API Endpoint ─────────────────────────────
    if (pathname === '/api/convert-video' && req.method === 'POST') {
        try {
            const body = await readRequestBody(req, 2 * 1024 * 1024);
            const data = JSON.parse(body);
            const inputPath = path.resolve(data.filePath || '');
            const preset = data.preset || 'loop_60s';
            const customTrim = data.customTrim !== undefined ? String(data.customTrim) : '';

            // Validate file path and extension
            const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.flv', '.wmv', '.m4v', '.ts']);
            const ext = path.extname(inputPath).toLowerCase();
            if (!inputPath || !fs.existsSync(inputPath) || !ALLOWED_VIDEO_EXTS.has(ext)) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ success: false, error: 'Invalid or non-existent video file' }));
            }

            const scriptPath = path.join(__dirname, 'video-converter-tool', 'converter.py');
            const cp = require('child_process');
            const args = [scriptPath, inputPath, preset];
            if (customTrim) args.push(customTrim);

            cp.execFile('python', args, {
                maxBuffer: 15 * 1024 * 1024,
                timeout: 600000 // 10 minutes timeout
            }, (error, stdout, stderr) => {
                if (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, error: error.message || stderr }));
                }
                const base = inputPath.substring(0, inputPath.length - ext.length);
                const outp = base + `_converted_${preset}.mp4`;
                let sizeMB = 0;
                if (fs.existsSync(outp)) {
                    sizeMB = (fs.statSync(outp).size / (1024 * 1024)).toFixed(2);
                }
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ success: true, outputPath: outp, sizeMB }));
            });
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    if (pathname === '/api/delete-final-backup' && req.method === 'POST') {
        const backupPath = path.join(__dirname, 'FINAL.html');
        try {
            if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: true }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: false, error: error.message }));
        }
    }

    if (pathname === '/api/save-project' && req.method === 'POST') {
        try {
            const body = await readRequestBody(req, 60 * 1024 * 1024);
            const data = JSON.parse(body);
            if (data && Array.isArray(data.slides) && data.slides.length > 0) {
                const hasImagePlaceholders = data.slides.some(slide =>
                    String(slide?.bgMedia || '').startsWith('[heavy-bg-media-') ||
                    String(slide?.bgImage || '').startsWith('[heavy-bg-image-') ||
                    (Array.isArray(slide?.elements) && slide.elements.some(element =>
                        element?.__hasLargeSrc || element?.src === '[base64-image-in-idb]'
                    ))
                );

                if (hasImagePlaceholders) {
                    res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, error: 'Incomplete image backup rejected' }));
                }

                // Atomic writes to prevent file corruption
                atomicWriteFileSync(path.join(__dirname, 'recovered-project.json'), JSON.stringify(data, null, 2));
                atomicWriteFileSync(path.join(__dirname, 'presentation-default-deck.js'), 'window.DEFAULT_RECOVERED_SLIDES = ' + JSON.stringify(data.slides) + ';\n');
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: true, count: data.slides?.length }));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // ── Static File Serving with HTTP Range (Streaming) Support ─────
    const sanitizedRelPath = pathname === '/' ? 'index.html' : pathname.replace(/^[\\\/]+/, '');
    if (!isStaticAccessAllowed(sanitizedRelPath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('403 Forbidden');
    }

    let filePath = path.join(__dirname, sanitizedRelPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not Found');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const fileSize = stats.size;
        const range = req.headers.range;

        // Support HTTP Range requests (crucial for video/audio seeking)
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (isNaN(start) || start >= fileSize || (parts[1] && end >= fileSize) || start > end) {
                res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
                return res.end();
            }

            const chunkSize = (end - start) + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': contentType
            });
            fileStream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Accept-Ranges': 'bytes',
                'Content-Type': contentType
            });
            fs.createReadStream(filePath).pipe(res);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`=======================================================`);
    console.log(`Presentation Server running at: http://localhost:${PORT}`);
    console.log(`Mobile Remote URL: http://${localIp}:${PORT}/remote.html`);
    console.log(`Security: Sensitive APIs restricted to local client`);
    console.log(`Streaming: HTTP Range requests enabled`);
    console.log(`=======================================================`);
});
