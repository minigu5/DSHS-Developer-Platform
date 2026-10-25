import { NextResponse, type NextRequest } from 'next/server';

import { parseGithubRepo } from '@/lib/github-readme';
import { licenseFeaturesFromPermissions, parseRepoLicense } from '@/lib/github-license';
import { createClient } from '@/lib/supabase/server';

const USER_AGENT = 'dshs-developer-platform';

type Fetched =
  | { ok: true; body: unknown }
  | { ok: false; reason: 'not_found' | 'rate_limited' | 'failed' };

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

// 호스트가 고정(api.github.com)이고 owner/repo 는 정규식, 라이선스 키는 parseRepoLicense 가 제한해
// SSRF 가드가 필요 없다.
async function fetchGithub(path: string): Promise<Fetched> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com${path}`, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return { ok: false, reason: 'not_found' };
  if (res.status === 403 || res.status === 429) return { ok: false, reason: 'rate_limited' };
  if (!res.ok) return { ok: false, reason: 'failed' };
  return { ok: true, body: await res.json() };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('로그인이 필요해요.', 401);

  const target = parseGithubRepo(request.nextUrl.searchParams.get('url') ?? '');
  if (!target) return fail('GitHub 저장소 링크를 입력해 주세요. 예: https://github.com/username/repo', 400);

  try {
    const repoLicense = await fetchGithub(`/repos/${target.owner}/${target.repo}/license`);
    if (!repoLicense.ok) {
      if (repoLicense.reason === 'not_found') {
        return fail('라이선스 파일을 찾지 못했어요. 공개 저장소인지, LICENSE 파일이 있는지 확인하고 직접 골라 주세요.', 404);
      }
      if (repoLicense.reason === 'rate_limited') {
        return fail('GitHub 호출 한도에 걸렸어요. 잠시 후 다시 시도하거나 직접 골라 주세요.', 429);
      }
      return fail('GitHub에서 라이선스를 가져오지 못했어요. 직접 골라 주세요.', 502);
    }

    const license = parseRepoLicense(repoLicense.body);
    if (!license) return fail('GitHub가 알아보지 못하는 라이선스예요. 직접 골라 주세요.', 422);

    const detail = await fetchGithub(`/licenses/${license.key}`);
    if (!detail.ok) {
      if (detail.reason === 'rate_limited') {
        return fail('GitHub 호출 한도에 걸렸어요. 잠시 후 다시 시도하거나 직접 골라 주세요.', 429);
      }
      return fail('GitHub에서 라이선스를 가져오지 못했어요. 직접 골라 주세요.', 502);
    }

    const permissions = (detail.body as { permissions?: unknown } | null)?.permissions;
    return NextResponse.json(
      { name: license.name, spdxId: license.spdxId, features: licenseFeaturesFromPermissions(permissions) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return fail('GitHub에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.', 502);
  }
}
