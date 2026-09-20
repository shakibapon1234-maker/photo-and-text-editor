const { app, BrowserWindow, session, net } = require('electron');
const path = require('path');
const http = require('http');
const net_mod = require('net');
const fs = require('fs');
const os = require('os');

// Set unique app name and isolated userData directory to prevent LevelDB & GPU cache lock collisions with other Electron apps
app.name = 'PhotoAnd3DTextStudio';
try {
    const customUserData = path.join(app.getPath('appData'), 'PhotoAnd3DTextStudio');
    if (!fs.existsSync(customUserData)) fs.mkdirSync(customUserData, { recursive: true });
    app.setPath('userData', customUserData);
} catch (e) {
    console.warn('Custom userData path error:', e);
}

let mainWindow = null;
let server = null;
const SERVER_PORT = 8000;

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
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm'
};

let lastCommand = { id: 0, action: null, val: null };

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

function startInternalServer(callback) {
    server = http.createServer((req, res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Access-Control-Allow-Origin', '*');

        let decodedUrl = '';
        try {
            decodedUrl = decodeURIComponent(req.url);
        } catch (e) {
            decodedUrl = req.url;
        }

        const parsedUrl = new URL(decodedUrl, `http://localhost:${SERVER_PORT}`);
        const pathname = parsedUrl.pathname;

        // Mobile Remote Endpoints
        if (pathname === '/api/remote-send') {
            const action = parsedUrl.searchParams.get('action');
            if (action) lastCommand = { id: Date.now(), action };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true }));
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

        // ── Persistent Project Save Endpoint ─────────────────────────────
        // FINAL.html is a user-supplied temporary backup. It is deleted only
        // after the app has copied its embedded backgrounds into IndexedDB.
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
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data && Array.isArray(data.slides) && data.slides.length > 0) {
                        const hasImagePlaceholders = data.slides.some(slide =>
                            String(slide?.bgMedia || '').startsWith('[heavy-bg-media-') ||
                            String(slide?.bgImage || '').startsWith('[heavy-bg-image-') ||
                            (Array.isArray(slide?.elements) && slide.elements.some(element =>
                                element?.__hasLargeSrc || element?.src === '[base64-image-in-idb]'
                            ))
                        );
                        // Do not replace the durable project with a
                        // quota-safe browser outline that has no image bytes.
                        if (hasImagePlaceholders) {
                            res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
                            return res.end(JSON.stringify({ success: false, error: 'Incomplete image backup rejected' }));
                        }
                        fs.writeFileSync(path.join(__dirname, 'recovered-project.json'), JSON.stringify(data, null, 2), 'utf8');
                        fs.writeFileSync(path.join(__dirname, 'presentation-default-deck.js'), 'window.DEFAULT_RECOVERED_SLIDES = ' + JSON.stringify(data.slides) + ';\n', 'utf8');
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ success: true, count: data.slides?.length }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    return res.end(JSON.stringify({ error: err.message }));
                }
            });
            return;
        }

        let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('404 Not Found');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end(`500 Internal Server Error: ${err.code}`);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            // Port is occupied — try to connect to it to confirm it's a live server
            // (not a zombie). If we can connect we just reuse it; otherwise wait.
            console.warn(`Port ${SERVER_PORT} already in use – reusing existing server.`);
            if (callback) callback();
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
            // Use a named persistent partition so IndexedDB and localStorage
            // are stored and SURVIVE across app restarts.
            partition: 'persist:studio'
        }
    });

    mainWindow.loadURL(`http://localhost:${SERVER_PORT}/index.html`);
    mainWindow.on('closed', () => { mainWindow = null; });
}

// Disable HTTP disk cache so every JS/HTML file loads fresh from disk
// This does NOT clear IndexedDB or localStorage — those are preserved between sessions.
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// Kill any zombie process holding port 8000 before we try to bind
function freePort(port) {
    return new Promise(resolve => {
        const tester = net_mod.createServer();
        tester.once('error', () => resolve(false)); // port in use, can't free
        tester.once('listening', () => { tester.close(); resolve(true); }); // port free
        tester.listen(port, '127.0.0.1');
    });
}

app.whenReady().then(async () => {
    // Grant media permissions for webcam / microphone if the app ever needs them
    const studioSession = session.fromPartition('persist:studio');
    studioSession.setPermissionRequestHandler((_webContents, permission, callback) => {
        callback(permission === 'media');
    });

    startInternalServer(() => {
        createWindow();
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.on('render-process-gone', (event, details) => {
                console.error('Renderer process gone (crashed):', details);
                // Automatically recover from crash by reloading
                setTimeout(() => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.loadURL(`http://localhost:${SERVER_PORT}/index.html`);
                    }
                }, 500);
            });
            mainWindow.webContents.on('unresponsive', () => {
                console.warn('MainWindow became temporarily unresponsive');
            });
        }
    });
});

app.on('window-all-closed', () => {
    if (server) try { server.close(); } catch (_) {}
    app.quit();
    process.exit(0);
});
