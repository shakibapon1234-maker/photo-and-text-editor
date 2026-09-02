const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');

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
    '.ico': 'image/x-icon'
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

        let filePath = path.join(__dirname, pathname === '/' ? 'presentation-player.html' : pathname);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'presentation-player.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${SERVER_PORT} in use, attaching to existing.`);
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
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'Presentation Player Desktop',
        autoHideMenuBar: true,
        backgroundColor: '#0a101e',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadURL(`http://localhost:${SERVER_PORT}/presentation-player.html`);
    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
        callback(permission === 'media');
    });

    startInternalServer(() => {
        createWindow();
    });
});

app.on('window-all-closed', () => {
    if (server) try { server.close(); } catch (_) {}
    if (process.platform !== 'darwin') app.quit();
});
