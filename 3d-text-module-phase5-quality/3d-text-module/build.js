// Bundles src/main.js (+ its `three` imports and the vendored font JSON) into
// a single www/main.bundle.js. Same esbuild pattern as PLAN_1_Photo_Editor's
// build.js, chosen here in Phase 2 to replace the Phase 1 CDN importmap
// (see src/main.js top comment for why).
const esbuild = require('esbuild');

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
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
