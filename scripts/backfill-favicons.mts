// 기존 프로젝트의 icon_url을 새 favicon 해석 로직으로 일괄 재계산.
//
// 실행:
//   npx tsx scripts/backfill-favicons.mts            # 변경 사항 미리보기(dry-run)
//   npx tsx scripts/backfill-favicons.mts --apply    # 실제 DB 업데이트
//
// 대상: icon_type='auto' AND url IS NOT NULL 인 모든 프로젝트.
// 필요 환경변수(.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveFavicon } from '../src/lib/favicon';

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // .env.local 없으면 process.env 그대로 사용
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 .env.local 또는 환경변수에 설정하세요.');
  process.exit(1);
}

const apply = process.argv.includes('--apply');
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

type ProjectRow = {
  id: string;
  title: string;
  url: string | null;
  icon_url: string | null;
};

async function main() {
  console.log(apply ? '🚀 실제 업데이트 모드(--apply)' : '🔍 미리보기 모드(--apply 없이 실행)');

  const { data, error } = await supabase
    .from('projects')
    .select('id, title, url, icon_url')
    .eq('icon_type', 'auto')
    .not('url', 'is', null);

  if (error) {
    console.error('❌  프로젝트 조회 실패:', error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as ProjectRow[];
  console.log(`📦 대상 프로젝트: ${rows.length}개\n`);

  let changed = 0;
  let unchanged = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.url) continue;
    process.stdout.write(`• ${row.title.padEnd(30).slice(0, 30)}  ${row.url}\n`);
    const next = await resolveFavicon(row.url);
    if (!next) {
      failed++;
      console.log(`   ↳ ⚠️  해석 실패 (icon_url 유지: ${row.icon_url ?? 'null'})\n`);
      continue;
    }
    if (next === row.icon_url) {
      unchanged++;
      console.log(`   ↳ ✅ 동일 (변경 없음)\n`);
      continue;
    }
    console.log(`   ↳ 변경: ${row.icon_url ?? 'null'}\n          → ${next}`);
    if (apply) {
      const { error: updateError } = await supabase
        .from('projects')
        .update({ icon_url: next })
        .eq('id', row.id);
      if (updateError) {
        console.log(`   ↳ ❌ 업데이트 실패: ${updateError.message}\n`);
        failed++;
        continue;
      }
      console.log(`   ↳ 💾 저장 완료\n`);
    } else {
      console.log('');
    }
    changed++;
  }

  console.log('────────────────────────');
  console.log(`총 ${rows.length}개 · 변경 ${changed} · 유지 ${unchanged} · 실패 ${failed}`);
  if (!apply && changed > 0) {
    console.log('\n💡 실제 적용하려면: npx tsx scripts/backfill-favicons.mts --apply');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
