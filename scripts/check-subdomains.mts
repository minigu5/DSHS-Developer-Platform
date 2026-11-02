// 도메인 마련하기 매일 점검: 학생 주소마다 소유 확인 토큰이 보이는지 확인하고, 오래 끊긴·연결 안 된 주소를 반납하고,
// DB 가 모르는(반납·회수된 주소의) Cloudflare 레코드·바로가기 목록 항목을 지운다.
// 바로가기 주소(Workers·Firebase)는 보낼 곳 사이트에서 토큰을 확인한다(바로가기는 ③ 연결하기에서 이미 만들어진다).
// 예약만 된 주소(② 확인 전)는 확인하지 않고 7일 규칙만 본다.
// 대곽나루 서버 주소(host 'naru')는 토큰 확인·끊김·7일 반납에서 뺀다 — 대신 허브(POST /devplatform/sync)와 한 번에 맞추고,
// 허브에 그 서버가 없다고 한 주소만 반납한다(naru_server_gone). 그 뒤 살아 있는 대곽나루 주소의 Cloudflare 레코드(댓글 dshs-subdomain:<행 id>)가
// 없으면 proxied CNAME 을 다시 만들어 DB 에 기록한다(같은 서버 재연결이 중간에 실패한 경우). 주소 조회가 실패하면 sync 를 부르지 않고(빈 목록으로 허브의 묶음이
// 다 지워지지 않게) 실패로 끝내고, 허브에 닿지 못하면 반납 없이 건너뛴다(허브 장애로 학생 주소를 잃지 않게).
// 끝에 바로가기 하나·확인 전 자리표시 하나를 실제로 열어 302 가 오는지 본다(계정에 하나뿐인 Bulk Redirect 규칙이 꺼지면 알아채려고).
//
// 매일 밤 GitHub Actions(.github/workflows/check-subdomains.yml)가 실행한다.
// 로컬 실행:
//   node scripts/check-subdomains.mts --dry-run   # 바뀔 내용만 출력 (DB·DNS 안 바꿈)
//   node scripts/check-subdomains.mts             # 실제 반영
//
// 필요 환경변수(.env.local 또는 Actions secrets):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLOUDFLARE_DNS_API_TOKEN, CLOUDFLARE_ZONE_ID
//   바로가기(선택 — 바로가기 주소가 하나라도 있으면 필요): CLOUDFLARE_LISTS_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_REDIRECT_LIST_ID
//   대곽나루(선택 — 대곽나루 주소가 하나라도 있으면 필요): NARU_HUB_URL, NARU_HUB_KEY
// 공개 저장소라 Actions 로그가 공개된다 — 주소 이름(공개 DNS)만 찍고 프로젝트 제목·이메일은 찍지 않는다.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { connectionLive } from '../src/lib/domains/activate.ts';
import { blockedByChallenge, checkTargets, decide, placeholderWorks, redirectWorks, strayIds, type CheckRow } from '../src/lib/domains/check.ts';
import { REDIRECT_ID_PREFIX, removeCloudflareWith } from '../src/lib/domains/cleanup.ts';
import { createDnsClient } from '../src/lib/domains/cloudflare.ts';
import { createSiteFetcher } from '../src/lib/domains/fetch-site.ts';
import { isRedirectHost, siteHostFor, type DomainHost } from '../src/lib/domains/hosts.ts';
import { createNaruClient, runNaruDnsRepair, runNaruSync, type NaruRow } from '../src/lib/domains/naru.ts';
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
const NARU_URL = process.env.NARU_HUB_URL;
const NARU_KEY = process.env.NARU_HUB_KEY;

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
const naruClient = NARU_URL && NARU_KEY ? createNaruClient({ url: NARU_URL, key: NARU_KEY }) : null;
const fetcher = createSiteFetcher();
const LIVE = ['reserved', 'pending', 'active', 'broken'];

type Row = CheckRow & { id: string; name: string; host: DomainHost | null; target: string | null; verify_token: string; cf_record_ids: string[] };

let failures = 0;
const now = new Date();
if (DRY_RUN) console.log('🔎  dry-run: DB·DNS 를 바꾸지 않아요');

const { data: rows, error } = await supabase
  .from('subdomains')
  .select('id, name, status, host, target, verify_token, cf_record_ids, created_at, broken_since, connected_at, ever_active')
  .in('status', LIVE)
  .order('name');
if (error) {
  console.error('❌  주소 목록을 읽지 못함', error.message);
  process.exit(1);
}

