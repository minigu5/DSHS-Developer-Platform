'use server'

// 프로젝트 등록 폼에서 "프로필에 GitHub도 넣을까요?"에 동의하면 저장소 주인(owner)을 프로필 연락처에 더한다.
// (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제.

import { revalidatePath } from 'next/cache'

import { parseGithubRepo } from '@/lib/github-readme'
import { createClient } from '@/lib/supabase/server'
import type { UserContact } from '@/lib/types'

export type AddGithubResult = { ok: true; username: string } | { ok: false; error: string }

const MAX_CONTACTS = 8 // updateProfile 의 연락처 최대 개수와 같게

export async function addGithubToProfile(repoUrl: string): Promise<AddGithubResult> {
  const target = parseGithubRepo(repoUrl)
  if (!target) return { ok: false, error: 'GitHub 저장소 링크가 아니에요.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인이 필요해요.' }

  const { data: profile, error: readError } = await supabase
    .from('users')
    .select('contacts')
    .eq('id', user.id)
    .maybeSingle()
  if (readError || !profile) return { ok: false, error: '프로필을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.' }

  const contacts = (profile.contacts ?? []) as UserContact[]
  const username = target.owner
  if (contacts.some((c) => c.type === 'github' && c.value.toLowerCase() === username.toLowerCase())) {
    return { ok: true, username }
  }
  if (contacts.length >= MAX_CONTACTS) {
    return { ok: false, error: `연락처는 ${MAX_CONTACTS}개까지예요. 프로필 설정에서 하나를 지운 뒤 다시 해 주세요.` }
  }

  const { error } = await supabase
    .from('users')
    .update({ contacts: [...contacts, { type: 'github', value: username }] })
    .eq('id', user.id)
  if (error) {
    console.error('[profile] GitHub 연락처 추가 실패', error)
    return { ok: false, error: '프로필에 추가하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
  }

  revalidatePath(`/developers/${user.id}`)
  return { ok: true, username }
}
