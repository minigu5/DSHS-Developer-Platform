// 아이콘 그림을 살펴 맞춤값(bg·box)을 정한다 — 네트워크 없는 순수 로직(테스트 icon-fit-analyze.test.ts).
// Workers 무료 요금제 CPU 10ms 안에 끝나야 해서 PNG는 직접 풀고(압축 해제는 DecompressionStream), 큰 그림은 건너뛴다.
// SVG는 그릴 수 없으니 "맨 처음 그리는 도형이 바탕 네모"인 흔한 모양만 알아본다.
// 스크립트(scripts/backfill-icon-fit.mts)가 node로 바로 읽으므로 상대 경로 import만 쓴다.

export type FitValues = { bg?: string; box?: [number, number, number] };

export interface Rgba {
  width: number;
  height: number;
  /** RGBA 8bit, 줄 순서 */
  data: Uint8Array;
}

// 이보다 큰 그림은 풀지 않는다 — 맞춤값 없음 = 예전처럼 흰 바탕.
// 180px 하나를 풀고 살피는 데 처음 한 번은 CPU 20~30ms가 들어서(JIT 전) Workers는 64px로 줄여서 넘긴다(icon-fit-fetch.ts shrink)
export const MAX_PIXELS = 512 * 512;

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const toHex = (r: number, g: number, b: number) => `#${hex(r)}${hex(g)}${hex(b)}`;

// ── PNG ───────────────────────────────────────────────

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function isPng(b: Uint8Array): boolean {
  return b.length > 33 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}

/** 8bit(팔레트는 1~8bit), 비월(interlace) 아닌 PNG만. 못 풀면 null */
export async function decodePng(bytes: Uint8Array, maxPixels = MAX_PIXELS): Promise<Rgba | null> {
  if (!isPng(bytes)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 8;
  let width = 0, height = 0, depth = 0, colorType = -1, interlace = 0;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  while (off + 8 <= bytes.length) {
    const len = view.getUint32(off);
    const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
    const chunk = bytes.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = view.getUint32(off + 8);
      height = view.getUint32(off + 12);
      depth = chunk[8];
      colorType = chunk[9];
      interlace = chunk[12];
    } else if (type === 'PLTE') palette = chunk;
    else if (type === 'tRNS') trns = chunk;
    else if (type === 'IDAT') idat.push(chunk);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!width || !height || width * height > maxPixels || interlace !== 0) return null;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) return null;
  if (colorType === 3 ? ![1, 2, 4, 8].includes(depth) || !palette : depth !== 8) return null;

  let total = 0;
  for (const c of idat) total += c.length;
  const joined = new Uint8Array(total);
  let p = 0;
  for (const c of idat) { joined.set(c, p); p += c.length; }
  let raw: Uint8Array;
  try {
    raw = await inflate(joined);
  } catch {
    return null;
  }

  const bitsPerPixel = channels * depth;
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  const bpp = Math.max(1, bitsPerPixel >> 3);
  if (raw.length < height * (stride + 1)) return null;
  const lines = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const r = raw[src + x];
      const a = x >= bpp ? lines[dst + x - bpp] : 0;
      const b = y > 0 ? lines[dst - stride + x] : 0;
      const c = x >= bpp && y > 0 ? lines[dst - stride + x - bpp] : 0;
      let v: number;
      if (filter === 0) v = r;
      else if (filter === 1) v = r + a;
      else if (filter === 2) v = r + b;
      else if (filter === 3) v = r + ((a + b) >> 1);
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v = r + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      } else return null;
      lines[dst + x] = v & 255;
    }
  }

  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (colorType === 6) {
        data.set(lines.subarray(row + x * 4, row + x * 4 + 4), o);
      } else if (colorType === 2) {
        data[o] = lines[row + x * 3]; data[o + 1] = lines[row + x * 3 + 1]; data[o + 2] = lines[row + x * 3 + 2]; data[o + 3] = 255;
      } else if (colorType === 0 || colorType === 4) {
        const g = lines[row + x * channels];
        data[o] = data[o + 1] = data[o + 2] = g;
        data[o + 3] = colorType === 4 ? lines[row + x * 2 + 1] : 255;
      } else {
        const bit = x * depth;
        const idx = (lines[row + (bit >> 3)] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
        data[o] = palette![idx * 3]; data[o + 1] = palette![idx * 3 + 1]; data[o + 2] = palette![idx * 3 + 2];
        data[o + 3] = trns && idx < trns.length ? trns[idx] : 255;
      }
    }
  }
  return { width, height, data };
}

