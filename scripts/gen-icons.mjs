import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function icon(x, y, s) {
  const cx = (x + 0.5) / s - 0.5;
  const cy = (y + 0.5) / s - 0.5;
  const r = Math.max(Math.abs(cx), Math.abs(cy));
  if (r > 0.46) return [0, 0, 0, 0];
  const rounded = r > 0.38;
  const bg = rounded ? [20, 42, 38, 255] : [11, 22, 28, 255];
  const jx = cx + 0.04;
  const inStem = jx > -0.08 && jx < 0.1 && cy > -0.22 && cy < 0.2;
  const inHook = (jx + 0.12) ** 2 + (cy - 0.18) ** 2 < 0.04 && cy > 0.08;
  const inBar = cy > -0.3 && cy < -0.18 && jx > -0.18 && jx < 0.22;
  if (inStem || inHook || inBar) return [62, 224, 181, 255];
  return bg;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(root, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(join(root, `icon-${size}.png`), png(size, icon));
}
console.log('wrote icons');
