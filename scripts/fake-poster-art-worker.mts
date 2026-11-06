// 가짜 학교 Mac — omm 없이 포스터 그림 대기 목록을 끝까지 확인한다(설계: docs/superpowers/specs/2026-11-06-poster-mac-art-design.md §5-8).
// claim RPC 로 일감을 받아 단색 PNG 를 result 로 올린다.
//
//   node scripts/fake-poster-art-worker.mts --token-file <파일> [옵션]
//     --seed <posterId>  서비스 키로 그 포스터에 queued 일감을 넣고 art_job_id 를 기록한 뒤 시작
//     --fail             그리지 않고 fail 을 보낸다
//     --slow <초>        그리는 척 기다린다(15초마다 ping)
//     --twice            같은 결과를 두 번 보낸다(두 번째도 200 이어야 함)
//     --html             PNG 대신 HTML 바이트를 image/png 로 보낸다(415 여야 함)
//     --wait <초>        일감이 올 때까지 3초마다 묻는 최대 시간(기본 120)
//     --site <주소>      기본 http://localhost:3000
//
// 토큰은 node scripts/poster-art-worker.mts add <name> 으로 만든다. 필요 환경변수(.env.local):
// NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, (--seed 때) SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { parseArgs } from 'node:util';

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  } catch {
    // .env.local 없으면 process.env 그대로 사용
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** 단색 PNG(RGB 8bit) — 테스트 그림 */
function solidPng(width: number, height: number, rgb: [number, number, number]): Uint8Array {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

loadEnv();
const { values: opt } = parseArgs({
  options: {
    'token-file': { type: 'string' },
    seed: { type: 'string' },
    fail: { type: 'boolean', default: false },
    slow: { type: 'string', default: '0' },
    twice: { type: 'boolean', default: false },
    html: { type: 'boolean', default: false },
    wait: { type: 'string', default: '120' },
    site: { type: 'string', default: 'http://localhost:3000' },
  },
});
if (!opt['token-file']) fail('--token-file <파일> 이 필요해요.');
const token = readFileSync(opt['token-file'], 'utf8').trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) fail('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요해요.');
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

if (opt.seed) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) fail('--seed 에는 SUPABASE_SERVICE_ROLE_KEY 가 필요해요.');
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: poster } = await admin.from('project_posters').select('id, created_by').eq('id', opt.seed).maybeSingle();
  if (!poster?.created_by) fail('그 포스터가 없거나 만든 사람이 없어요.');
  const { data: job, error } = await admin
    .from('poster_art_jobs')
    .insert({ poster_id: poster.id, user_id: poster.created_by, prompt: 'test: a flat blue square', width: 512, height: 384 })
    .select('id')
    .single();
  if (error || !job) fail(`일감을 못 넣었어요: ${error?.message}`);
  await admin.from('project_posters').update({ art_job_id: job.id }).eq('id', poster.id);
  console.log('일감 넣음', job.id);
}

type Claimed = { id: string; prompt: string; width: number; height: number; job_secret: string };
let claimed: Claimed | undefined;
const deadline = Date.now() + Number(opt.wait) * 1000;
while (!claimed && Date.now() < deadline) {
  const { data, error } = await anon.rpc('claim_poster_art_job', { p_token: token });
  if (error) console.error('claim 오류', error.message);
  claimed = (data as Claimed[] | null)?.[0];
  if (!claimed) await sleep(3000);
}
if (!claimed) fail('받은 일감이 없어요.');
console.log('받음', claimed.id, `${claimed.width}x${claimed.height}`);

for (let left = Number(opt.slow) * 1000; left > 0; left -= 15_000) {
  await sleep(Math.min(left, 15_000));
  await anon.rpc('poster_art_ping', { p_token: token });
}

const headers = { Authorization: `Bearer ${token}`, 'X-Job-Secret': claimed.job_secret };
const base = `${opt.site}/api/poster-art/jobs/${claimed.id}`;
if (opt.fail) {
  const res = await fetch(`${base}/fail`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'fake: 일부러 실패' }) });
  console.log('fail', res.status);
} else {
  const body = opt.html ? new TextEncoder().encode('<html><script>alert(1)</script></html>') : solidPng(claimed.width, claimed.height, [37, 99, 235]);
  for (let i = 0; i < (opt.twice ? 2 : 1); i++) {
    const res = await fetch(`${base}/result`, { method: 'POST', headers: { ...headers, 'Content-Type': 'image/png' }, body: new Uint8Array(body) });
    console.log('result', res.status);
  }
}
