import 'server-only'

import { createHash } from 'node:crypto'

import { getFragment, listUsages as listGuideUsages } from '@/lib/guide-content'
import { DEV_SAMPLE } from '@/lib/guide-wiki/dev-sample'
import type { WikiDoc } from '@/lib/guide-wiki/types'

const isDevSample = (key: string) =>
  key === DEV_SAMPLE.key && process.env.NODE_ENV !== 'production'

/**
 * 저장소 원본 어댑터 — 가이드 조각(`src/content/guides/<key>.md`)과 닿는 유일한 파일.
 * 비운영 환경에서는 시험용 `dev-sample`도 돌려준다.
 */
export async function loadSourceDoc(key: string): Promise<WikiDoc | null> {
  if (isDevSample(key)) return DEV_SAMPLE
  return getFragment(key)
}

/** 이 조각을 쓰는 가이드 경로 ("이 내용은 가이드 N곳에 함께 쓰여요"). */
export async function listUsages(
  key: string,
): Promise<{ label: string; href: string }[]> {
  if (isDevSample(key)) return []
  return listGuideUsages(key)
}

/** 원본 내용 지문. 위키 저장본이 원본과 어긋났는지 비교하는 데 쓴다. */
export function sourceHash(doc: WikiDoc): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        title: doc.title,
        steps: doc.steps.map((s) => s.body),
        extra: doc.extra,
      }),
    )
    .digest('hex')
}
