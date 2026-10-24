// 매일 밤 GitHub Actions(scripts/sync-readmes.mts)가 쓰는 README 동기화 판단 로직.
// 네트워크는 fetchReadme 로 주입받아 node:test 로 검증한다.

import { parseGithubRepo, prepareReadme, type GithubRepo } from './github-readme.ts';

export interface SyncRow {
  id: string;
  title: string;
  repo_url: string | null;
  description: string | null;
  readme_etag: string | null;
}

export type ReadmeFetch =
  | { status: 'ok'; text: string; path: string; etag: string | null }
  | { status: 'not_modified' | 'not_found' | 'rate_limited' | 'unsupported' | 'error' };

export type FetchReadme = (repo: GithubRepo, etag: string | null) => Promise<ReadmeFetch>;

export interface SyncPatch {
  description?: string;
  readme_etag: string | null;
  readme_synced_at: string;
}

export type SyncOutcome =
  | { kind: 'unchanged' }
  | { kind: 'synced'; changed: boolean; patch: SyncPatch }
  | { kind: 'skipped'; reason: string }
  | { kind: 'failed'; reason: string; fatal: boolean };

export async function syncReadme(row: SyncRow, fetchReadme: FetchReadme, now: Date = new Date()): Promise<SyncOutcome> {
  const repo = row.repo_url ? parseGithubRepo(row.repo_url) : null;
  if (!repo) return { kind: 'skipped', reason: 'GitHub 저장소 링크가 아니에요' };

  const res = await fetchReadme(repo, row.readme_etag);
  switch (res.status) {
    case 'not_modified':
      return { kind: 'unchanged' };
    case 'not_found':
      return { kind: 'failed', reason: 'README를 찾지 못했어요(비공개이거나 없음)', fatal: false };
    case 'unsupported':
      return { kind: 'skipped', reason: '마크다운 README가 아니에요' };
    case 'rate_limited':
      return { kind: 'failed', reason: 'GitHub 호출 한도에 걸렸어요', fatal: true };
    case 'error':
      return { kind: 'failed', reason: 'GitHub 응답을 받지 못했어요', fatal: false };
    case 'ok':
      break;
  }

  const { markdown } = prepareReadme(res.text, repo, res.path);
  // 빈 README 로 설명을 지우지 않는다
  if (!markdown) return { kind: 'skipped', reason: 'README가 비어 있어요' };

  const changed = markdown !== (row.description ?? '');
  const patch: SyncPatch = {
    ...(changed ? { description: markdown } : {}),
    readme_etag: res.etag,
    readme_synced_at: now.toISOString(),
  };
  return { kind: 'synced', changed, patch };
}
