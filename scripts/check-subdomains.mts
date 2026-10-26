// 도메인 마련하기 매일 점검: 학생 주소마다 소유 확인 토큰이 보이는지 확인하고, 오래 끊긴·연결 안 된 주소를 반납하고,
// DB 가 모르는(반납·회수된 주소의) Cloudflare 레코드·바로가기 목록 항목을 지운다.
// 바로가기 주소(Workers·Firebase)는 보낼 곳 사이트에서 토큰을 확인하고, 처음 확인되면 바로가기를 켠다.
// 끝에 바로가기 하나를 실제로 열어 302 가 오는지 본다(계정에 하나뿐인 Bulk Redirect 규칙이 꺼지면 알아채려고).
//
// 매일 밤 GitHub Actions(.github/workflows/check-subdomains.yml)가 실행한다.
// 로컬 실행:
//   node scripts/check-subdomains.mts --dry-run   # 바뀔 내용만 출력 (DB·DNS 안 바꿈)
//   node scripts/check-subdomains.mts             # 실제 반영
//
// 필요 환경변수(.env.local 또는 Actions secrets):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLOUDFLARE_DNS_API_TOKEN, CLOUDFLARE_ZONE_ID
//   바로가기(선택 — 바로가기 주소가 하나라도 있으면 필요): CLOUDFLARE_LISTS_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_REDIRECT_LIST_ID
// 공개 저장소라 Actions 로그가 공개된다 — 주소 이름(공개 DNS)만 찍고 프로젝트 제목·이메일은 찍지 않는다.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { activateRedirect, needsActivation } from '../src/lib/domains/activate.ts';
import { decide, managedRowId, redirectWorks, type CheckRow } from '../src/lib/domains/check.ts';
import { REDIRECT_ID_PREFIX, removeCloudflareWith } from '../src/lib/domains/cleanup.ts';
import { createDnsClient } from '../src/lib/domains/cloudflare.ts';
import { createSiteFetcher } from '../src/lib/domains/fetch-site.ts';
import { isRedirectHost, siteHostFor, type HostKey } from '../src/lib/domains/hosts.ts';
import { createRedirectClient, RedirectError, type RedirectClient } from '../src/lib/domains/redirects.ts';
import { checkSite, type CheckResult } from '../src/lib/domains/verify.ts';

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
const CF_TOKEN = process.env.CLOUDFLARE_DNS_API_TOKEN;
const CF_ZONE = process.env.CLOUDFLARE_ZONE_ID;
const DRY_RUN = process.argv.includes('--dry-run');
const LISTS_TOKEN = process.env.CLOUDFLARE_LISTS_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const REDIRECT_LIST_ID = process.env.CLOUDFLARE_REDIRECT_LIST_ID;

if (!SUPABASE_URL || !SERVICE_KEY || !CF_TOKEN || !CF_ZONE) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLOUDFLARE_DNS_API_TOKEN, CLOUDFLARE_ZONE_ID 를 설정하세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const dns = createDnsClient({ token: CF_TOKEN, zoneId: CF_ZONE });
const redirectClient: RedirectClient | null =
  LISTS_TOKEN && ACCOUNT_ID && REDIRECT_LIST_ID ? createRedirectClient({ token: LISTS_TOKEN, accountId: ACCOUNT_ID, listId: REDIRECT_LIST_ID }) : null;
// 목록 env 가 없으면 바로가기를 다룰 때만 실패한다 — CNAME 주소 점검은 그대로 돈다
const redirects = (): RedirectClient => {
  if (!redirectClient) throw new RedirectError('바로가기 목록 환경변수가 없어요');
  return redirectClient;
};
const cleanupDeps = { dns, redirects };
const fetcher = createSiteFetcher();
const LIVE = ['reserved', 'pending', 'active', 'broken'];

type Row = CheckRow & { id: string; name: string; host: HostKey | null; target: string | null; verify_token: string; cf_record_ids: string[] };

let failures = 0;
const now = new Date();
if (DRY_RUN) console.log('🔎  dry-run: DB·DNS 를 바꾸지 않아요');

const { data: rows, error } = await supabase
  .from('subdomains')
  .select('id, name, status, host, target, verify_token, cf_record_ids, created_at, broken_since, ever_active')
  .in('status', LIVE)
  .order('name');
if (error) {
  console.error('❌  주소 목록을 읽지 못함', error.message);
  process.exit(1);
}