// 대곽나루 서버 주소는 아래 sync 에서 따로 — 토큰 확인·decide 에는 안 넣는다
const targets = checkTargets(rows as Row[]);
console.log(`주소 ${targets.length}개 점검 (대곽나루 ${rows.length - targets.length}개는 허브와 맞춤)`);
if (!redirectClient && targets.some((r) => isRedirectHost(r.host))) {
  failures++;
  console.error('❌  바로가기 목록 환경변수가 없어요');
}
for (const row of targets) {
  const fqdn = `${row.name}.dshs.dev`;
  try {
    const result: CheckResult | null =
      row.status === 'reserved' || !row.host
        ? null
        : await checkSite(`https://${siteHostFor({ name: row.name, host: row.host, target: row.target })}/`, row.verify_token, row.host, fetcher);
    const decision = decide(row, result, now);

    let status: string = row.status;
    if (result && !DRY_RUN) {
      // 바로가기 행인데 목록 항목이 없으면 토큰이 보여도 실제로는 안 넘어간다 → 연결됨으로 치지 않는다
      const ok = decision.ok && connectionLive(row);
      const { data, error: e } = await supabase.rpc('subdomain_record_check', { p_id: row.id, p_ok: ok, p_now: now.toISOString() });
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

// 대곽나루 서버 주소: 허브와 한 번에 맞추고, 허브에 서버가 없는 주소만 반납한다. 로그엔 주소 이름만(이메일·서버 id 금지)
{
  const naru = await runNaruSync({
    naru: naruClient,
    dryRun: DRY_RUN,
    log: (m) => (m.startsWith('❌') ? console.error(m) : console.log(m)),
    loadRows: async (): Promise<NaruRow[]> => {
      const { data: naruRows, error: e } = await supabase
        .from('subdomains')
        .select('id, name, owner_id, naru_server_id')
        .eq('host', 'naru')
        .in('status', LIVE)
        .order('name');
      if (e) throw new Error(`주소 조회 ${e.message}`);
      const owners = [...new Set((naruRows ?? []).map((r) => r.owner_id as string))];
      const emails = new Map<string, string>();
      if (owners.length) {
        const { data: users, error: ue } = await supabase.from('users').select('id, email').in('id', owners);
        if (ue) throw new Error(`주인 조회 ${ue.message}`);
        for (const u of users ?? []) emails.set(u.id as string, u.email as string);
      }
      // 서버 id·주인 이메일이 빠진 행이 있으면 불완전한 목록을 보내지 않는다(허브가 그 묶음을 지워 버린다)
      return (naruRows ?? []).map((r) => {
        const email = emails.get(r.owner_id as string);
        if (!r.naru_server_id || !email) throw new Error(`${r.name}: 서버 id 또는 주인을 찾지 못함`);
        return { id: r.id as string, name: r.name as string, naruServerId: r.naru_server_id as string, ownerEmail: email };
      });
    },
    release: async (row) => {
      const { data: ids, error: e } = await supabase.rpc('subdomain_release', { p_actor: null, p_id: row.id, p_reason: 'naru_server_gone' });
      if (e) throw new Error(`release ${e.message}`);
      await removeCloudflareWith((ids as string[] | null) ?? [], cleanupDeps);
    },
  });
  failures += naru.failures;
}

// 고아·찌꺼기 정리: comment 의 행이 살아 있지 않거나, 살아 있는 행인데 그 행의 기록(cf_record_ids)에 없고 1시간 넘은
// DNS 레코드·바로가기 목록 항목을 지운다(strayIds). 막 연결·활성화 중인 것은 1시간 여유로 건드리지 않는다.
let liveRows: { id: string; name: string; status: string; target: string | null; cf_record_ids: string[] }[] = [];
try {
  const { data: live, error: e } = await supabase.from('subdomains').select('id, name, status, target, cf_record_ids').in('status', LIVE).order('name');
  if (e) throw new Error(e.message);
  liveRows = (live ?? []) as typeof liveRows;
  const records = await dns.listManaged();
  const strayDns = new Set(strayIds(liveRows, records, (id) => id, now));
  for (const r of records.filter((x) => strayDns.has(x.id))) {
    console.log(`  🧹  고아 레코드 ${r.name}${DRY_RUN ? ' (dry-run, 그대로 둠)' : ' 삭제'}`);
  }
  if (!DRY_RUN && strayDns.size) await dns.remove([...strayDns]);
} catch (e) {
  failures++;
  console.error(`  ❌  고아 레코드 정리 실패: ${e instanceof Error ? e.message : String(e)}`);
}

// 대곽나루 서버 주소의 DNS 레코드 복구: 같은 서버 재연결이 중간에 실패하면 옛 레코드만 지워진 active 행이 남는다.
// sync 가 반납한 행은 빠지도록 여기서 다시 읽고, 고아 레코드 정리를 먼저 해 실제 상태를 본 뒤 맞춘다. 로그엔 다시 만든 주소 이름만
{
  const repair = await runNaruDnsRepair({
    dryRun: DRY_RUN,
    log: (m) => (m.includes('❌') ? console.error(m) : console.log(m)),
    dns,
    loadRows: async () => {
      const { data: naruRows, error: e } = await supabase.from('subdomains').select('id, name, target').eq('host', 'naru').in('status', LIVE).order('name');
      if (e) throw new Error(`주소 조회 ${e.message}`);
      return (naruRows ?? []).map((r) => ({ id: r.id as string, name: r.name as string, target: (r.target as string | null) ?? null }));
    },
    setRecords: async (id, ids) => {
      const { error: e } = await supabase.rpc('subdomain_set_naru_records', { p_id: id, p_record_ids: ids });
      if (e) throw new Error(`set_naru_records ${e.message}`);
    },
  });
  failures += repair.failures;
}

// 바로가기: 고아 목록 항목 정리 + 규칙이 실제로 동작하는지 하나만 열어 본다
if (redirectClient) {
  try {
    const items = await redirectClient.listManaged();
    const strayItems = new Set(strayIds(liveRows, items, (id) => REDIRECT_ID_PREFIX + id, now));
    for (const r of items.filter((x) => strayItems.has(x.id))) {
      console.log(`  🧹  고아 바로가기 ${r.source}${DRY_RUN ? ' (dry-run, 그대로 둠)' : ' 삭제'}`);
    }
    if (!DRY_RUN && strayItems.size) await redirectClient.remove([...strayItems]);

    const hasItem = (r: (typeof liveRows)[number]) => r.cf_record_ids.some((id) => id.startsWith(REDIRECT_ID_PREFIX));
    const sample = liveRows.find((r) => r.status !== 'reserved' && r.target && hasItem(r));
    // 열어 볼 주소가 DNS 부터 안 풀리면(연결하다 실패해 레코드가 없는 주소 등) 규칙 문제가 아니므로 건너뛴다
    const tryFetch = async (name: string) => {
      try {
        return await fetcher(`https://${name}.dshs.dev/`);
      } catch (e) {
        console.log(`  ⚠️  ${name}.dshs.dev 를 열지 못해 점검을 건너뜀(${e instanceof Error ? e.message : String(e)})`);
        return null;
      }
    };
    // 점검 서버(Actions 의 데이터센터 IP)가 Cloudflare 보안 확인에 막히면 규칙은 알 수 없으니 건너뛴다
    const skipChallenged = (name: string) => console.log(`  ⚠️  ${name}.dshs.dev 가 Cloudflare 보안 확인에 막혀 점검을 건너뜀`);
    if (sample?.target) {
      const page = await tryFetch(sample.name);
      if (!page) {
        // 건너뜀
      } else if (blockedByChallenge(page)) {
        skipChallenged(sample.name);
      } else if (redirectWorks(page, sample.target)) {
        console.log(`  ↪️  바로가기 규칙 동작 확인(${sample.name}.dshs.dev)`);
      } else {
        failures++;
        // Cloudflare 가 이 서버(데이터센터 IP)를 막는 것인지 가리려고 응답 머리와 본문 앞부분을 남긴다(공개 로그라 그 정도만)
        const hint = ['cf-mitigated', 'cf-ray', 'server', 'content-type'].map((h) => `${h}=${page.headers.get(h) ?? '-'}`).join(' ');
        const snippet = page.status === 403 ? ` body="${page.body.replace(/\s+/g, ' ').slice(0, 200)}"` : '';
        console.error(`  ❌  바로가기 규칙이 동작하지 않아요(${sample.name}.dshs.dev, status ${page.status}, ${hint}${snippet})`);
      }
    }
    // 확인 전 자리표시(경고 페이지로 302)도 같은 규칙을 쓰지만 보내는 곳이 달라 따로 본다
    const waiting = liveRows.find((r) => r.status === 'reserved' && hasItem(r));
    if (waiting) {
      const page = await tryFetch(waiting.name);
      if (!page) {
        // 건너뜀
      } else if (blockedByChallenge(page)) {
        skipChallenged(waiting.name);
      } else if (placeholderWorks(page, waiting.name)) {
        console.log(`  ↪️  자리표시 동작 확인(${waiting.name}.dshs.dev)`);
      } else {
        failures++;
        console.error(`  ❌  자리표시가 경고 페이지로 보내지 않아요(${waiting.name}.dshs.dev, status ${page.status})`);
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
