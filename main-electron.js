const { app, BrowserWindow, session, net, shell } = require('electron');
const path = require('path');
const http = require('http');
const net_mod = require('net');
const fs = require('fs');
const os = require('os');
const { pipeline } = require('stream');

// Configure custom userData path BEFORE requesting single instance lock (Fix Item 13)
app.name = 'PhotoAnd3DTextStudio';
try {
    const customUserData = path.join(app.getPath('appData'), 'PhotoAnd3DTextStudio');
    if (!fs.existsSync(customUserData)) fs.mkdirSync(customUserData, { recursive: true });
    app.setPath('userData', customUserData);
} catch (e) {
    console.warn('Custom userData path error:', e);
}

// Enforce single instance lock
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    app.quit();
    process.exit(0);
}

let mainWindow = null;
let server = null;
const SERVER_PORT = 8000;
const openSockets = new Set();

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
    '.map': 'application/json',
    '.avif': 'image/avif',
    '.mov': 'video/quicktime',
    '.txt': 'text/plain; charset=utf-8'
};

const ALLOWED_STATIC_EXTS = new Set(Object.keys(MIME_TYPES));
const VALID_PRESETS = new Set(['loop_60s', 'loop_30s', 'loop_120s', 'bg_720p_full', 'bg_540p']);
const ALLOWED_REMOTE_ACTIONS = new Set(['next', 'prev', 'nextSlide', 'prevSlide', 'fullscreen']);
let activeConversions = 0;
const MAX_CONCURRENT_CONVERSIONS = 2;
let saveProjectPromise = Promise.resolve();

let cmdCounter = 1;
let lastCommand = { id: 0, action: null, val: null, cid: null, t: 0 };

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

function isValidHostHeader(req) {
    const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase();
    if (!hostHeader) return false;
    if (hostHeader === 'localhost' || hostHeader === '127.0.0.1') return true;
    if (/^(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})$/.test(hostHeader)) return true;
    return false;
}

function isLocalOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) {
        const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase();
        return (hostHeader === 'localhost' || hostHeader === '127.0.0.1');
    }
    try {
        const u = new URL(origin);
        const host = u.hostname;
        const port = u.port || (u.protocol === 'https:' ? '443' : '80');
        return (host === 'localhost' || host === '127.0.0.1') && String(port) === String(SERVER_PORT);
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
    try {
        await fs.promises.writeFile(tmpPath, content, 'utf8');
        await fs.promises.rename(tmpPath, filePath);
    } catch (err) {
        try { await fs.promises.unlink(tmpPath); } catch (_) {}
        throw err;
    }
}

function isStaticAccessAllowed(relativeFilePath, isLoopback) {
    const normalized = path.normalize(relativeFilePath).replace(/^[\\\/]+/, '');
    if (normalized.startsWith('..')) return false;

    const parts = normalized.split(path.sep);
    for (const part of parts) {
        if (!part) continue;
        if (part.startsWith('.')) return false;
    }

    const ext = path.extname(normalized).toLowerCase();
    if (!ALLOWED_STATIC_EXTS.has(ext)) return false;

    const filename = path.basename(normalized).toLowerCase();
    if (filename === 'server.js' || filename === 'main-electron.js' || filename === 'package.json' || filename === 'package-lock.json') {
        return false;
    }

    if (filename === 'recovered-project.json' || filename === 'presentation-default-deck.js') {
        if (!isLoopback) return false;
    }

    return true;
}

