// 아이콘 맞춤값(projects.icon_fit) 채우기 — 자기 바탕이 있는 아이콘의 바탕색·꽉 채울 영역(src/lib/icon-fit.ts).
//
// 새로 저장하는 아이콘은 폼(서버 액션 refreshIconFit)이, 자동 아이콘은 매일 밤 파비콘 동기화가 맞춘다.
// 이 스크립트는 처음 한 번(2026-11-08 칸을 만들 때)과 한꺼번에 다시 맞출 때 쓴다 — 로컬이라 그림을 줄이지 않고 원래 크기로 살핀다.
// 로컬 실행:
//   node scripts/backfill-icon-fit.mts --dry-run   # 결과만 출력
//   node scripts/backfill-icon-fit.mts             # 실제 DB 업데이트
//   node scripts/backfill-icon-fit.mts --all       # 이미 맞춘 것도 다시
//
// 필요 환경변수(.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeIconFit, iconFitStale } from '../src/lib/icon-fit-fetch.ts';

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

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const ALL = process.argv.includes('--all');
const CONCURRENCY = 4;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 설정하세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await supabase
  .from('projects')
  .select('id, title, visibility, icon_url, icon_fit')
  .not('icon_url', 'is', null)
  .order('created_at');

if (error) {
  console.error(`❌  프로젝트 목록을 읽지 못했어요: ${error.message}`);
  process.exit(1);
}

type Row = { id: string; title: string; visibility: string; icon_url: string; icon_fit: unknown };
const rows = ((data ?? []) as Row[]).filter((row) => ALL || iconFitStale(row.icon_url, row.icon_fit));

// 출력을 어디 붙여도 되게 비공개 프로젝트는 제목 대신 id 앞부분만 찍는다
const labelOf = (row: Row) => (row.visibility === 'public' ? row.title : `비공개 프로젝트 ${row.id.slice(0, 8)}`);
console.log(`아이콘 맞춤값 대상 ${rows.length}개${DRY_RUN ? ' (dry-run)' : ''}`);

const count = { fitted: 0, plain: 0, skipped: 0, failed: 0 };

async function handle(row: Row) {
  const fit = await computeIconFit(row.icon_url);
  if (!fit) {
    count.skipped++;
    console.log(`- ${labelOf(row)}: 아이콘을 못 받음(다음에 다시)`);
    return;
  }
  const special = Boolean(fit.bg || fit.box);
  const values = { bg: fit.bg, box: fit.box };
  console.log(`${special ? '~' : '='} ${labelOf(row)}: ${special ? JSON.stringify(values) : '그대로(흰 바탕)'}`);
  if (DRY_RUN) {
    count[special ? 'fitted' : 'plain']++;
    return;
  }
  // 그사이 아이콘이 바뀌었으면 덮지 않는다
  const { error: updateError } = await supabase.from('projects').update({ icon_fit: fit }).eq('id', row.id).eq('icon_url', row.icon_url);
  if (updateError) {
    count.failed++;
    console.error(`! ${labelOf(row)}: 저장 실패 — ${updateError.message}`);
  } else {
    count[special ? 'fitted' : 'plain']++;
  }
}

let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < rows.length) await handle(rows[next++]);
  }),
);

console.log(`끝 — 맞춤 ${count.fitted}, 그대로 ${count.plain}, 건너뜀 ${count.skipped}, 실패 ${count.failed}`);
if (count.failed > 0) process.exit(1);
