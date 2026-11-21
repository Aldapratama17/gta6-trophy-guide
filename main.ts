import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });

const DOSSIER_MAX_SIZE = 1.5 * 1024 * 1024; // 1.5 MiB

function getFileSize(filePath: string): number {
  try { return statSync(filePath).size; } catch { return 0; }
}

function listFilesRecursively(dir: string, base = ''): Array<{path: string, size: number}> {
  const results: Array<{path: string, size: number}> = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    const relativePath = base + entry;
    if (stat.isDirectory()) {
      results.push(...listFilesRecursively(fullPath, relativePath + '/'));
    } else {
      results.push({ path: relativePath, size: stat.size });
    }
  }
  return results;
}

function copyAndReport(src: string, dest: string, label: string): { count: number; totalBytes: number } {
  console.log(`📦 Copying ${label} to output...`);
  cpSync(src, dest, { recursive: true });

  const files = listFilesRecursively(src);
  let totalBytes = 0;
  for (const f of files) {
    const kb = (f.size / 1024).toFixed(1);
    console.log(`   ${f.path}: ${kb} KiB`);
    totalBytes += f.size;
  }
  console.log(`   → ${label} total: ${files.length} files, ${(totalBytes / 1024).toFixed(1)} KiB`);
  return { count: files.length, totalBytes };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

const appSrc = join(scriptDir, 'app');
const appDest = join(outputDir, 'app');
const appResult = copyAndReport(appSrc, appDest, 'app/');

const shotsSrc = join(scriptDir, 'screenshots');
const shotsDest = join(outputDir, 'screenshots');
mkdirSync(shotsDest, { recursive: true });
let shotsResult = { count: 0, totalBytes: 0 };
if (existsSync(shotsSrc)) {
  shotsResult = copyAndReport(shotsSrc, shotsDest, 'screenshots/');
} else {
  console.log('   → screenshots/ not found (skipped)');
}

console.log('📝 Building dossier.json...');
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

const dossierSize = getFileSize(join(outputDir, 'dossier.json'));
console.log(`   → dossier.json: ${formatBytes(dossierSize)}`);

// Size guard
if (dossierSize > DOSSIER_MAX_SIZE) {
  console.warn(`⚠️  Warning: dossier.json (${formatBytes(dossierSize)}) exceeds ${formatBytes(DOSSIER_MAX_SIZE)} limit!`);
  process.exit(1);
}

// Summary
const totalFiles = appResult.count + shotsResult.count + 1; // +1 for dossier.json
const totalBytes = appResult.totalBytes + shotsResult.totalBytes + dossierSize;
console.log('');
console.log('📊 Build Summary:');
console.log(`   Total files: ${totalFiles}`);
console.log(`   Total size:  ${formatBytes(totalBytes)}`);
console.log(`   Dossier:     ${formatBytes(dossierSize)} (limit: ${formatBytes(DOSSIER_MAX_SIZE)})`);
console.log('✅ Build complete');