console.log(`주소 ${rows.length}개 점검`);
if (!redirectClient && (rows as Row[]).some((r) => isRedirectHost(r.host))) {
  failures++;
  console.error('❌  바로가기 목록 환경변수가 없어요');
}
for (const row of rows as Row[]) {
  const fqdn = `${row.name}.dshs.dev`;
  try {
    const result: CheckResult | null =
      row.status === 'reserved' || !row.host
        ? null
        : await checkSite(siteHostFor({ name: row.name, host: row.host, target: row.target }), row.verify_token, row.host, fetcher);
    const decision = decide(row, result, now);

    // 바로가기: 처음 확인됐으면 켠다. 켜지 못하면 상태를 바꾸지 않고(다음 점검에서 다시) 실패로 센다
    if (result?.kind === 'ok' && row.target && needsActivation(row)) {
      if (DRY_RUN) {
        console.log(`  ${fqdn}: 바로가기 켜기 (dry-run, 그대로 둠)`);
      } else {
        const target = row.target;
        await activateRedirect(
          {
            ...cleanupDeps,
            setRecords: async (ids) => {
              const { error: e } = await supabase.rpc('subdomain_set_redirect_records', { p_id: row.id, p_record_ids: ids });
              if (e) throw new Error(e.message);
            },
          },
          { id: row.id, name: row.name, target },
        );
        console.log(`  ${fqdn}: 바로가기 켬`);
      }
    }

    let status: string = row.status;
    if (result && !DRY_RUN) {
      const { data, error: e } = await supabase.rpc('subdomain_record_check', { p_id: row.id, p_ok: decision.ok, p_now: now.toISOString() });
      if (e) throw new Error(`record_check ${e.message}`);
      status = data as string;
    }

    let note = '';
    if (decision.release) {
      note = ` → 반납(${decision.release})`;
      if (!DRY_RUN) {
        const { data: ids, error: e } = await supabase.rpc('subdomain_release', { p_actor: null, p_id: row.id, p_reason: decision.release });
        if (e) throw new Error(`release ${e.message}`);
        await removeCloudflareWith((ids as string[] | null) ?? [], cleanupDeps);
      }
    }
    const detail = result?.kind === 'unreachable' ? ` (${result.detail})` : '';
    console.log(`  ${fqdn}: ${result?.kind ?? '예약만'}${detail} · ${status}${note}`);
  } catch (e) {
    failures++;
    console.error(`  ❌  ${fqdn}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// 고아 레코드: comment 의 행이 살아 있지 않으면(반납·회수·없음) 지운다.
// 살아 있는 행의 레코드는 건드리지 않는다 — 학생이 막 연결하는 중일 수 있다.
try {
  const { data: live, error: e } = await supabase.from('subdomains').select('id').in('status', LIVE);
  if (e) throw new Error(e.message);
  const liveIds = new Set((live ?? []).map((r) => r.id as string));
  const orphans = (await dns.listManaged()).filter((r) => {
    const id = managedRowId(r.comment);
    return !id || !liveIds.has(id);
  });
  for (const r of orphans) {
    console.log(`  🧹  고아 레코드 ${r.name}${DRY_RUN ? ' (dry-run, 그대로 둠)' : ' 삭제'}`);
  }
  if (!DRY_RUN && orphans.length) await dns.remove(orphans.map((r) => r.id));
} catch (e) {
  failures++;
  console.error(`  ❌  고아 레코드 정리 실패: ${e instanceof Error ? e.message : String(e)}`);
}

// 바로가기: 고아 목록 항목 정리 + 규칙이 실제로 동작하는지 하나만 열어 본다
if (redirectClient) {
  try {
    const { data: live, error: e } = await supabase.from('subdomains').select('id, name, target, cf_record_ids').in('status', LIVE).order('name');
    if (e) throw new Error(e.message);
    const liveRows = (live ?? []) as { id: string; name: string; target: string | null; cf_record_ids: string[] }[];
    const liveIds = new Set(liveRows.map((r) => r.id));
    const orphans = (await redirectClient.listManaged()).filter((r) => {
      const id = managedRowId(r.comment);
      return !id || !liveIds.has(id);
    });
    for (const r of orphans) console.log(`  🧹  고아 바로가기 ${r.source}${DRY_RUN ? ' (dry-run, 그대로 둠)' : ' 삭제'}`);
    if (!DRY_RUN && orphans.length) await redirectClient.remove(orphans.map((r) => r.id));

    const sample = liveRows.find((r) => r.target && r.cf_record_ids.some((id) => id.startsWith(REDIRECT_ID_PREFIX)));
    if (sample?.target) {
      const page = await fetcher(`https://${sample.name}.dshs.dev/`);
      if (redirectWorks(page, sample.target)) {
        console.log(`  ↪️  바로가기 규칙 동작 확인(${sample.name}.dshs.dev)`);
      } else {
        failures++;
        console.error(`  ❌  바로가기 규칙이 동작하지 않아요(${sample.name}.dshs.dev, status ${page.status})`);
      }
    }
  } catch (e) {
    failures++;
    console.error(`  ❌  바로가기 정리·점검 실패: ${e instanceof Error ? e.message : String(e)}`);
  }
}

if (failures) {
  console.error(`❌  실패 ${failures}건`);
  process.exit(1);
}
console.log('✅  끝');
