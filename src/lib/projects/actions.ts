'use server'

// 프로젝트 삭제 · 비공개 전환 시 주소 닫기 · 설명 속 옛 주소 바꾸기. 주소(서브도메인)가 있으면 먼저 반납하고 DNS 레코드를 지운다 —
// DB 트리거(projects_block_delete_with_subdomain)가 주소가 남은 프로젝트의 삭제를 막는다.
// (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제.

import { revalidatePath } from 'next/cache'

import { deleteCloudinaryImages } from '@/lib/cloudinary-delete'
import { nameMatches } from '@/lib/confirm-name'
import { isAllowedEmail, isDeveloper } from '@/lib/constants'
import { fixOldAddresses, oldAddressPrefixes } from '@/lib/domains/old-address'
import { getOldAddressSource } from '@/lib/domains/read'
import { posterImageUrlsOf } from '@/lib/posters/cleanup'
import { releaseLiveDomain } from '@/lib/projects/release-domain'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export type ProjectActionResult = { ok: true } | { ok: false; error: string }
export type DeleteProjectResult = ProjectActionResult

const FAILED = '삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.'

export async function deleteProject(projectId: string, confirmTitle: string): Promise<ProjectActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isAllowedEmail(user.email)) return { ok: false, error: '학교 계정으로 로그인해야 해요.' }

  const admin = createAdminClient()
  const { data: project } = await admin.from('projects').select('author_id, title').eq('id', projectId).maybeSingle()
  if (!project || project.author_id !== user.id) return { ok: false, error: '내 프로젝트만 삭제할 수 있어요.' }
  if (!nameMatches(confirmTitle, project.title)) return { ok: false, error: '프로젝트 이름을 똑같이 적어 주세요.' }

  if (!(await releaseLiveDomain(admin, user.id, projectId, 'project_deleted'))) return { ok: false, error: FAILED }

  // 포스터 그림은 프로젝트와 함께 CASCADE 로 사라지니 그 전에 주소를 챙겨 두었다가 지운 뒤 Cloudinary 에서도 지운다
  const posterUrls = await posterImageUrlsOf([projectId])

  // 실제 삭제는 사용자 권한(RLS: 소유자만)으로. author_id 는 사용자 키로 못 읽어서 거르기에 못 쓴다 — 위에서 서비스 키로 확인했고 RLS 가 한 번 더 막는다
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) {
    console.error('[projects] 삭제 실패', error)
    return { ok: false, error: FAILED }
  }

  await deleteCloudinaryImages(posterUrls)
  revalidatePath('/explore')
  revalidatePath('/domains', 'layout')
  return { ok: true }
}

/**
 * 비공개로 바뀐 프로젝트의 주소를 닫는다(반납 + DNS 레코드 삭제). 수정 폼이 비공개로 저장한 *뒤에* 부른다 —
 * 저장 때 방문 주소가 이 주소로 같이 쓰이므로, 그 뒤에 반납해야 이전 방문 주소로 되돌아간다.
 * DB 에 저장된 공개 범위가 비공개일 때만 닫아서, 공개 프로젝트의 주소는 이 경로로 못 닫는다.
 */
export async function closeDomainOfPrivateProject(projectId: string): Promise<ProjectActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isAllowedEmail(user.email)) return { ok: false, error: '학교 계정으로 로그인해야 해요.' }

  const admin = createAdminClient()
  const { data: project } = await admin
    .from('projects')
    .select('author_id, visibility')
    .eq('id', projectId)
    .maybeSingle()
  if (!project || (project.author_id !== user.id && !isDeveloper(user.email))) {
    return { ok: false, error: '내 프로젝트만 바꿀 수 있어요.' }
  }
  if (project.visibility !== 'private') return { ok: false, error: '비공개로 저장된 프로젝트만 주소를 닫을 수 있어요.' }

  if (!(await releaseLiveDomain(admin, user.id, projectId, 'project_private'))) {
    return { ok: false, error: '주소를 반납하지 못했어요. 잠시 뒤 다시 저장해 주세요.' }
  }

  revalidatePath('/domains', 'layout')
  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

/**
 * 상세 설명에 남은 옛 사이트 주소(README 를 그대로 가져온 "접속 주소: https://…web.app" 등)를 연결된 <이름>.dshs.dev 로 바꾼다.
 * 상세 페이지 안내의 "바꾸기"가 부른다. 소유자만, 연결이 확인된(active) 주소가 있을 때만. 바꿀 곳은 서버에서 다시 찾는다.
 */
export async function replaceOldAddressesInDescription(projectId: string): Promise<ProjectActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isAllowedEmail(user.email)) return { ok: false, error: '학교 계정으로 로그인해야 해요.' }

  const admin = createAdminClient()
  const { data: project } = await admin.from('projects').select('author_id, description').eq('id', projectId).maybeSingle()
  if (!project || project.author_id !== user.id) return { ok: false, error: '내 프로젝트만 바꿀 수 있어요.' }

  const source = await getOldAddressSource(projectId)
  if (!source) return { ok: false, error: '연결된 주소가 없어요.' }
  const fix = fixOldAddresses(project.description ?? '', oldAddressPrefixes(source), source.name)
  if (fix.count === 0) return { ok: true }

  // 저장은 사용자 권한(RLS)으로
  const { error } = await supabase.from('projects').update({ description: fix.text }).eq('id', projectId)
  if (error) {
    console.error('[projects] 옛 주소 바꾸기 실패', error)
    return { ok: false, error: '바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
  }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}
