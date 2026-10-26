// 도메인 마련하기 바로가기용 Bulk Redirect 목록(dshs_subdomain_redirects)을 한 번 만든다.
// 이미 같은 이름의 목록이 있으면 새로 만들지 않고 그 id 를 알려 준다. 나온 id 는 CLOUDFLARE_REDIRECT_LIST_ID 로 넣는다.
// 목록을 쓰는 Bulk Redirect 규칙은 이 토큰(Account Filter Lists: Edit)으로 못 만들어서 대시보드에서 한 번 만든다.
//
// 실행: node scripts/create-redirect-list.mts
// 필요 환경변수(.env.local): CLOUDFLARE_LISTS_API_TOKEN, CLOUDFLARE_ACCOUNT_ID

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LIST_NAME = 'dshs_subdomain_redirects';

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  } catch {
    // .env.local 없으면 process.env 그대로 사용
  }
}

loadEnv();

const TOKEN = process.env.CLOUDFLARE_LISTS_API_TOKEN;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!TOKEN || !ACCOUNT) {
  console.error('❌  CLOUDFLARE_LISTS_API_TOKEN, CLOUDFLARE_ACCOUNT_ID 를 설정하세요.');
  process.exit(1);
}

type CfResponse<T> = { success: boolean; errors: { code: number; message: string }[]; result: T };
const base = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/rules/lists`;

async function call<T>(method: string, url: string, body?: unknown): Promise<CfResponse<T>> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as CfResponse<T> | null;
  if (!data?.success) {
    const first = data?.errors?.[0];
    throw new Error(first ? `cloudflare ${res.status} ${first.code} ${first.message}` : `cloudflare ${res.status}`);
  }
  return data;
}

const existing = (await call<{ id: string; name: string; kind: string }[]>('GET', base)).result.find((l) => l.name === LIST_NAME);
if (existing) {
  console.log(`이미 있어요: ${LIST_NAME} (kind ${existing.kind})`);
  console.log(`CLOUDFLARE_REDIRECT_LIST_ID=${existing.id}`);
} else {
  const created = await call<{ id: string }>('POST', base, {
    name: LIST_NAME,
    kind: 'redirect',
    description: 'dshs.dev 바로가기 주소 (도메인 마련하기)',
  });
  console.log(`만들었어요: ${LIST_NAME}`);
  console.log(`CLOUDFLARE_REDIRECT_LIST_ID=${created.result.id}`);
}
