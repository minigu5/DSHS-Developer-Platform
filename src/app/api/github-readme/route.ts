import { NextResponse, type NextRequest } from 'next/server';

import {
  decodeBase64Utf8,
  isSupportedReadmeName,
  parseGithubRepo,
  prepareReadme,
  type GithubRepo,
} from '@/lib/github-readme';
import { createClient } from '@/lib/supabase/server';

const USER_AGENT = 'dshs-developer-platform';
const RAW_FALLBACK_NAMES = ['README.md', 'readme.md', 'Readme.md'];

type Fetched =
  | { ok: true; text: string; path: string }
  | { ok: false; reason: 'not_found' | 'rate_limited' | 'unsupported' | 'failed' };

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

// 호스트가 고정(api.github.com)이고 owner/repo 는 정규식으로 제한돼 있어 SSRF 가드가 필요 없다.
async function fetchViaApi({ owner, repo }: GithubRepo): Promise<Fetched> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return { ok: false, reason: 'not_found' };
  if (res.status === 403 || res.status === 429) return { ok: false, reason: 'rate_limited' };
  if (!res.ok) return { ok: false, reason: 'failed' };

  const body = (await res.json()) as { name?: string; path?: string; content?: string; encoding?: string };
  if (!body.content || body.encoding !== 'base64' || !body.path) return { ok: false, reason: 'failed' };
  if (!isSupportedReadmeName(body.name ?? body.path)) return { ok: false, reason: 'unsupported' };
  return { ok: true, text: decodeBase64Utf8(body.content), path: body.path };
}

// API 호출 한도(IP당 시간당 60회)에 걸리면 raw 주소에서 흔한 파일명으로 찾는다.
async function fetchViaRaw({ owner, repo }: GithubRepo): Promise<Fetched> {
  for (const name of RAW_FALLBACK_NAMES) {
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${name}`, {
      headers: { 'User-Agent': USER_AGENT },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true, text: await res.text(), path: name };
  }
  return { ok: false, reason: 'not_found' };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('로그인이 필요해요.', 401);

  const target = parseGithubRepo(request.nextUrl.searchParams.get('url') ?? '');
  if (!target) return fail('GitHub 저장소 링크를 입력해 주세요. 예: https://github.com/username/repo', 400);

  let result: Fetched;
  try {
    result = await fetchViaApi(target);
    if (!result.ok && (result.reason === 'rate_limited' || result.reason === 'failed')) {
      result = await fetchViaRaw(target);
    }
  } catch {
    return fail('GitHub에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.', 502);
  }

  if (!result.ok) {
    if (result.reason === 'unsupported') {
      return fail('마크다운(.md) 형식의 README만 가져올 수 있어요.', 422);
    }
    return fail('README를 찾지 못했어요. 공개 저장소인지, README 파일이 있는지 확인해 주세요.', 404);
  }

  const { markdown, truncated } = prepareReadme(result.text, target, result.path);
  if (!markdown) return fail('README가 비어 있어요.', 422);

  return NextResponse.json({ markdown, truncated }, { headers: { 'Cache-Control': 'no-store' } });
}
