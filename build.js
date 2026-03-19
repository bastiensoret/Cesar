import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');
const isPackage = process.argv.includes('--package');

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
  cpSync('src/popup/popup.html', 'dist/popup.html');
  cpSync('src/popup/popup.css', 'dist/popup.css');

  // Copy manifest.json, stripping debug content script for production
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
  if (isPackage) {
    manifest.content_scripts = manifest.content_scripts.filter(
      (cs) => !cs.js.includes('debug.js'),
    );
  } else {
    cpSync('src/debug/debug.js', 'dist/debug.js');
  }
  writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));

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

async function packageExtension() {
  await build();

  const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
  const zipName = `cesar-v${manifest.version}.zip`;

  execSync(`cd dist && zip -r ../${zipName} .`);
  console.log(`Packaged → ${zipName}`);
}

if (isWatch) {
  watch().catch(console.error);
} else if (isPackage) {
  packageExtension().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
