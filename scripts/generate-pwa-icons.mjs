import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

// Run with: node scripts/generate-pwa-icons.mjs
// Produces: public/icon-192.png, public/icon-512.png, public/icon-512-maskable.png,
// and public/apple-touch-icon.png. Re-run after editing public/icon.svg.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'public', 'icon.svg'));

const targets = [
  { name: 'icon-192.png', size: 192, padding: 0 },
  { name: 'icon-512.png', size: 512, padding: 0 },
  // maskable: 80% safe zone — pad the source so OS-level masking does not crop the glyph
  { name: 'icon-512-maskable.png', size: 512, padding: 64 },
  { name: 'apple-touch-icon.png', size: 180, padding: 0 },
];

for (const t of targets) {
  const innerSize = t.size - t.padding * 2;
  const composited = await sharp({
    create: { width: t.size, height: t.size, channels: 4, background: '#0f0f13' },
  })
    .composite([
      {
        input: await sharp(src).resize(innerSize, innerSize).png().toBuffer(),
        top: t.padding,
        left: t.padding,
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(join(root, 'public', t.name), composited);
  console.log(`wrote public/${t.name} (${composited.length} bytes)`);
}
