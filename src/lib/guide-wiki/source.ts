import 'server-only'

import { createHash } from 'node:crypto'

import { DEV_SAMPLE } from '@/lib/guide-wiki/dev-sample'
import type { WikiDoc } from '@/lib/guide-wiki/types'

/**
 * 저장소 원본 어댑터. 실제 가이드 마크다운 연결 시 이 파일만 고친다.
 * 지금은 비운영 환경의 `dev-sample` 하나만 돌려준다.
 */
export async function loadSourceDoc(key: string): Promise<WikiDoc | null> {
  if (key === DEV_SAMPLE.key && process.env.NODE_ENV !== 'production') {
    return DEV_SAMPLE
  }
  return null
}

/** 이 문서가 쓰이는 가이드 경로(문서 화면의 "이 문서가 쓰이는 곳"). */
export async function listUsages(
  key: string,
): Promise<{ label: string; href: string }[]> {
  if (key === DEV_SAMPLE.key && process.env.NODE_ENV !== 'production') {
    return [
      { label: '웹사이트 · Claude 데스크톱 · Mac', href: '/guide/website/desktop/mac' },
      { label: '웹사이트 · Claude 데스크톱 · Windows', href: '/guide/website/desktop/windows' },
    ]
  }
  return []
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
