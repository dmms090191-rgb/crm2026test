const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.resolve(__dirname, '..', 'public', 'icons');

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makePNG(w, h, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function chunk(type, data) {
    const typeB = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const combo = Buffer.concat([typeB, data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc32(combo));
    return Buffer.concat([len, combo, c]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rowLen = w * 4 + 1;
  const raw = Buffer.alloc(h * rowLen);
  for (let y = 0; y < h; y++) {
    raw[y * rowLen] = 0;
    pixels.copy(raw, y * rowLen + 1, y * w * 4, (y + 1) * w * 4);
  }
  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function generateIcon(w, h, maskable) {
  const pixels = Buffer.alloc(w * h * 4);
  const cx = w / 2, cy = h / 2;
  const iconR = maskable ? 0.5 : 0.45;
  const cornerPx = w * (maskable ? 0.12 : 0.22);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const t = (x / w + y / h) / 2;
      const left = cx - w * iconR, right = cx + w * iconR;
      const top = cy - h * iconR, bottom = cy + h * iconR;
      let inside = false;
      if (x >= left && x <= right && y >= top && y <= bottom) {
        const dx = x < left + cornerPx ? x - (left + cornerPx) : x > right - cornerPx ? x - (right - cornerPx) : 0;
        const dy = y < top + cornerPx ? y - (top + cornerPx) : y > bottom - cornerPx ? y - (bottom - cornerPx) : 0;
        inside = (dx * dx + dy * dy) <= cornerPx * cornerPx;
      }
      if (maskable) {
        pixels[i]     = Math.round(14 + 2 * t);
        pixels[i + 1] = Math.round(165 + 20 * t);
        pixels[i + 2] = Math.round(233 - 104 * t);
        pixels[i + 3] = 255;
        const tx = (x - cx) / (w * iconR), ty = (y - cy) / (h * iconR);
        if ((ty > -0.45 && ty < -0.15 && Math.abs(tx) < 0.35) || (Math.abs(tx) < 0.1 && ty >= -0.15 && ty < 0.5)) {
          pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255; pixels[i + 3] = 255;
        }
      } else if (inside) {
        pixels[i]     = Math.round(14 + 2 * t);
        pixels[i + 1] = Math.round(165 + 20 * t);
        pixels[i + 2] = Math.round(233 - 104 * t);
        pixels[i + 3] = 255;
        const tx = (x - cx) / (w * iconR), ty = (y - cy) / (h * iconR);
        if ((ty > -0.45 && ty < -0.15 && Math.abs(tx) < 0.35) || (Math.abs(tx) < 0.1 && ty >= -0.15 && ty < 0.5)) {
          pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255; pixels[i + 3] = 255;
        }
      }
    }
  }
  return makePNG(w, h, pixels);
}

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const icons = [
  ['icon-192x192.png', 192, 192, false],
  ['icon-512x512.png', 512, 512, false],
  ['icon-192x192-maskable.png', 192, 192, true],
  ['icon-512x512-maskable.png', 512, 512, true],
  ['apple-touch-icon.png', 180, 180, true],
];

let allOk = true;
for (const [name, w, h, mask] of icons) {
  const dest = path.join(DIR, name);
  const existing = fs.existsSync(dest) && fs.statSync(dest).size > 100;
  if (existing) continue;
  const buf = generateIcon(w, h, mask);
  fs.writeFileSync(dest, buf);
  console.log('Generated ' + name + ' (' + buf.length + ' bytes)');
}

for (const [name] of icons) {
  const dest = path.join(DIR, name);
  const stat = fs.statSync(dest);
  if (stat.size < 100) {
    console.error('ERROR: ' + name + ' is too small (' + stat.size + ' bytes)');
    allOk = false;
  }
}

if (allOk) {
  console.log('All PWA icons OK');
} else {
  process.exit(1);
}
