// 도메인 마련하기 매일 점검: 학생 주소마다 소유 확인 토큰이 보이는지 확인하고, 오래 끊긴·연결 안 된 주소를 반납하고,
// DB 가 모르는(반납·회수된 주소의) Cloudflare 레코드를 지운다.
//
// 매일 밤 GitHub Actions(.github/workflows/check-subdomains.yml)가 실행한다.
// 로컬 실행:
//   node scripts/check-subdomains.mts --dry-run   # 바뀔 내용만 출력 (DB·DNS 안 바꿈)
//   node scripts/check-subdomains.mts             # 실제 반영
//
// 필요 환경변수(.env.local 또는 Actions secrets):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLOUDFLARE_DNS_API_TOKEN, CLOUDFLARE_ZONE_ID
// 공개 저장소라 Actions 로그가 공개된다 — 주소 이름(공개 DNS)만 찍고 프로젝트 제목·이메일은 찍지 않는다.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decide, managedRowId, type CheckRow } from '../src/lib/domains/check.ts';
import { createDnsClient } from '../src/lib/domains/cloudflare.ts';
import { createSiteFetcher } from '../src/lib/domains/fetch-site.ts';
import type { HostKey } from '../src/lib/domains/hosts.ts';
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

if (!SUPABASE_URL || !SERVICE_KEY || !CF_TOKEN || !CF_ZONE) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLOUDFLARE_DNS_API_TOKEN, CLOUDFLARE_ZONE_ID 를 설정하세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const dns = createDnsClient({ token: CF_TOKEN, zoneId: CF_ZONE });
const fetcher = createSiteFetcher();
const LIVE = ['reserved', 'pending', 'active', 'broken'];

type Row = CheckRow & { id: string; name: string; host: HostKey | null; verify_token: string };

let failures = 0;
const now = new Date();
if (DRY_RUN) console.log('🔎  dry-run: DB·DNS 를 바꾸지 않아요');

const { data: rows, error } = await supabase
  .from('subdomains')
  .select('id, name, status, host, verify_token, created_at, broken_since, ever_active')
  .in('status', LIVE)
  .order('name');
if (error) {
  console.error('❌  주소 목록을 읽지 못함', error.message);
  process.exit(1);
}

console.log(`주소 ${rows.length}개 점검`);
for (const row of rows as Row[]) {
  const fqdn = `${row.name}.dshs.dev`;
  try {
    const result: CheckResult | null =
      row.status === 'reserved' || !row.host ? null : await checkSite(fqdn, row.verify_token, row.host, fetcher);
    const decision = decide(row, result, now);

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
        await dns.remove((ids as string[] | null) ?? []);
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

if (failures) {
  console.error(`❌  실패 ${failures}건`);
  process.exit(1);
}
console.log('✅  끝');
