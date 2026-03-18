import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const entries = [
  { in: 'src/content/index.js', out: 'dist/content.js' },
  { in: 'src/background/index.js', out: 'dist/background.js' },
  { in: 'src/popup/popup.js', out: 'dist/popup.js' },
];

async function build() {
  mkdirSync('dist', { recursive: true });

  // Bundle JS entry points as IIFE (Chrome extension content scripts require this)
  for (const entry of entries) {
    await esbuild.build({
      entryPoints: [entry.in],
      bundle: true,
      format: 'iife',
      outfile: entry.out,
      minify: false,
      sourcemap: false,
      target: 'chrome120',
      logLevel: 'info',
    });
  }

  // Copy static assets
  cpSync('static/icons', 'dist/icons', { recursive: true });
  cpSync('static/overlay.css', 'dist/overlay.css');
  cpSync('src/debug/debug.js', 'dist/debug.js');
  cpSync('src/popup/popup.html', 'dist/popup.html');
  cpSync('src/popup/popup.css', 'dist/popup.css');

  // Copy manifest.json
  cpSync('manifest.json', 'dist/manifest.json');

  console.log('Build complete → dist/');
}

async function watch() {
  // Initial build
  await build();

  // Watch mode for JS bundles
  for (const entry of entries) {
    const ctx = await esbuild.context({
      entryPoints: [entry.in],
      bundle: true,
      format: 'iife',
      outfile: entry.out,
      minify: false,
      sourcemap: false,
      target: 'chrome120',
      logLevel: 'info',
    });
    await ctx.watch();
  }

  console.log('Watching for changes...');
}

if (isWatch) {
  watch().catch(console.error);
} else {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
