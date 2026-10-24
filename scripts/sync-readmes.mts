// README 자동 동기화: readme_sync=true 인 프로젝트의 description 을 GitHub README 로 다시 채운다.
//
// 매일 밤 GitHub Actions(.github/workflows/sync-readmes.yml)가 실행한다.
// 로컬 실행:
//   node scripts/sync-readmes.mts --dry-run   # 바뀔 내용만 출력
//   node scripts/sync-readmes.mts             # 실제 DB 업데이트
//
// 필요 환경변수(.env.local 또는 Actions secrets): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// 선택: GITHUB_TOKEN (Actions 에서는 내장 토큰이 들어온다. 없으면 IP당 시간당 60회)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decodeBase64Utf8, isSupportedReadmeName, type GithubRepo } from '../src/lib/github-readme.ts';
import { syncReadme, type FetchReadme, type SyncRow } from '../src/lib/readme-sync.ts';

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

const fetchReadme: FetchReadme = async ({ owner, repo }: GithubRepo, etag) => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'dshs-developer-platform-readme-sync',
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  if (etag) headers['If-None-Match'] = etag;

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers, signal: AbortSignal.timeout(15000) });
  } catch {
    return { status: 'error' };
  }
  if (res.status === 304) return { status: 'not_modified' };
  if (res.status === 404) return { status: 'not_found' };
  if (res.status === 403 || res.status === 429) return { status: 'rate_limited' };
  if (!res.ok) return { status: 'error' };

  const body = (await res.json()) as { name?: string; path?: string; content?: string; encoding?: string };
  if (!body.content || body.encoding !== 'base64' || !body.path) return { status: 'error' };
  if (!isSupportedReadmeName(body.name ?? body.path)) return { status: 'unsupported' };
  return { status: 'ok', text: decodeBase64Utf8(body.content), path: body.path, etag: res.headers.get('etag') };
};

const { data, error } = await supabase
  .from('projects')
  .select('id, title, visibility, repo_url, description, readme_etag')
  .eq('readme_sync', true)
  .eq('source_type', 'open')
  .order('created_at');

if (error) {
  console.error(`❌  프로젝트 목록을 읽지 못했어요: ${error.message}`);
  process.exit(1);
}

const rows = (data ?? []) as (SyncRow & { visibility: string })[];

// 저장소가 공개라 Actions 로그도 공개다 — 비공개 프로젝트는 제목 대신 id 앞부분만 찍는다
const labelOf = (row: SyncRow & { visibility: string }) =>
  row.visibility === 'public' ? row.title : `비공개 프로젝트 ${row.id.slice(0, 8)}`;
console.log(`README 동기화 대상 ${rows.length}개${DRY_RUN ? ' (dry-run)' : ''}`);

const count = { updated: 0, same: 0, skipped: 0, failed: 0 };

for (const row of rows) {
  const outcome = await syncReadme(row, fetchReadme);

  if (outcome.kind === 'unchanged') {
    count.same++;
    console.log(`= ${labelOf(row)}: README 그대로`);
  } else if (outcome.kind === 'skipped') {
    count.skipped++;
    console.log(`- ${labelOf(row)}: 건너뜀 — ${outcome.reason}`);
  } else if (outcome.kind === 'failed') {
    count.failed++;
    console.error(`! ${labelOf(row)}: ${outcome.reason}`);
    if (outcome.fatal) {
      console.error('호출 한도에 걸려 여기서 멈춰요. 남은 프로젝트는 다음 실행 때 이어서 확인해요.');
      break;
    }
  } else {
    count[outcome.changed ? 'updated' : 'same']++;
    console.log(`${outcome.changed ? '~' : '='} ${labelOf(row)}: ${outcome.changed ? '설명을 README로 갱신' : '내용 같음'}`);
    if (!DRY_RUN) {
      const { error: updateError } = await supabase.from('projects').update(outcome.patch).eq('id', row.id);
      if (updateError) {
        count.failed++;
        if (outcome.changed) count.updated--;
        else count.same--;
        console.error(`! ${labelOf(row)}: 저장 실패 — ${updateError.message}`);
      }
    }
  }
}

console.log(`끝 — 갱신 ${count.updated}, 그대로 ${count.same}, 건너뜀 ${count.skipped}, 실패 ${count.failed}`);
// 실패가 있으면 Actions 실행이 빨갛게 표시되어 메일 알림이 간다
if (count.failed > 0) process.exit(1);
