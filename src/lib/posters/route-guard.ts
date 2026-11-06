import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'

import { isSameOrigin } from '@/lib/same-origin'
import type { ProjectPosterRow } from '@/lib/types'

import { getPosterAccess, type PosterAccess } from './access'
import { POSTER_COPY } from './messages'
import { loadPoster } from './poster-db'

/** 포스터 API 공통 검사: 출처(학생 주소는 same-site 라 쿠키가 실려 옴) → 포스터 → 프로젝트 권한 */
export async function guardPosterRequest(
  request: NextRequest,
  posterId: string,
): Promise<{ poster: ProjectPosterRow; access: PosterAccess } | NextResponse> {
  if (!isSameOrigin(request.headers, [request.nextUrl.origin, process.env.NEXT_PUBLIC_SITE_URL ?? ''])) {
    return NextResponse.json({ ok: false, error: POSTER_COPY.noPermission }, { status: 403 })
  }
  const poster = await loadPoster(posterId)
  if (!poster) return NextResponse.json({ ok: false, error: POSTER_COPY.notFound }, { status: 404 })
  const access = await getPosterAccess(poster.project_id)
  if (access === 'login') return NextResponse.json({ ok: false, error: '로그인이 필요해요.' }, { status: 401 })
  if (typeof access === 'string') return NextResponse.json({ ok: false, error: POSTER_COPY.noPermission }, { status: 403 })
  return { poster, access }
}
