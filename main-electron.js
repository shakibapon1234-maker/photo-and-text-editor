const { app, BrowserWindow, Menu, session } = require('electron');

try {
    app.setAppUserModelId('com.shakib.photostudio');
} catch (_) {}
const path = require('path');
const http = require('http');
const fs = require('fs');

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

function startInternalServer(callback) {
    server = http.createServer((req, res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        let decodedUrl = '';
        try {
            decodedUrl = decodeURIComponent(req.url);
        } catch (e) {
            decodedUrl = req.url;
        }

        const parsedUrl = new URL(decodedUrl, `http://localhost:${SERVER_PORT}`);
        let filePath = path.join(__dirname, parsedUrl.pathname);

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
                res.end(content, 'utf-8');
            }
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${SERVER_PORT} already in use, using existing server.`);
            if (callback) callback();
        } else {
            console.error('Server error:', err);
        }
    });

    server.listen(SERVER_PORT, () => {
        console.log(`Internal server running on port ${SERVER_PORT}`);
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
            webSecurity: true
        }
    });

    mainWindow.loadURL(`http://localhost:${SERVER_PORT}/index.html`);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Voice-controlled presentations require microphone access. Only the
    // media permission is granted; all other permission types stay denied.
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
        callback(permission === 'media');
    });

    startInternalServer(() => {
        createWindow();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (server) {
        try {
            server.close();
        } catch (_) {}
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