function startInternalServer(callback) {
    server = http.createServer((req, res) => {
        (async () => {
            if (!isValidHostHeader(req)) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                return res.end('400 Bad Request: Invalid Host');
            }

            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('X-Content-Type-Options', 'nosniff');

            // Strictly restricted CORS header
            const reqOrigin = req.headers.origin;
            if (reqOrigin && isLocalOrigin(req)) {
                res.setHeader('Access-Control-Allow-Origin', reqOrigin);
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
            }

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                return res.end();
            }

            // Safe URL parsing with malformed URI protection
            let parsedUrl;
            let pathname = '';
            try {
                parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
                pathname = decodeURIComponent(parsedUrl.pathname);
            } catch (_) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                return res.end('400 Bad Request: Malformed URI');
            }

            // Health check (EADDRINUSE second-instance detection)
            if (pathname === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: true, name: 'photo-and-text-editor', port: SERVER_PORT }));
            }

            // Mobile Remote Endpoints
            if (pathname === '/api/remote-send') {
                const action = parsedUrl.searchParams.get('action');
                const val = parsedUrl.searchParams.get('val') || '';
                const cid = parsedUrl.searchParams.get('cid') || '';
                if (action && ALLOWED_REMOTE_ACTIONS.has(action)) {
                    cmdCounter++;
                    lastCommand = { id: cmdCounter, action, val, cid, t: Date.now() };
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: true, command: lastCommand }));
            }

            if (pathname === '/api/remote-poll') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ command: lastCommand }));
            }

            if (pathname === '/api/ip') {
                const ip = getLocalIp();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    ip,
                    port: SERVER_PORT,
                    remoteUrl: `http://${ip}:${SERVER_PORT}/remote.html`
                }));
            }

            // Restrict sensitive administrative APIs
            if (pathname === '/api/convert-video' || pathname === '/api/delete-final-backup' || pathname === '/api/save-project') {
                const isLocal = isLoopbackClient(req);
                const isSameOrigin = isLocalOrigin(req);
                const contentType = (req.headers['content-type'] || '').toLowerCase();

                if (!isLocal || !isSameOrigin || !contentType.includes('application/json')) {
                    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, error: 'Forbidden: Unauthorized or cross-site request blocked' }));
                }
            }

            // ── Video Conversion API Endpoint ─────────────────────────────
            if (pathname === '/api/convert-video' && req.method === 'POST') {
                if (activeConversions >= MAX_CONCURRENT_CONVERSIONS) {
                    res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: false, error: 'Too many concurrent video conversions. Please wait.' }));
                }
                activeConversions++;
                try {
                    const body = await readRequestBody(req, 2 * 1024 * 1024);
                    const data = JSON.parse(body);
                    const inputPath = path.resolve(data.filePath || '');
                    const preset = String(data.preset || 'loop_60s');
                    const rawTrim = data.customTrim !== undefined ? String(data.customTrim).trim() : '';

                    if (!VALID_PRESETS.has(preset)) {
                        activeConversions = Math.max(0, activeConversions - 1);
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        return res.end(JSON.stringify({ success: false, error: 'Invalid preset specified' }));
                    }

                    let customTrim = '';
                    if (rawTrim) {
                        if (!/^\d+(\.\d+)?$/.test(rawTrim) && !/^(\d{1,2}:)?\d{1,2}:\d{2}(\.\d+)?$/.test(rawTrim)) {
                            activeConversions = Math.max(0, activeConversions - 1);
                            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                            return res.end(JSON.stringify({ success: false, error: 'Invalid customTrim format' }));
                        }
                        customTrim = rawTrim;
                    }

                    const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.flv', '.wmv', '.m4v', '.ts']);
                    const ext = path.extname(inputPath).toLowerCase();
                    if (!inputPath || !fs.existsSync(inputPath) || !ALLOWED_VIDEO_EXTS.has(ext)) {
                        activeConversions = Math.max(0, activeConversions - 1);
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
                        activeConversions = Math.max(0, activeConversions - 1);
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
                    activeConversions = Math.max(0, activeConversions - 1);
                    const status = err.message === 'Payload too large' ? 413 : 400;
                    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ error: err.message }));
                }
                return;
            }

            // ── Persistent Project Save Endpoint ─────────────────────────────
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

                    // Serialize concurrent writes through saveProjectPromise queue
                    await (saveProjectPromise = saveProjectPromise.catch(() => {}).then(async () => {
                        await atomicWriteFileAsync(path.join(__dirname, 'recovered-project.json'), JSON.stringify(data));
                        await atomicWriteFileAsync(path.join(__dirname, 'presentation-default-deck.js'), 'window.DEFAULT_RECOVERED_SLIDES = ' + JSON.stringify(data.slides) + ';\n');
                    }));

                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: true, count: data.slides.length }));
                } catch (err) {
                    const status = err.message === 'Payload too large' ? 413 : 500;
                    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ error: err.message }));
                }
            }

            // Static files with Range & Pipeline streaming
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
                return res.end('405 Method Not Allowed');
            }

            let resolvedRelPath = pathname === '/' ? 'index.html' : pathname.replace(/^[\\\/]+/, '');
            const isLocal = isLoopbackClient(req);

            if (!isStaticAccessAllowed(resolvedRelPath, isLocal)) {
                res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
                return res.end('403 Forbidden');
            }

            let filePath = path.join(__dirname, resolvedRelPath);
            try {
                const stats = await fs.promises.stat(filePath);
                if (stats.isDirectory()) {
                    filePath = path.join(filePath, 'index.html');
                    resolvedRelPath = path.join(resolvedRelPath, 'index.html');
                    if (!isStaticAccessAllowed(resolvedRelPath, isLocal)) {
                        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
                        return res.end('403 Forbidden');
                    }
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
                    if (match) {
                        let start, end;
                        if (match[1] === '') {
                            const suffix = parseInt(match[2], 10);
                            if (!isNaN(suffix) && suffix > 0) {
                                start = Math.max(0, fileSize - suffix);
                                end = fileSize - 1;
                            }
                        } else {
                            start = parseInt(match[1], 10);
                            end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
                        }

                        if (end >= fileSize) {
                            end = fileSize - 1;
                        }

                        if (!isNaN(start) && start >= 0 && start < fileSize && start <= end) {
                            const chunkSize = (end - start) + 1;
                            res.writeHead(206, {
                                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                                'Accept-Ranges': 'bytes',
                                'Content-Length': chunkSize,
                                'Content-Type': contentType
                            });

                            const fileStream = fs.createReadStream(filePath, { start, end });
                            pipeline(fileStream, res, (errStream) => {
                                if (errStream && errStream.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
                                    console.warn('Range stream pipeline notice:', errStream.message);
                                }
                            });
                            return;
                        }
                    }
                    // Multi-range or invalid range: fall through to full file
                }

                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Accept-Ranges': 'bytes',
                    'Content-Type': contentType
                });
                const fileStream = fs.createReadStream(filePath);
                pipeline(fileStream, res, (errStream) => {
                    if (errStream && errStream.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
                        console.warn('File stream pipeline notice:', errStream.message);
                    }
                });
            });
        })().catch(err => {
            console.error('Electron internal server error:', err);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('500 Internal Server Error');
            }
        });
    });

    server.on('connection', socket => {
        openSockets.add(socket);
        socket.on('close', () => openSockets.delete(socket));
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            // পোর্ট অন্য কেউ ব্যবহার করছে — health-check দিয়ে verify করি
            // এটা আমাদেরই server কিনা (যেমন second-instance ক্ষেত্রে)
            console.warn(`Port ${SERVER_PORT} already in use – verifying our server.`);
            const http = require('http');
            const req = http.request(
                { host: '127.0.0.1', port: SERVER_PORT, path: '/health', timeout: 2000 },
                (res) => {
                    let body = '';
                    res.on('data', (chunk) => { body += chunk; });
                    res.on('end', () => {
                        try {
                            const json = JSON.parse(body);
                            if (json.ok === true) {
                                console.log('Our server already running – proceeding.');
                                if (callback) callback();
                                return;
                            }
                        } catch (_) {}
                        showPortConflictError();
                    });
                }
            );
            req.on('error', showPortConflictError);
            req.on('timeout', () => { req.destroy(); showPortConflictError(); });
            req.end();

            function showPortConflictError() {
                console.error(`Port ${SERVER_PORT} is in use by an unknown process. Aborting.`);
                const { dialog } = require('electron');
                dialog.showErrorBox(
                    'Port Conflict',
                    `Port ${SERVER_PORT} is already in use by another application.\nPlease close it and restart Photo & 3D Text Studio.`
                );
                require('electron').app.quit();
            }
        } else {
            console.error('Server error:', err);
        }
    });

    server.listen(SERVER_PORT, '0.0.0.0', () => {
        console.log(`Server listening on port ${SERVER_PORT}`);
        if (callback) callback();
    });
}

