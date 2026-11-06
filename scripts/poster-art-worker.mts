// 포스터 그림을 그리는 학교 Mac mini 의 토큰 관리(설계: docs/superpowers/specs/2026-11-06-poster-mac-art-design.md §5-6).
//
//   node scripts/poster-art-worker.mts add <name>     # 새 토큰을 한 번만 출력(DB 에는 해시만)
//   node scripts/poster-art-worker.mts list           # 이름·마지막 연락·끊김 여부
//   node scripts/poster-art-worker.mts revoke <name>  # 그 Mac 만 끊기
//
// 필요 환경변수(.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hashToken } from '../src/lib/posters/art-jobs-logic.ts';

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

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) fail('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요해요.');
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const [command, name] = process.argv.slice(2);
const kst = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-');

if (command === 'add') {
  if (!name || !/^[a-z0-9-]{1,40}$/.test(name)) fail('이름은 영문 소문자·숫자·- 로 40자까지예요. 예: mini-1');
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Buffer.from(bytes).toString('base64url');
  const { error } = await supabase.from('poster_art_workers').insert({ name, token_hash: await hashToken(token) });
  if (error) fail(error.code === '23505' ? `이미 있는 이름이에요: ${name}` : `만들지 못했어요: ${error.message}`);
  console.log(`${name} 토큰 — 이 값은 다시 볼 수 없어요. Mac 에 바로 넣어 주세요.`);
  console.log(token);
} else if (command === 'list') {
  const { data, error } = await supabase.from('poster_art_workers').select('name, created_at, last_seen_at, revoked_at').order('name');
  if (error) fail(error.message);
  for (const w of data ?? []) {
    console.log(`${w.name}\t마지막 연락 ${kst(w.last_seen_at)}\t${w.revoked_at ? `끊김(${kst(w.revoked_at)})` : '사용 중'}`);
  }
  if (!data?.length) console.log('등록된 Mac 이 없어요.');
} else if (command === 'revoke') {
  if (!name) fail('끊을 이름을 적어 주세요.');
  const { data, error } = await supabase
    .from('poster_art_workers')
    .update({ revoked_at: new Date().toISOString() })
    .eq('name', name)
    .is('revoked_at', null)
    .select('name');
  if (error) fail(error.message);
  console.log(data?.length ? `${name} 을(를) 끊었어요.` : `사용 중인 ${name} 이(가) 없어요.`);
} else {
  fail('사용법: node scripts/poster-art-worker.mts add <name> | list | revoke <name>');
}
