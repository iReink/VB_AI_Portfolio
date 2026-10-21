import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// One-time import of the six author-supplied attachments. Build does not need originals.
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/prepare-images.mjs <attachment-directory>');
await mkdir('public/images', { recursive: true });
const images = [
  ['a86a503f-ed48-422f-a969-314b418e6b61', 'portrait', 800],
  ['a5867b03-0677-4be6-be5e-b0a1ca8a50c6', 'track-editor', 900],
  ['2e253a4e-1216-46b9-972c-32590f4cc380', 'track-map', 900],
  ['53ecf117-d8ee-4cfe-adb8-234660a9da93', 'diary', 1440],
  ['2879c71b-ed5b-4fb6-b193-0a0bb496b63b', 'diary-chart', 1440],
  ['ab895f1e-2bf1-4596-9079-5bae5a75d853', 'diary-bot', 900],
];
for (const [id, name, width] of images) {
  await sharp(join(source, `codex-clipboard-${id}.png`))
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile(`public/images/${name}.webp`);
}
await sharp('public/images/portrait.webp')
  .resize(640, 640)
  .jpeg({ quality: 88 })
  .toFile('public/images/portrait.jpg');
console.log('Prepared author-provided images.');