function createWindow() {
    const iconPath = path.join(__dirname, 'icon.png');
    mainWindow = new BrowserWindow({
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'Photo & 3D Text Studio',
        autoHideMenuBar: true,
        backgroundColor: '#0f1115',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            partition: 'persist:studio'
        }
    });

    // Window navigation & popups security
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        try {
            const parsed = new URL(url);
            if (parsed.origin === `http://localhost:${SERVER_PORT}` || parsed.origin === `http://127.0.0.1:${SERVER_PORT}`) {
                return {
                    action: 'allow',
                    overrideBrowserWindowOptions: {
                        autoHideMenuBar: true,
                        webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: true,
                            sandbox: true
                        }
                    }
                };
            }
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                shell.openExternal(url);
            }
        } catch (_) {}
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        try {
            const parsed = new URL(navigationUrl);
            if (parsed.origin !== `http://localhost:${SERVER_PORT}` && parsed.origin !== `http://127.0.0.1:${SERVER_PORT}`) {
                event.preventDefault();
                if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                    shell.openExternal(navigationUrl);
                }
            }
        } catch (_) {
            event.preventDefault();
        }
    });

    mainWindow.loadURL(`http://localhost:${SERVER_PORT}/index.html`);
    mainWindow.on('closed', () => { mainWindow = null; });
}

// App command-line flags
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// Second-instance handler
app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

let crashReloadCount = 0;
let lastCrashTime = 0;

app.whenReady().then(async () => {
    const studioSession = session.fromPartition('persist:studio');
    studioSession.setPermissionRequestHandler((_webContents, permission, callback) => {
        callback(permission === 'media');
    });

    startInternalServer(() => {
        createWindow();
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.on('render-process-gone', (event, details) => {
                console.error('Renderer process gone (crashed):', details);
                const now = Date.now();
                if (now - lastCrashTime < 30000) {
                    crashReloadCount++;
                } else {
                    crashReloadCount = 1;
                }
                lastCrashTime = now;

                if (crashReloadCount <= 3) {
                    setTimeout(() => {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.loadURL(`http://localhost:${SERVER_PORT}/index.html`);
                        }
                    }, 500);
                } else {
                    console.error('Renderer crashed repeatedly. Halting auto-reload.');
                }
            });
            mainWindow.webContents.on('unresponsive', () => {
                console.warn('MainWindow became temporarily unresponsive');
            });
        }
    });
});

app.on('window-all-closed', () => {
    if (server) {
        try {
            // Destroy all active keep-alive sockets so server closes cleanly
            for (const socket of openSockets) {
                socket.destroy();
            }
            openSockets.clear();
            server.close(() => {
                app.quit();
            });
            return;
        } catch (_) {}
    }
    app.quit();
});
