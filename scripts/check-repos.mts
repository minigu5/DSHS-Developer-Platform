// 오픈소스 저장소 점검: 소스코드 '오픈소스'인데 GitHub 저장소가 비공개이거나 없으면(404) '비공개 소스'로 바꾼다.
//
// 매일 밤 GitHub Actions(.github/workflows/sync-readmes.yml, README 동기화 다음 단계)가 실행한다.
// 로컬 실행:
//   node scripts/check-repos.mts --dry-run   # 바뀔 프로젝트만 출력
//   node scripts/check-repos.mts             # 실제 DB 업데이트
//
// 필요 환경변수(.env.local 또는 Actions secrets): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// 선택: GITHUB_TOKEN (Actions 에서는 내장 토큰. 없으면 IP당 시간당 60회 — 넘으면 github.com 페이지로 판정)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseGithubRepo } from '../src/lib/github-readme.ts';
import { CLOSE_SOURCE_PATCH, checkGithubRepo } from '../src/lib/github-repo-check.ts';

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
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 설정하세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await supabase
  .from('projects')
  .select('id, title, visibility, repo_url')
  .eq('source_type', 'open')
  .not('repo_url', 'is', null)
  .order('created_at');

if (error) {
  console.error(`❌  프로젝트 목록을 읽지 못했어요: ${error.message}`);
  process.exit(1);
}

type Row = { id: string; title: string; visibility: string; repo_url: string };
const rows = (data ?? []) as Row[];

// 저장소가 공개라 Actions 로그도 공개다 — 비공개 프로젝트는 제목·저장소 대신 id 앞부분만 찍는다
const labelOf = (row: Row) => (row.visibility === 'public' ? `${row.title} (${row.repo_url})` : `비공개 프로젝트 ${row.id.slice(0, 8)}`);
console.log(`오픈소스 저장소 점검 대상 ${rows.length}개${DRY_RUN ? ' (dry-run)' : ''}`);

const count = { public: 0, closed: 0, skipped: 0, unknown: 0, failed: 0 };

for (const row of rows) {
  const repo = parseGithubRepo(row.repo_url);
  if (!repo) {
    // GitHub 주소가 아닌 옛 값 — 폼이 다음 수정 때 고치게 한다(.claude/rules/projects.md 「저장소 링크는 GitHub만」)
    count.skipped++;
    console.log(`- ${labelOf(row)}: 건너뜀 — GitHub 저장소 링크가 아니에요`);
    continue;
  }

  const status = await checkGithubRepo(repo, { token: GITHUB_TOKEN, timeoutMs: 15000 });
  if (status === 'public') {
    count.public++;
    continue;
  }
  if (status === 'unknown') {
    count.unknown++;
    console.log(`? ${labelOf(row)}: 확인하지 못해 그대로 둠`);
    continue;
  }

  console.log(`~ ${labelOf(row)}: 저장소가 비공개이거나 없어요(404) — 비공개 소스로 바꿈`);
  if (DRY_RUN) {
    count.closed++;
    continue;
  }
  // 그사이 주인이 저장소 링크를 고쳤으면 덮지 않는다
  const { error: updateError } = await supabase
    .from('projects')
    .update(CLOSE_SOURCE_PATCH)
    .eq('id', row.id)
    .eq('source_type', 'open')
    .eq('repo_url', row.repo_url);
  if (updateError) {
    count.failed++;
    console.error(`! ${labelOf(row)}: 저장 실패 — ${updateError.message}`);
  } else {
    count.closed++;
  }
}

console.log(`끝 — 공개 ${count.public}, 비공개 소스로 바꿈 ${count.closed}, 건너뜀 ${count.skipped}, 확인 못 함 ${count.unknown}, 실패 ${count.failed}`);
// 저장 실패가 있으면 Actions 실행이 빨갛게 표시되어 메일 알림이 간다
if (count.failed > 0) process.exit(1);
