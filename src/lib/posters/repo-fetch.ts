import 'server-only'

import { decodeBase64Utf8, parseGithubRepo } from '@/lib/github-readme'

import { parseRepoMeta, type RepoContext } from './repo-context'

const USER_AGENT = 'dshs-developer-platform'

/**
 * 공개 GitHub 저장소의 설명·토픽·주 언어 + README. 포스터를 처음 만들 때만 부른다.
 * 호스트가 고정(api.github.com)이고 owner/repo 는 parseGithubRepo 정규식으로 제한돼 SSRF 가드가 필요 없다(/api/github-readme 와 같음).
 * 비공개 저장소·한도·실패면 가진 것만, 둘 다 없으면 null — 포스터 만들기를 막지 않는다.
 */
export async function fetchRepoContext(repoUrl: string): Promise<RepoContext | null> {
  const repo = parseGithubRepo(repoUrl)
  if (!repo) return null
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': USER_AGENT }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const get = (path: string) =>
    fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}${path}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(8000) })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)

  const [metaBody, readmeBody] = await Promise.all([get(''), get('/readme')])
  if ((metaBody as { private?: boolean } | null)?.private) return null
  const meta = metaBody ? parseRepoMeta(metaBody) : null
  const rb = readmeBody as { content?: string; encoding?: string } | null
  let readme: string | null = null
  if (rb?.content && rb.encoding === 'base64') {
    try {
      readme = decodeBase64Utf8(rb.content)
    } catch {
      readme = null
    }
  }
  if (!meta && !readme) return null
  return { meta, readme }
}
