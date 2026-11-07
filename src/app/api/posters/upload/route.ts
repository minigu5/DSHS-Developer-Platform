import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

import { deleteCloudinaryImages } from '@/lib/cloudinary-delete'
import { getBandAccess } from '@/lib/posters/access'
import { uploadPosterArtBlob } from '@/lib/posters/art'
import { sniffImageType } from '@/lib/posters/art-jobs-logic'
import { setHungPoster } from '@/lib/posters/hang-db'
import { POSTER_COPY } from '@/lib/posters/messages'
import { isSameOrigin } from '@/lib/same-origin'
import { createAdminClient } from '@/lib/supabase/server'

// 직접 만든 포스터 그림 올리기 — multipart: projectId, file, hang("1"이면 바로 상세 페이지에 걸기).
// 권한은 포스터 화면과 같음(getBandAccess — AI 를 안 쓰니 관리자 제한 없음). 형식은 파일 앞 바이트로 확인한다(확장자·type 은 믿지 않음).
// 그림은 Blob 그대로 Cloudinary dshs/posters 로(base64 안 함 — Workers CPU).
const MAX_BYTES = 10 * 1024 * 1024
const UUID = /^[0-9a-f-]{36}$/i

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function POST(request: NextRequest) {
  // 학생 주소(*.dshs.dev)에서 보낸 요청은 same-site 라 쿠키가 실려 온다 — 출처를 직접 확인
  if (!isSameOrigin(request.headers, [request.nextUrl.origin, process.env.NEXT_PUBLIC_SITE_URL ?? ''])) {
    return fail(403, POSTER_COPY.noPermission)
  }
  // 본문을 다 읽기 전에 크기부터 — multipart 머리 몫으로 조금 더 허용(정확한 파일 크기는 아래에서 다시 본다)
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES + 64 * 1024) return fail(413, POSTER_COPY.uploadSize)
  const form = await request.formData().catch(() => null)
  const projectId = form?.get('projectId')
  const file = form?.get('file')
  if (typeof projectId !== 'string' || !UUID.test(projectId) || !(file instanceof File)) return fail(400, POSTER_COPY.uploadFailed)

  const access = await getBandAccess(projectId)
  if (access === 'login') return fail(401, '로그인이 필요해요.')
  if (access === 'not_found') return fail(404, POSTER_COPY.notFound)
  if (typeof access === 'string') return fail(403, POSTER_COPY.noPermission)

  if (file.size > MAX_BYTES) return fail(413, POSTER_COPY.uploadSize)
  if (!sniffImageType(new Uint8Array(await file.slice(0, 12).arrayBuffer()))) return fail(415, POSTER_COPY.uploadType)

  const url = await uploadPosterArtBlob(file)
  if (!url) return fail(502, POSTER_COPY.uploadFailed)

  const { data, error } = await createAdminClient()
    .from('project_posters')
    .insert({ project_id: projectId, created_by: access.userId, kind: 'upload', image_url: url })
    .select('id')
    .single()
  if (error || !data) {
    await deleteCloudinaryImages([url])
    if (error?.message.includes('poster_limit')) return fail(409, POSTER_COPY.uploadLimit)
    console.error('[poster] 올린 그림 저장 실패', error?.message)
    return fail(502, POSTER_COPY.uploadFailed)
  }

  // 걸기에 실패해도 올린 그림은 남아 있으니 ok — hung:false 로 "올렸지만 못 걸었어요"를 보이게 한다
  const hung = form?.get('hang') === '1' ? await setHungPoster(projectId, { posterId: data.id, imageUrl: url, isAi: false }) : false
  if (!hung) revalidatePath(`/projects/${projectId}/poster`)
  return NextResponse.json({ ok: true, posterId: data.id, url, hung })
}
