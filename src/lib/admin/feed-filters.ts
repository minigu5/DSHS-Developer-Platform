// 최신 글 종류 칩. 화면(클라이언트)과 서버(admin_recent_content 의 p_kinds)가 같이 쓴다.

import type { ContentKind } from './today.ts'

export type FeedFilter = 'all' | 'project' | 'comment' | 'tip' | 'idea' | 'guide' | 'profile'

export const FEED_FILTERS: { value: FeedFilter; label: string; kinds: ContentKind[] | null }[] = [
  { value: 'all', label: '전체', kinds: null },
  { value: 'project', label: '프로젝트', kinds: ['project'] },
  { value: 'comment', label: '댓글', kinds: ['project_comment', 'tip_comment'] },
  { value: 'tip', label: '팁', kinds: ['tip'] },
  { value: 'idea', label: '해줘', kinds: ['idea'] },
  { value: 'guide', label: '위키', kinds: ['guide'] },
  { value: 'profile', label: '프로필', kinds: ['profile'] },
]

export const CONTENT_KIND_LABELS: Record<ContentKind, string> = {
  project: '프로젝트',
  project_comment: '프로젝트 댓글',
  tip: '팁',
  tip_comment: '팁 댓글',
  idea: '해줘',
  guide: '위키',
  profile: '프로필',
}

export function kindsOf(filter: FeedFilter): ContentKind[] | null {
  return FEED_FILTERS.find((f) => f.value === filter)?.kinds ?? null
}
