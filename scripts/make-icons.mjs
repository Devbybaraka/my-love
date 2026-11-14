// Generates the app icons with no image dependencies: a small PNG encoder plus
// the heart's implicit equation, drawn on a dark plum square.
//
// Run with: npm run icons   (output → public/icon-*.png)

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour + alpha
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // no filter
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a + (b - a) * t;

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 3; // supersampling for smooth edges

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let heartHits = 0;

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = (x + (sx + 0.5) / SS) / size;
          const py = (y + (sy + 0.5) / SS) / size;
          // Heart space: the curve spans about 2.26 × 2.2 units, so this scale
          // keeps it inside the maskable safe zone (~60% of the square).
          const hx = (px - 0.5) * 3.67;
          const hy = -(py - 0.472) * 3.67;
          const a = hx * hx + hy * hy - 1;
          if (a * a * a - hx * hx * hy * hy * hy <= 0) heartHits += 1;
        }
      }

      const cover = heartHits / (SS * SS);
      const t = (x / size) * 0.6 + (y / size) * 0.4;

      // Sweetheart deep, with a soft glow behind the heart.
      let r = mix(23, 10, t);
      let g = mix(14, 8, t);
      let b = mix(30, 16, t);
      const glow = Math.max(0, cover);
      r += glow * 40;
      g += glow * 8;
      b += glow * 20;

      // The heart itself: warm rose.
      r = mix(r, 231, cover);
      g = mix(g, 154, cover);
      b = mix(b, 178, cover);

      const i = (y * size + x) * 4;
      rgba[i] = Math.round(Math.min(255, r));
      rgba[i + 1] = Math.round(Math.min(255, g));
      rgba[i + 2] = Math.round(Math.min(255, b));
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [file, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  fs.writeFileSync(path.join(OUT_DIR, file), render(size));
  console.log(`wrote public/${file} (${size}×${size})`);
}
