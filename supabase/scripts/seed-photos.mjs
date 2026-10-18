// LOCAL DEVELOPMENT ONLY. Uploads placeholder images for the seed profiles' photo rows, so
// Discover and profile pages show real pictures on the local database.
//
//   cd ~/Projects/habeshamatch && node supabase/scripts/seed-photos.mjs
//
// Run it after `supabase db reset` (which loads seed.sql). Needs macOS (uses `sips` to make JPEGs).
// Refuses to run against anything but the local Supabase.

import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const root = new URL('../../', import.meta.url).pathname;
const require = createRequire(join(root, 'mobile/package.json'));
const { createClient } = require('@supabase/supabase-js');

const status = JSON.parse(execSync('supabase status -o json', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
const url = status.API_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) {
  console.error(`Refusing to run: ${url} is not the local Supabase.`);
  process.exit(1);
}
const sb = createClient(url, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Minimal PNG encoder for a vertical two-colour gradient (no image libraries needed).
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function gradientPng(w, h, [r1, g1, b1], [r2, g2, b2]) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const px = [r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t].map(Math.round);
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) raw.set(px, row + 1 + x * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Warm palette in the spirit of the app's colours.
const PALETTE = [
  [[212, 162, 76], [58, 51, 48]],
  [[201, 123, 132], [41, 37, 36]],
  [[232, 199, 126], [90, 60, 40]],
  [[120, 90, 70], [28, 25, 23]],
  [[180, 110, 90], [50, 40, 60]],
  [[150, 130, 100], [30, 45, 50]],
];

const dir = mkdtempSync(join(tmpdir(), 'seed-photos-'));
const jpeg = (name, w, h, colors) => {
  const png = join(dir, `${name}.png`);
  const jpg = join(dir, `${name}.jpg`);
  writeFileSync(png, gradientPng(w, h, ...colors));
  execSync(`sips -s format jpeg -s formatOptions 70 "${png}" --out "${jpg}"`, { stdio: 'ignore' });
  return readFileSync(jpg);
};

const { data: photos, error } = await sb
  .from('photos')
  .select('storage_path, position, user_id')
  .like('storage_path', 'a0000000-0000-4000-8000-%')
  .order('storage_path');
if (error) throw error;

let uploaded = 0;
for (const [i, p] of photos.entries()) {
  const colors = PALETTE[(i + p.position) % PALETTE.length];
  const full = jpeg(`full${i}`, 810, 1080, colors);
  const thumb = jpeg(`thumb${i}`, 300, 400, colors);
  const thumbPath = p.storage_path.replace(/\.jpg$/, '.thumb.jpg');
  const a = await sb.storage.from('photos').upload(p.storage_path, full, { contentType: 'image/jpeg', upsert: true });
  const b = await sb.storage.from('photos').upload(thumbPath, thumb, { contentType: 'image/jpeg', upsert: true });
  if (a.error || b.error) console.error(p.storage_path, a.error?.message ?? b.error?.message);
  else uploaded += 1;
}
rmSync(dir, { recursive: true, force: true });
console.log(`Uploaded ${uploaded} of ${photos.length} seed photos (with thumbnails) to the local Supabase.`);
