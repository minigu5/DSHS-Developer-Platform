import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';

import { analyzeIconBytes, analyzeSvg, decodePng } from './icon-fit-analyze.ts';
import { parseIconFit } from './icon-fit.ts';

type Px = [number, number, number, number];

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** RGBA PNG(필터 0)를 만든다 */
function png(size: number, pixel: (x: number, y: number) => Px): Uint8Array {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) raw.set(pixel(x, y), y * (size * 4 + 1) + 1 + x * 4);
  }
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', new Uint8Array()),
    ]),
  );
}

const CLEAR: Px = [0, 0, 0, 0];
const WHITE: Px = [255, 255, 255, 255];
const ORANGE: Px = [244, 81, 44, 255];
const BLACK: Px = [15, 15, 16, 255];

/** (x0..x1)×(y0..y1) 안의 둥근 네모(반지름 r) */
function inRoundRect(x: number, y: number, x0: number, x1: number, r: number): boolean {
  if (x < x0 || x > x1 || y < x0 || y > x1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, x0 + r), x1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

test('PNG를 풀어 픽셀을 그대로 돌려준다', async () => {
  const img = await decodePng(png(4, (x, y) => [x * 10, y * 10, 7, 200]));
  assert.ok(img);
  assert.equal(img.width, 4);
  assert.deepEqual([...img.data.subarray((2 * 4 + 3) * 4, (2 * 4 + 3) * 4 + 4)], [30, 20, 7, 200]);
});

test('모서리만 투명한 꽉 찬 타일 → 그 색을 바탕으로', async () => {
  const fit = await analyzeIconBytes(png(64, (x, y) => (inRoundRect(x, y, 0, 63, 16) ? ORANGE : CLEAR)));
  assert.deepEqual(fit, { bg: '#f4512c' });
});

test('투명 여백 안의 타일 → 바탕색 + 꽉 채울 영역', async () => {
  const fit = await analyzeIconBytes(png(100, (x, y) => (inRoundRect(x, y, 10, 89, 12) ? BLACK : CLEAR)));
  assert.ok(fit);
  assert.equal(fit.bg, '#0f0f10');
  assert.ok(fit.box);
  const [x, y, size] = fit.box;
  assert.ok(x >= 0.1 && x <= 0.12, `x ${x}`);
  assert.equal(x, y);
  assert.ok(size >= 0.77 && size <= 0.8, `size ${size}`);
});

test('그림에 박힌 흰 여백 안의 타일도 꽉 채운다', async () => {
  const fit = await analyzeIconBytes(png(100, (x, y) => (inRoundRect(x, y, 8, 91, 10) ? BLACK : WHITE)));
  assert.ok(fit);
  assert.equal(fit.bg, '#0f0f10');
  assert.ok(fit.box && fit.box[2] < 0.85);
});

test('타일 안의 글자는 바탕색 평균에 섞이지 않는다', async () => {
  const fit = await analyzeIconBytes(
    png(64, (x, y) => (x > 28 && x < 36 && y > 10 && y < 54 ? WHITE : inRoundRect(x, y, 0, 63, 14) ? ORANGE : CLEAR)),
  );
  assert.deepEqual(fit, { bg: '#f4512c' });
});

test('투명 배경 위 글자·동그라미 로고는 그대로(흰 바탕)', async () => {
  const glyph = await analyzeIconBytes(png(64, (x, y) => (x > 20 && x < 44 && y > 8 && y < 56 && (x < 26 || y < 14) ? BLACK : CLEAR)));
  assert.deepEqual(glyph, {});
  const circle = await analyzeIconBytes(png(64, (x, y) => ((x - 32) ** 2 + (y - 32) ** 2 <= 30 * 30 ? ORANGE : CLEAR)));
  assert.deepEqual(circle, {});
});

test('꽉 찬 불투명 그림(사진·iOS 아이콘)은 할 일 없음', async () => {
  assert.deepEqual(await analyzeIconBytes(png(32, () => ORANGE)), {});
  assert.deepEqual(await analyzeIconBytes(png(32, (x, y) => [x * 8, y * 8, 0, 255])), {});
});

test('줄이지 못한 큰 그림은 건너뛰고(null), 줄여 주면 작은 것으로 살핀다', async () => {
  const big = png(100, (x, y) => (inRoundRect(x, y, 0, 99, 20) ? ORANGE : CLEAR));
  assert.equal(await analyzeIconBytes(big, { maxPixels: 64 * 64 }), null);
  const small = png(32, (x, y) => (inRoundRect(x, y, 0, 31, 7) ? BLACK : CLEAR));
  assert.deepEqual(await analyzeIconBytes(big, { maxPixels: 64 * 64, shrink: async () => small }), { bg: '#0f0f10' });
  assert.deepEqual(await analyzeIconBytes(big, { maxPixels: 100 * 100, shrink: async () => null }), { bg: '#f4512c' });
});

test('SVG — 첫 도형이 꽉 찬 단색 네모면 그 색', () => {
  assert.deepEqual(
    analyzeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#f4512c"/><path d="M0 0" fill="#080808"/></svg>'),
    { bg: '#f4512c' },
  );
  assert.deepEqual(analyzeSvg('<svg viewBox="0 0 512 512"><title>x</title><rect width="100%" height="100%" rx="150" style="fill: #000"/></svg>'), { bg: '#000000' });
});

test('SVG — 여백 안 정사각형 바탕은 꽉 채운다', () => {
  const fit = analyzeSvg('<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="rgb(15,15,16)"/></svg>');
  assert.equal(fit.bg, '#0f0f10');
  assert.ok(fit.box && Math.abs(fit.box[0] - 0.108) < 0.002 && Math.abs(fit.box[2] - 0.784) < 0.002);
});

test('SVG — 바탕 네모가 아니면(그림·그라데이션·반투명·변형) 그대로', () => {
  assert.deepEqual(analyzeSvg('<svg viewBox="0 0 64 64"><path d="M0 0h64v64H0z" fill="#fff"/></svg>'), {});
  assert.deepEqual(analyzeSvg('<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="url(#g)"/></svg>'), {});
  assert.deepEqual(analyzeSvg('<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#fff" opacity="0.5"/></svg>'), {});
  assert.deepEqual(analyzeSvg('<svg viewBox="0 0 64 64"><g transform="scale(2)"><rect width="64" height="64" fill="#fff"/></g></svg>'), {});
  assert.deepEqual(analyzeSvg('<svg viewBox="0 0 64 64"><rect x="0" y="40" width="64" height="10" fill="#fff"/></svg>'), {});
});

test('parseIconFit — 지금 아이콘 것만, 값은 검사해서', () => {
  const src = 'https://a.dev/icon.png';
  assert.equal(parseIconFit({ src: 'https://old.dev/i.png', bg: '#000000' }, src), null);
  assert.equal(parseIconFit(null, src), null);
  assert.deepEqual(parseIconFit({ src, bg: '#f4512c', box: [0.1, 0.1, 0.8] }, src), { src, bg: '#f4512c', box: [0.1, 0.1, 0.8] });
  assert.deepEqual(parseIconFit({ src, bg: 'red;background:url(x)', box: [0.5, 0.5, 0.8] }, src), { src });
});
