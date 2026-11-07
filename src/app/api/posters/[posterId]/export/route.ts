import { NextResponse, type NextRequest } from 'next/server'

import { renderPosterFile } from '@/lib/posters/render'
import { guardPosterRequest } from '@/lib/posters/route-guard'

// PNG(2480×3508)·PDF(1쪽): 띠까지 합친 HTML 을 Cloudflare Browser Rendering 으로 찍는다(src/lib/posters/render.ts).
export async function GET(request: NextRequest, { params }: { params: Promise<{ posterId: string }> }) {
  const { posterId } = await params
  const format = request.nextUrl.searchParams.get('format') === 'pdf' ? 'pdf' : 'png'
  const guarded = await guardPosterRequest(request, posterId)
  if (guarded instanceof NextResponse) return guarded
  const { poster, access } = guarded
  if (!poster.html) return NextResponse.json({ error: '아직 만든 포스터가 없어요.' }, { status: 400 })

  const file = await renderPosterFile({ poster, title: access.project.title, projectId: access.project.id, format, scale: 2, printArt: true })
  if (!file.ok) {
    if (file.status === 503) return NextResponse.json({ error: '지금은 파일을 만들 수 없어요.' }, { status: 503 })
    const error = file.status === 429 ? '파일을 너무 자주 만들었어요. 10초쯤 뒤에 다시 눌러 주세요.' : '지금은 파일을 만들 수 없어요. 잠시 뒤 다시 해 주세요.'
    return NextResponse.json({ error }, { status: 502 })
  }
  const filename = `${access.project.title} 포스터.${format}`
  // 받은 바이트를 그대로 흘려보낸다(디코딩 안 함 — Workers CPU 절약)
  return new Response(file.body, {
    headers: {
      'Content-Type': format === 'png' ? 'image/png' : 'application/pdf',
      'Content-Disposition': `attachment; filename="poster.${format}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  })
}
