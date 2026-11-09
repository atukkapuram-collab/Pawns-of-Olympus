// `npm run package:itch`: zips dist/ into release/pawns-of-olympus-web.zip for an
// itch.io HTML5 upload. Pure Node (zlib deflate + crc32), no shell tools needed.
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { deflateRawSync, crc32 } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(dist);

const parts = [];
const centrals = [];
let offset = 0;
for (const file of files) {
  const name = Buffer.from(relative(dist, file).split('\\').join('/'));
  const data = readFileSync(file);
  const comp = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);

  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4);
  lh.writeUInt16LE(8, 8);
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(comp.length, 18);
  lh.writeUInt32LE(data.length, 22);
  lh.writeUInt16LE(name.length, 26);
  parts.push(lh, name, comp);

  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0);
  ch.writeUInt16LE(20, 4);
  ch.writeUInt16LE(20, 6);
  ch.writeUInt16LE(8, 10);
  ch.writeUInt32LE(crc, 16);
  ch.writeUInt32LE(comp.length, 20);
  ch.writeUInt32LE(data.length, 24);
  ch.writeUInt16LE(name.length, 28);
  ch.writeUInt32LE(offset, 42);
  centrals.push(ch, name);

  offset += lh.length + name.length + comp.length;
}

const cd = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(cd.length, 12);
end.writeUInt32LE(offset, 16);

mkdirSync(join(root, 'release'), { recursive: true });
const out = join(root, 'release', 'pawns-of-olympus-web.zip');
writeFileSync(out, Buffer.concat([...parts, cd, end]));
console.log(`wrote ${relative(root, out)} (${files.length} files)`);
