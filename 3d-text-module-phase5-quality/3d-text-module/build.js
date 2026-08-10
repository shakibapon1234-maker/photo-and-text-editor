const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const timestamp = Date.now();

esbuild
  .build({
    entryPoints: ['src/main.js'],
    bundle: true,
    outfile: 'www/main.bundle.js',
    format: 'esm',
    target: ['es2020'],
    loader: { '.json': 'json' },
    logLevel: 'info',
  })
  .then(() => {
    const wwwDir = path.join(__dirname, 'www');

    // PLAN_3 §4 (Phase C1): gif.js's encoder runs in a Web Worker, loaded by
    // the browser via `new Worker('gif.worker.js')` — a plain script URL,
    // not an ES import, so esbuild's bundle above never sees or copies it.
    // Has to be copied into www/ by hand on every build instead.
    const gifWorkerSrc = path.join(__dirname, 'node_modules', 'gif.js', 'dist', 'gif.worker.js');
    const gifWorkerDest = path.join(wwwDir, 'gif.worker.js');
    if (fs.existsSync(gifWorkerSrc)) {
      fs.copyFileSync(gifWorkerSrc, gifWorkerDest);
      console.log('Copied gif.worker.js to www/');
    } else {
      console.warn('WARNING: node_modules/gif.js/dist/gif.worker.js not found — GIF export will fail until `npm install` is run.');
    }

    const htmlPath = path.join(wwwDir, 'index.html');
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf8');
      html = html.replace(/src="main\.bundle\.js(?:\?v=\d+)?"/g, `src="main.bundle.js?v=${timestamp}"`);
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`Updated www/index.html script tag cache buster (v=${timestamp})`);
    }

    // Sync to docs/ directory if present
    const docsWwwDir = path.join(__dirname, '..', '..', 'docs', '3d-text-module-phase5-quality', '3d-text-module', 'www');
    if (fs.existsSync(docsWwwDir)) {
      fs.copyFileSync(path.join(wwwDir, 'main.bundle.js'), path.join(docsWwwDir, 'main.bundle.js'));
      fs.copyFileSync(path.join(wwwDir, 'index.html'), path.join(docsWwwDir, 'index.html'));
      fs.copyFileSync(path.join(wwwDir, 'style.css'), path.join(docsWwwDir, 'style.css'));
      if (fs.existsSync(gifWorkerDest)) {
        fs.copyFileSync(gifWorkerDest, path.join(docsWwwDir, 'gif.worker.js'));
      }
      console.log(`Synced build files to docs/3d-text-module-phase5-quality/3d-text-module/www/`);
    }

    const docsRootDir = path.join(__dirname, '..', '..', 'docs');
    const rootIndexHtml = path.join(__dirname, '..', '..', 'index.html');
    if (fs.existsSync(docsRootDir) && fs.existsSync(rootIndexHtml)) {
      fs.copyFileSync(rootIndexHtml, path.join(docsRootDir, 'index.html'));
      console.log(`Synced root index.html to docs/index.html`);
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
