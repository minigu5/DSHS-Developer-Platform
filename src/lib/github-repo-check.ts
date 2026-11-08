// 오픈소스로 등록한 GitHub 저장소가 실제로 공개인지 확인한다(2026-11-08 — 오픈소스라고 해 놓고 비공개 저장소라 404가 뜨는 프로젝트가 있었음).
// 등록·수정 폼(GET /api/github-repo)과 매일 밤 점검(scripts/check-repos.mts, Actions)이 같이 쓴다. 네트워크는 fetchImpl 로 주입받아 node:test 로 검증.
//
// GitHub는 비공개 저장소와 없는 저장소를 똑같이 404로 돌려준다(남에게는 구분이 안 됨) — 둘 다 '오픈소스 아님'(missing).
// 한도·네트워크 오류는 unknown — 막지도 바꾸지도 않는다.

import type { GithubRepo } from './github-readme.ts';

export type RepoStatus = 'public' | 'missing' | 'unknown';

const USER_AGENT = 'dshs-developer-platform';

// 이름이 바뀐 저장소는 GitHub가 301로 새 주소에 보낸다(fetch 가 따라감) — 그래서 200이면 공개.
// 451 = 법적 이유로 막힘(DMCA 등) — 남이 못 보니 missing.
export function repoStatusFromApi(status: number, body: unknown): RepoStatus {
  if (status === 404 || status === 451) return 'missing';
  if (status !== 200) return 'unknown';
  // 토큰 주인이 볼 수 있는 비공개 저장소면 200 + private: true 로 온다
  const isPrivate = (body as { private?: unknown } | null)?.private;
  return isPrivate === false ? 'public' : isPrivate === true ? 'missing' : 'unknown';
}

// 웹 페이지(github.com/<owner>/<repo>)는 API 한도가 없다 — API가 한도에 걸렸을 때만 쓴다.
// 로그인 안 한 사람에게 비공개 저장소는 404, 공개는 200.
export function repoStatusFromPage(status: number): RepoStatus {
  if (status === 200) return 'public';
  if (status === 404 || status === 451) return 'missing';
  return 'unknown';
}

export interface CheckRepoOptions {
  token?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

// 호스트가 고정(api.github.com·github.com)이고 owner/repo 는 parseGithubRepo 정규식으로 제한돼 SSRF 가드가 필요 없다.
export async function checkGithubRepo({ owner, repo }: GithubRepo, options: CheckRepoOptions = {}): Promise<RepoStatus> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8000;
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': USER_AGENT };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let fromApi: RepoStatus = 'unknown';
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    fromApi = repoStatusFromApi(res.status, res.ok ? await res.json().catch(() => null) : null);
  } catch {
    fromApi = 'unknown';
  }
  if (fromApi !== 'unknown') return fromApi;

  try {
    const res = await fetchImpl(`https://github.com/${owner}/${repo}`, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return repoStatusFromPage(res.status);
  } catch {
    return 'unknown';
  }
}

// 비공개 저장소로 확인된 오픈소스 프로젝트를 비공개 소스로 바꾸는 값 — 폼이 비공개 소스를 저장할 때와 같다(저장소 링크·라이선스 비움).
// README 자동 동기화는 오픈소스+저장소 링크가 있어야 하므로(CHECK projects_readme_sync_needs_repo) 같이 끈다.
export const CLOSE_SOURCE_PATCH = {
  source_type: 'closed',
  repo_url: null,
  readme_sync: false,
  readme_etag: null,
  license_features: [],
  license_custom: null,
};