/** ICO 안에 든 PNG 중 가장 큰 것(옛 BMP 형식은 건너뜀) */
export function pngFromIco(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 6 || bytes[0] !== 0 || bytes[1] !== 0 || bytes[2] !== 1 || bytes[3] !== 0) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(4, true);
  let best: Uint8Array | null = null;
  let bestSize = 0;
  for (let i = 0; i < count && 6 + i * 16 + 16 <= bytes.length; i++) {
    const e = 6 + i * 16;
    const size = (bytes[e] || 256) * (bytes[e + 1] || 256);
    const len = view.getUint32(e + 8, true);
    const at = view.getUint32(e + 12, true);
    const img = bytes.subarray(at, at + len);
    if (isPng(img) && size > bestSize) { best = img; bestSize = size; }
  }
  return best;
}

// ── 픽셀 살펴보기 ─────────────────────────────────────

const SOLID = 200;
const CLEAR = 16;
const near = (d: Uint8Array, i: number, c: number[], tol: number) =>
  Math.abs(d[i] - c[0]) <= tol && Math.abs(d[i + 1] - c[1]) <= tol && Math.abs(d[i + 2] - c[2]) <= tol;

/**
 * 그림이 "자기 바탕을 가진 네모(타일)"인지 본다.
 * - 모서리가 투명: 투명하지 않은 부분의 상자를 구한다(바깥 여백이 있으면 box).
 * - 모서리·테두리가 같은 색으로 꽉 참(흰 여백이 그림에 박힘): 그 색과 다른 부분의 상자를 구한다.
 * 상자의 네 변 안쪽이 모두 불투명하면 타일 — 그 변 색 평균이 bg. 투명 배경 위 글자·로고는 타일이 아니라 그대로(흰 바탕).
 */
export function analyzePixels({ width: w, height: h, data: d }: Rgba): FitValues {
  const at = (x: number, y: number) => (y * w + x) * 4;
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  let isContent: (i: number) => boolean;
  let baked = false;

  if (corners.every((i) => d[i + 3] < CLEAR)) {
    isContent = (i) => d[i + 3] >= 128;
  } else if (corners.every((i) => d[i + 3] >= SOLID)) {
    const border = [d[corners[0]], d[corners[0] + 1], d[corners[0] + 2]];
    let same = 0, all = 0;
    for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { all++; if (d[at(x, y) + 3] >= SOLID && near(d, at(x, y), border, 24)) same++; }
    for (let y = 0; y < h; y++) for (const x of [0, w - 1]) { all++; if (d[at(x, y) + 3] >= SOLID && near(d, at(x, y), border, 24)) same++; }
    // 테두리가 한 색이 아니면 꽉 찬 그림(사진 등) — 흰 바탕이 안 보이니 할 일 없음
    if (same / all < 0.97) return {};
    baked = true;
    isContent = (i) => d[i + 3] >= 128 && !near(d, i, border, 40);
  } else {
    return {};
  }

  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isContent(at(x, y))) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return {};
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  // 박힌 여백인데 내용이 끝까지 차 있으면 여백이 없는 것
  if (baked && Math.min(x0, y0, w - 1 - x1, h - 1 - y1) < w * 0.02) return {};
  if (bw < w * 0.3 || bh < h * 0.3 || bw / bh > 1.12 || bh / bw > 1.12) return {};

  // 네 변의 가운데 절반을, 가장자리 번짐을 피해 조금 안쪽에서 살핀다
  const inset = Math.max(2, Math.round(Math.min(bw, bh) * 0.04));
  const samples: number[] = [];
  for (let t = 0.25; t <= 0.75; t += 0.05) {
    const sx = Math.round(x0 + t * (bw - 1)), sy = Math.round(y0 + t * (bh - 1));
    samples.push(at(sx, y0 + inset), at(sx, y1 - inset), at(x0 + inset, sy), at(x1 - inset, sy));
  }
  if (!samples.every((i) => isContent(i) && d[i + 3] >= SOLID)) return {};
  let r = 0, g = 0, b = 0;
  for (const i of samples) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = samples.length;
  const fit: FitValues = { bg: toHex(r / n, g / n, b / n) };

  const margin = Math.min(x0, y0, w - 1 - x1, h - 1 - y1) / w;
  if (margin >= 0.02 && w === h) {
    // 정사각형으로 맞추고 타일 가장자리 번짐(박힌 흰 여백과 섞인 줄)이 안 보이게 1%쯤 더 안으로
    const side = Math.max(bw, bh);
    const pad = Math.round(side * 0.01);
    const size = side - pad * 2;
    const x = Math.min(Math.max(0, Math.round(x0 + (bw - side) / 2) + pad), w - size);
    const y = Math.min(Math.max(0, Math.round(y0 + (bh - side) / 2) + pad), h - size);
    const round = (v: number) => Math.round(v * 1000) / 1000;
    fit.box = [round(x / w), round(y / h), round(size / w)];
  }
  return fit;
}

// ── SVG ───────────────────────────────────────────────

const NAMED: Record<string, string> = { white: '#ffffff', black: '#000000' };

