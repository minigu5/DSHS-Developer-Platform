import { NextResponse, type NextRequest } from 'next/server'

import { isImageOk, resolveFavicon } from '@/lib/favicon'
import { syncFavicon } from '@/lib/favicon-sync'
import { FAVICON_SYNC_SIG_HEADER, verifyFaviconSync } from '@/lib/favicon-sync-job'
import { iconFitStale } from '@/lib/icon-fit-fetch'
import { computeIconFitInWorker } from '@/lib/icon-fit-worker'
import { isJobId } from '@/lib/posters/ai-jobs-logic'
import { createAdminClient } from '@/lib/supabase/server'

// Worker 예약 작업(custom-worker.ts scheduled)만 부르는 내부 경로 — 쿠키 없는 기계 전용이라 isSameOrigin 대신 서명(HMAC, 키 = 서비스 키)으로 연다.
// 본문 {} = 대상 프로젝트 id 목록, { projectId } = 그 프로젝트 하나만 동기화(요청마다 CPU 10ms를 따로 쓰려고 나눔).
// 404 = 서명·id 틀림(이유 안 알림). 판단 로직은 src/lib/favicon-sync.ts(로컬 scripts/sync-favicons.mts와 같음).
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { projectId?: unknown }
  const projectId = body.projectId
  const target = projectId === undefined ? 'list' : projectId
  if (
    (target !== 'list' && !isJobId(target)) ||
    !(await verifyFaviconSync(target as string, request.headers.get(FAVICON_SYNC_SIG_HEADER), process.env.SUPABASE_SERVICE_ROLE_KEY))
  ) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  const admin = createAdminClient()

  if (target === 'list') {
    const { data, error } = await admin
      .from('projects')
      .select('id')
      .eq('icon_type', 'auto')
      .not('url', 'is', null)
      .order('created_at')
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, ids: (data ?? []).map((r) => r.id) })
  }

  const { data: row, error } = await admin
    .from('projects')
    .select('id, title, url, icon_url, icon_fit')
    .eq('id', target)
    .eq('icon_type', 'auto')
    .maybeSingle()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!row) return NextResponse.json({ ok: true, kind: 'skipped', reason: '자동 아이콘 아님' })

  const outcome = await syncFavicon(row, { resolve: resolveFavicon, check: isImageOk })
  // 아이콘 맞춤값(바탕색·꽉 채우기, src/lib/icon-fit.ts)도 지금 아이콘 것이 아니면 같이 맞춘다 — 도메인 바꾸기 등으로 주소만 바뀐 것도 여기서 따라잡는다
  const iconUrl = outcome.kind === 'updated' ? outcome.patch.icon_url : row.icon_url
  const fit = iconUrl && iconFitStale(iconUrl, row.icon_fit) ? await computeIconFitInWorker(iconUrl) : null
  if (outcome.kind === 'updated' || fit) {
    // 그사이 사용자가 직접 올리기로 바꿨으면 덮어쓰지 않게 icon_type 도 조건에 건다
    const { error: updateError } = await admin
      .from('projects')
      .update({ ...(outcome.kind === 'updated' ? outcome.patch : {}), ...(fit ? { icon_fit: { ...fit } } : {}) })
      .eq('id', row.id)
      .eq('icon_type', 'auto')
    if (updateError) return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, kind: outcome.kind, fit: Boolean(fit) })
}
