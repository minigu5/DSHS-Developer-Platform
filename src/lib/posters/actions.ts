'use server'

// 포스터 지우기. 올리기는 POST /api/posters/upload, 걸기·내리기는 hang.ts.
// (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제(src/lib/projects/actions.ts 와 같은 이유).

import { revalidatePath } from 'next/cache'

import { deleteCloudinaryImages } from '@/lib/cloudinary-delete'
import { createAdminClient } from '@/lib/supabase/server'

import { getBandAccess } from './access'
import { POSTER_COPY } from './messages'
import { loadPoster } from './poster-db'

export async function deletePoster(posterId: string): Promise<{ error?: string }> {
  const poster = await loadPoster(posterId)
  if (!poster) return { error: POSTER_COPY.notFound }
  if (typeof (await getBandAccess(poster.project_id)) === 'string') return { error: POSTER_COPY.noPermission }
  const admin = createAdminClient()
  // 걸려 있던 포스터면 FK 가 걸린 칸을 비운다 — 올린 그림은 포스터 자체라 Cloudinary 에서 같이 지운다
  const { data: project } = await admin.from('projects').select('poster_id').eq('id', poster.project_id).maybeSingle()
  const { error } = await admin.from('project_posters').delete().eq('id', posterId)
  if (error) return { error: '지우지 못했어요. 잠시 뒤 다시 해 주세요.' }
  await deleteCloudinaryImages([poster.image_url].filter((u): u is string => !!u))
  if (project?.poster_id === posterId) revalidatePath(`/projects/${poster.project_id}`)
  return {}
}
