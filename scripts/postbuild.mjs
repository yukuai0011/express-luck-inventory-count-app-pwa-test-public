import { existsSync } from 'node:fs';
import { copyFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '..', 'dist');

if (!existsSync(distPath)) {
  console.warn('dist folder not found; skipping Pages tweaks.');
  process.exit(0);
}

await writeFile(join(distPath, '.nojekyll'), '');
await copyFile(join(distPath, 'index.html'), join(distPath, '404.html'));
