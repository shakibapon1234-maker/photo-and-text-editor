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

    // Copy bundled fonts from assets/fonts into www/assets/fonts so the
    // optional TTF (e.g. NotoSansBengali-Regular.ttf) is available at
    // runtime for the canvas text path. This is best-effort: if the
    // directory doesn't exist nothing is copied.
    const fontsSrcDir = path.join(__dirname, 'assets', 'fonts');
    const fontsDestDir = path.join(wwwDir, 'assets', 'fonts');
    if (fs.existsSync(fontsSrcDir)) {
      fs.mkdirSync(fontsDestDir, { recursive: true });
      for (const f of fs.readdirSync(fontsSrcDir)) {
        const s = path.join(fontsSrcDir, f);
        const d = path.join(fontsDestDir, f);
        fs.copyFileSync(s, d);
      }
      console.log('Copied assets/fonts -> www/assets/fonts/');
    }

    const htmlPath = path.join(wwwDir, 'index.html');
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf8');
      if (/src="main\.bundle\.js\?v=\d+"/.test(html)) {
        html = html.replace(/src="main\.bundle\.js\?v=\d+"/g, 'src="main.bundle.js"');
        fs.writeFileSync(htmlPath, html, 'utf8');
        console.log('Cleaned www/index.html script tag');
      }
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
      const docsFontsDest = path.join(docsWwwDir, 'assets', 'fonts');
      const wwwFontsDir = path.join(wwwDir, 'assets', 'fonts');
      if (fs.existsSync(wwwFontsDir)) {
        fs.mkdirSync(docsFontsDest, { recursive: true });
        for (const f of fs.readdirSync(wwwFontsDir)) {
          fs.copyFileSync(path.join(wwwFontsDir, f), path.join(docsFontsDest, f));
        }
      }
      console.log(`Synced build files to docs/3d-text-module-phase5-quality/3d-text-module/www/`);
    }

    const docsRootDir = path.join(__dirname, '..', '..', 'docs');
    const rootIndexHtml = path.join(__dirname, '..', '..', 'index.html');
    if (fs.existsSync(docsRootDir) && fs.existsSync(rootIndexHtml)) {
      fs.copyFileSync(rootIndexHtml, path.join(docsRootDir, 'index.html'));
      // The suite launcher also exposes this light standalone Canvas tool.
      // Copy it with the root page so the Logo Motion tab works on deployment.
      const logoToolSource = path.join(__dirname, '..', '..', 'spinning-circle-animation.html');
      if (fs.existsSync(logoToolSource)) {
        fs.copyFileSync(logoToolSource, path.join(docsRootDir, 'spinning-circle-animation.html'));
        // The standalone Logo Motion exporter uses gif.js directly, so keep
        // its encoder and worker next to both deployable HTML files.
        if (fs.existsSync(gifWorkerSrc)) {
          fs.copyFileSync(path.join(__dirname, 'node_modules', 'gif.js', 'dist', 'gif.js'), path.join(__dirname, '..', '..', 'gif.js'));
          fs.copyFileSync(gifWorkerSrc, path.join(__dirname, '..', '..', 'gif.worker.js'));
          fs.copyFileSync(path.join(__dirname, '..', '..', 'gif.js'), path.join(docsRootDir, 'gif.js'));
          fs.copyFileSync(path.join(__dirname, '..', '..', 'gif.worker.js'), path.join(docsRootDir, 'gif.worker.js'));
        }
      }
      const promoToolSource = path.join(__dirname, '..', '..', 'promo-motion-studio.html');
      if (fs.existsSync(promoToolSource)) {
        fs.copyFileSync(promoToolSource, path.join(docsRootDir, 'promo-motion-studio.html'));
      }
      console.log(`Synced root index.html to docs/index.html`);
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
