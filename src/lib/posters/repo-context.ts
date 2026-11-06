// 공개 GitHub 저장소 내용을 포스터 프롬프트에 더하기(2026-11-06 사용자 요청) — 순수 함수.
// 상세 설명 요약은 1200자에서 잘려 기능·기술 같은 그림 재료가 빠질 수 있어서, README 가 있으면 그것을 3000자까지 쓴다.

import type { PosterProjectInfo, PosterRepoMeta } from './config.ts'
import { summarizeDescription } from './prompt.ts'

const README_MAX = 3000
const TOPICS_MAX = 8

export interface RepoContext {
  meta: PosterRepoMeta | null
  readme: string | null
}

export function parseRepoMeta(body: unknown): PosterRepoMeta {
  const b = (body ?? {}) as { description?: unknown; topics?: unknown; language?: unknown }
  const description = typeof b.description === 'string' && b.description.trim() ? b.description.trim().slice(0, 300) : null
  const topics = Array.isArray(b.topics) ? b.topics.filter((t): t is string => typeof t === 'string').slice(0, TOPICS_MAX) : []
  const language = typeof b.language === 'string' && b.language ? b.language : null
  return { description, topics, language }
}

/** shortDescription: 프로젝트 한 줄 소개. README 가 있으면 소개를 "한 줄 소개 — README 요약"으로 바꾼다(상세 설명은 README 와 겹치기 쉬움). */
export function withRepoContext(info: PosterProjectInfo, shortDescription: string | null, ctx: RepoContext | null): PosterProjectInfo {
  if (!ctx) return info
  const readme = ctx.readme ? summarizeDescription(ctx.readme, README_MAX) : ''
  return {
    ...info,
    summary: readme ? [shortDescription, readme].filter(Boolean).join(' — ') : info.summary,
    repo: ctx.meta,
  }
}
