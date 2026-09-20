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
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm'
};

// In-memory queue for mobile remote control commands
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
                    return ip; // Active local network IP
                }
                candidateIp = ip;
            }
        }
    }
    return candidateIp || '127.0.0.1';
}

const server = http.createServer((req, res) => {
    // Set No-Cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Enable CORS for all origins (allows mobile phones, local file://, and LAN clients)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // Decode URL
    let decodedUrl = '';
    try {
        decodedUrl = decodeURIComponent(req.url);
    } catch (e) {
        decodedUrl = req.url;
    }

    const parsedUrl = new URL(decodedUrl, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // ── API Endpoints for Mobile Remote Control ──────────────────────
    if (pathname === '/api/remote-send') {
        const action = parsedUrl.searchParams.get('action');
        const val = parsedUrl.searchParams.get('val') || '';
        if (action) {
            lastCommand = { id: Date.now(), action, val };
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

    // ── Persistent Project Save Endpoint ─────────────────────────────
    // FINAL.html is a user-supplied temporary backup. It is deleted only after
    // the browser has copied its embedded backgrounds into IndexedDB.
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
                    // A quota-safe browser backup may deliberately omit large
                    // base64 image bytes. Do not let it replace the durable
                    // project file with broken-image placeholders.
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

    // Serve static files
    let filePath = path.join(__dirname, pathname);
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

server.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`=======================================================`);
    console.log(`Presentation Server running at: http://localhost:${PORT}`);
    console.log(`Mobile Remote URL: http://${localIp}:${PORT}/remote.html`);
    console.log(`=======================================================`);
});