function parseColor(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  if (NAMED[s]) return NAMED[s];
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return `#${[...m[1]].map((c) => c + c).join('')}`;
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return s;
  m = s.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (m) return toHex(Math.min(255, +m[1]), Math.min(255, +m[2]), Math.min(255, +m[3]));
  return null;
}

function attrsOf(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) out[m[1].toLowerCase()] = m[3] ?? m[4];
  for (const decl of (out.style ?? '').split(';')) {
    const [k, ...rest] = decl.split(':');
    if (k && rest.length) out[k.trim().toLowerCase()] = rest.join(':').trim();
  }
  return out;
}

/** 맨 처음 그리는 도형이 꽉 찬(또는 여백 안의) 단색 네모면 그 색을 바탕으로 */
export function analyzeSvg(text: string): FitValues {
  const svgTag = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!svgTag) return {};
  const svg = attrsOf(svgTag);
  const vb = (svg.viewbox ?? '').trim().split(/[\s,]+/).map(Number);
  const [vx, vy, vw, vh] = vb.length === 4 && vb.every(Number.isFinite) ? vb : [0, 0, parseFloat(svg.width), parseFloat(svg.height)];
  if (!(vw > 0 && vh > 0)) return {};

  const body = text
    .slice(text.indexOf(svgTag) + svgTag.length)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(defs|title|desc|style|metadata)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(defs|title|desc|style|metadata)\b[^>]*\/>/gi, '');
  // 감싸기만 하는 <g>(변형·투명도 없음)는 지나간다
  const first = body.match(/<(?!g\b|\/g\b)([a-z]+)\b[^>]*>/i);
  if (!first || first[1].toLowerCase() !== 'rect') return {};
  const before = body.slice(0, first.index);
  if (/<g\b[^>]*(transform|opacity|clip-path|mask|filter)/i.test(before)) return {};

  const a = attrsOf(first[0]);
  if (a.transform || a.mask || a.filter || a['clip-path']) return {};
  if ([a.opacity, a['fill-opacity']].some((o) => o !== undefined && parseFloat(o) < 1)) return {};
  const bg = parseColor(a.fill);
  if (!bg) return {};
  const len = (v: string | undefined, full: number, fallback: number) =>
    v === undefined ? fallback : v.trim().endsWith('%') ? (parseFloat(v) / 100) * full : parseFloat(v);
  const x = len(a.x, vw, 0) - vx, y = len(a.y, vh, 0) - vy;
  const rw = len(a.width, vw, 0), rh = len(a.height, vh, 0);
  if (![x, y, rw, rh].every(Number.isFinite) || rw <= 0 || rh <= 0) return {};

  const eps = vw * 0.01;
  if (x <= eps && y <= eps && x + rw >= vw - eps && y + rh >= vh - eps) return { bg };
  // 여백 안의 정사각형 바탕 — 꽉 채운다
  if (Math.abs(vw - vh) <= eps && Math.abs(rw - rh) <= eps && rw >= vw * 0.3 && x >= 0 && y >= 0 && x + rw <= vw + eps && y + rh <= vh + eps) {
    const round = (v: number) => Math.round(v * 1000) / 1000;
    const pad = rw * 0.01;
    return { bg, box: [round((x + pad) / vw), round((y + pad) / vh), round((rw - pad * 2) / vw)] };
  }
  return {};
}

// ── 들어온 파일 하나 ──────────────────────────────────

export interface AnalyzeOptions {
  /** 그림(PNG)을 작은 PNG로 줄여 준다 — Workers는 IMAGES 바인딩. 못 줄이면 null */
  shrink?: (png: Uint8Array) => Promise<Uint8Array | null>;
  /** 줄이지 못했을 때 그대로 풀 최대 픽셀 수 */
  maxPixels?: number;
}

export function isSvgBytes(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart().toLowerCase();
  return head.startsWith('<svg') || head.startsWith('<?xml') || head.includes('<svg');
}

/** 살펴볼 수 없는 형식이면 {}(할 일 없음), 줄이지 못해 너무 커서 건너뛰었으면 null(다음에 다시) */
export async function analyzeIconBytes(bytes: Uint8Array, opts: AnalyzeOptions = {}): Promise<FitValues | null> {
  let png = isPng(bytes) ? bytes : pngFromIco(bytes);
  if (png) {
    const small = opts.shrink ? await opts.shrink(png).catch(() => null) : null;
    if (small && isPng(small)) png = small;
    const limit = small ? MAX_PIXELS : (opts.maxPixels ?? MAX_PIXELS);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    if (view.getUint32(16) * view.getUint32(20) > limit) return null;
    const img = await decodePng(png, limit);
    return img ? analyzePixels(img) : {};
  }
  if (isSvgBytes(bytes)) return analyzeSvg(new TextDecoder().decode(bytes));
  // JPEG 등 투명이 없는 그림은 틀을 꽉 채운다
  return {};
}
