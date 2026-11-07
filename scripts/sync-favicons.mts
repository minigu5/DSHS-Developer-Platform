// 파비콘 자동 동기화: icon_type='auto'(URL에서 자동 추출) 프로젝트의 icon_url 을 사이트의 지금 파비콘으로 맞춘다.
//
// 매일 밤은 Worker 예약 작업(custom-worker.ts scheduled → /api/favicon-sync/run)이 같은 판단 로직으로 돈다.
// GitHub Actions는 러너 IP를 Cloudflare가 막아 사이트를 못 읽어서 2026-11-07 그만뒀다. 이 스크립트는 로컬에서 한꺼번에 맞출 때 쓴다.
// 로컬 실행:
//   node scripts/sync-favicons.mts --dry-run   # 바뀔 내용만 출력
//   node scripts/sync-favicons.mts             # 실제 DB 업데이트
//
// 필요 환경변수(.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isImageOk, resolveFavicon } from '../src/lib/favicon.ts';
import { syncFavicon, type FaviconSyncRow } from '../src/lib/favicon-sync.ts';

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
// 프로젝트 하나에 최대 30초쯤 걸려서(페이지 6초 + 후보 8개 × 3.5초) 몇 개씩 동시에 확인한다
const CONCURRENCY = 4;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 설정하세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await supabase
  .from('projects')
  .select('id, title, visibility, url, icon_url')
  .eq('icon_type', 'auto')
  .not('url', 'is', null)
  .order('created_at');

if (error) {
  console.error(`❌  프로젝트 목록을 읽지 못했어요: ${error.message}`);
  process.exit(1);
}

type Row = FaviconSyncRow & { visibility: string };
const rows = (data ?? []) as Row[];

// 출력을 어디 붙여도 되게 비공개 프로젝트는 제목·주소 대신 id 앞부분만 찍는다
const labelOf = (row: Row) => (row.visibility === 'public' ? row.title : `비공개 프로젝트 ${row.id.slice(0, 8)}`);
const iconOf = (row: Row, icon: string | null) => (row.visibility === 'public' ? (icon ?? '없음') : '(비공개)');
console.log(`파비콘 동기화 대상 ${rows.length}개${DRY_RUN ? ' (dry-run)' : ''}`);

const count = { updated: 0, same: 0, skipped: 0, failed: 0 };

async function handle(row: Row) {
  let outcome;
  try {
    outcome = await syncFavicon(row, { resolve: resolveFavicon, check: isImageOk });
  } catch (err) {
    count.failed++;
    console.error(`! ${labelOf(row)}: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  if (outcome.kind === 'unchanged') {
    count.same++;
    console.log(`= ${labelOf(row)}: 그대로`);
    return;
  }
  if (outcome.kind === 'skipped') {
    count.skipped++;
    console.log(`- ${labelOf(row)}: 건너뜀 — ${outcome.reason}`);
    return;
  }

  console.log(`~ ${labelOf(row)}: ${iconOf(row, row.icon_url)} → ${iconOf(row, outcome.patch.icon_url)}`);
  if (DRY_RUN) {
    count.updated++;
    return;
  }
  // 그사이 사용자가 직접 올리기로 바꿨으면 덮어쓰지 않게 icon_type 도 조건에 건다
  const { error: updateError } = await supabase
    .from('projects')
    .update(outcome.patch)
    .eq('id', row.id)
    .eq('icon_type', 'auto');
  if (updateError) {
    count.failed++;
    console.error(`! ${labelOf(row)}: 저장 실패 — ${updateError.message}`);
  } else {
    count.updated++;
  }
}

let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < rows.length) await handle(rows[next++]);
  }),
);

console.log(`끝 — 갱신 ${count.updated}, 그대로 ${count.same}, 건너뜀 ${count.skipped}, 실패 ${count.failed}`);
// 사이트를 못 찾는 건 흔해서 건너뜀으로 두고, DB 저장 실패만 실패로 끝낸다
if (count.failed > 0) process.exit(1);
