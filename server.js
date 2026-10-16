const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream');

const PORT = 8000;

// Process-level crash guards
process.on('uncaughtException', (err) => {
    console.error('Server uncaughtException caught:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('Server unhandledRejection caught:', reason);
});

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

const ALLOWED_STATIC_EXTS = new Set(Object.keys(MIME_TYPES));

const VALID_PRESETS = new Set(['loop_60s', 'loop_30s', 'loop_120s', 'bg_720p_full', 'bg_540p']);

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
    if (!origin) return false;
    try {
        const u = new URL(origin);
        const host = u.hostname;
        const port = u.port || (u.protocol === 'https:' ? '443' : '80');
        if (host === 'localhost' || host === '127.0.0.1') {
            return String(port) === String(PORT);
        }
        // Strict exact match for hosted remote control
        if (host === 'shakibapon1234-maker.github.io' && u.protocol === 'https:') {
            return true;
        }
    } catch (_) {}
    return false;
}

function isLocalOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return true; // Direct same-origin request without Origin header
    try {
        const u = new URL(origin);
        const host = u.hostname;
        const port = u.port || (u.protocol === 'https:' ? '443' : '80');
        return (host === 'localhost' || host === '127.0.0.1') && String(port) === String(PORT);
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

async function atomicWriteFileAsync(filePath, content) {
    const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.promises.writeFile(tmpPath, content, 'utf8');
    await fs.promises.rename(tmpPath, filePath);
}

function isStaticAccessAllowed(relativeFilePath, isLoopback) {
    const normalized = path.normalize(relativeFilePath).replace(/^[\\\/]+/, '');
    if (normalized.startsWith('..')) return false;

    const parts = normalized.split(path.sep);
    for (const part of parts) {
        if (!part) continue;
        if (part.startsWith('.')) return false; // Hide dotfiles (.git, .env)
    }

    // Only allow specific static web asset extensions
    const ext = path.extname(normalized).toLowerCase();
    if (!ALLOWED_STATIC_EXTS.has(ext)) return false;

    // Disallow source code and sensitive backend files
    const filename = path.basename(normalized).toLowerCase();
    if (filename === 'server.js' || filename === 'main-electron.js' || filename === 'package.json' || filename === 'package-lock.json') {
        return false;
    }

    // Project deck data files are strictly restricted to local loopback client
    if (filename === 'recovered-project.json' || filename === 'presentation-default-deck.js') {
        if (!isLoopback) return false;
    }

    return true;
}

const server = http.createServer((req, res) => {
    (async () => {
        // Set No-Cache headers
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // CORS policy: only set when origin is explicitly allowed
        const reqOrigin = req.headers.origin;
        if (reqOrigin && (isLocalOrigin(req) || isAllowedOrigin(req))) {
            res.setHeader('Access-Control-Allow-Origin', reqOrigin);
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
        }

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            return res.end();
        }

        // Safe URL Parsing & Path Decoding (Immune to malformed percent-encoding crashes)
        let parsedUrl;
        let pathname = '';
        try {
            parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            pathname = decodeURIComponent(parsedUrl.pathname);
        } catch (_) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('400 Bad Request: Malformed URI');
        }

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

        // ── Sensitive Administrative APIs (Strict CSRF & Local Origin Guards) ──
        if (pathname === '/api/convert-video' || pathname === '/api/delete-final-backup' || pathname === '/api/save-project') {
            const isLocal = isLoopbackClient(req);
            const isSameOrigin = isLocalOrigin(req);
            const contentType = (req.headers['content-type'] || '').toLowerCase();

            // Must come from local loopback machine, matching local origin, with JSON content-type
            if (!isLocal || !isSameOrigin || !contentType.includes('application/json')) {
                res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ success: false, error: 'Forbidden: Unauthorized or cross-site request blocked' }));
            }
        }

        // ── Video Conversion API Endpoint ─────────────────────────────
        if (pathname === '/api/convert-video' && req.method === 'POST') {
            try {
                const body = await readRequestBody(req, 2 * 1024 * 1024);
                const data = JSON.parse(body);
                const inputPath = path.resolve(data.filePath || '');
                const preset = String(data.preset || 'loop_60s');
                const customTrim = data.customTrim !== undefined ? String(data.customTrim) : '';

                if (!VALID_PRESETS.has(preset)) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, error: 'Invalid preset specified' }));
                }

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

                const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
                cp.execFile(pythonCmd, args, {
                    maxBuffer: 15 * 1024 * 1024,
                    timeout: 600000
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
                if (fs.existsSync(backupPath)) await fs.promises.unlink(backupPath);
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

                if (!data || !Array.isArray(data.slides) || data.slides.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, error: 'Invalid or empty slides array' }));
                }

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

                // Asynchronous atomic writes without pretty-printing to avoid blocking event loop
                await atomicWriteFileAsync(path.join(__dirname, 'recovered-project.json'), JSON.stringify(data));
                await atomicWriteFileAsync(path.join(__dirname, 'presentation-default-deck.js'), 'window.DEFAULT_RECOVERED_SLIDES = ' + JSON.stringify(data.slides) + ';\n');

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ success: true, count: data.slides.length }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        }

        // ── Static File Serving with HTTP Range & Pipeline Streaming ─────
        const sanitizedRelPath = pathname === '/' ? 'index.html' : pathname.replace(/^[\\\/]+/, '');
        const isLocal = isLoopbackClient(req);

        if (!isStaticAccessAllowed(sanitizedRelPath, isLocal)) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('403 Forbidden');
        }

        let filePath = path.join(__dirname, sanitizedRelPath);
        try {
            const stats = await fs.promises.stat(filePath);
            if (stats.isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            }
        } catch (_) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not Found');
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

            if (range) {
                const match = range.match(/^bytes=(\d*)-(\d*)$/);
                if (!match) {
                    res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
                    return res.end();
                }

                let start, end;
                if (match[1] === '') {
                    // Suffix range: bytes=-500 (last 500 bytes)
                    const suffix = parseInt(match[2], 10);
                    if (isNaN(suffix) || suffix <= 0) {
                        res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
                        return res.end();
                    }
                    start = Math.max(0, fileSize - suffix);
                    end = fileSize - 1;
                } else {
                    start = parseInt(match[1], 10);
                    end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
                }

                if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
                    res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
                    return res.end();
                }

                const chunkSize = (end - start) + 1;
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': contentType
                });

                const fileStream = fs.createReadStream(filePath, { start, end });
                pipeline(fileStream, res, (err) => {
                    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
                        console.warn('Range stream pipeline notice:', err.message);
                    }
                });
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Accept-Ranges': 'bytes',
                    'Content-Type': contentType
                });
                const fileStream = fs.createReadStream(filePath);
                pipeline(fileStream, res, (err) => {
                    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
                        console.warn('File stream pipeline notice:', err.message);
                    }
                });
            }
        });
    })().catch(err => {
        console.error('Server request exception:', err);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('500 Internal Server Error');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`=======================================================`);
    console.log(`Presentation Server running at: http://localhost:${PORT}`);
    console.log(`Mobile Remote URL: http://${localIp}:${PORT}/remote.html`);
    console.log(`Security: Strict CSRF, Origin and Loopback validation active`);
    console.log(`Streaming: Robust HTTP Range and Pipeline enabled`);
    console.log(`=======================================================`);
});
