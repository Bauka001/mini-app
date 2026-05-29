import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

// Run with: node scripts/generate-cover.mjs
// Source: public/branding/cover-640x360.svg
// Output: public/branding/cover-640x360.png — upload this to BotFather as the
// Mini App preview cover (640x360 per the BotFather hint).

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'public', 'branding', 'cover-640x360.svg'));

const png = await sharp(src, { density: 192 })
  .resize(640, 360)
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(join(root, 'public', 'branding', 'cover-640x360.png'), png);
console.log(`wrote public/branding/cover-640x360.png (${png.length} bytes)`);
