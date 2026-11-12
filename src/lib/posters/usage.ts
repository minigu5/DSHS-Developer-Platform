import 'server-only'

import { createAdminClient } from '@/lib/supabase/server'

import { POSTER_LIMITS } from './config'

// art = Workers AI(UTC 자정), art_local = 학교 Mac mini(KST 자정)
// upload = 이미지 올리기(Cloudinary 용량), export = 포스터 PNG·PDF(Browser Rendering 무료 한도는 계정 공유) — KST 자정, 2026-11-12 감사
export type UsageKind = 'text' | 'art' | 'art_local' | 'upload' | 'export'

const LIMITS: Record<UsageKind, { user: number; site: number }> = {
  text: { user: POSTER_LIMITS.textPerUserPerDay, site: POSTER_LIMITS.textSitePerDay },
  art: { user: POSTER_LIMITS.artPerUserPerDay, site: POSTER_LIMITS.artSitePerDay },
  art_local: { user: POSTER_LIMITS.artLocalPerUserPerDay, site: POSTER_LIMITS.artLocalSitePerDay },
  upload: { user: 60, site: 1000 },
  export: { user: 15, site: 60 },
}

/** 요청 시작 때 1회 예약. 글은 KST 자정, 그림은 UTC 자정(KST 09:00)에 새 날 — migration 20261106150000 */
export async function reserveUsage(kind: UsageKind, userId: string): Promise<'ok' | 'user_limit' | 'site_limit'> {
  const { data, error } = await createAdminClient().rpc('reserve_ai_usage', {
    p_kind: kind,
    p_user: userId,
    p_user_limit: LIMITS[kind].user,
    p_site_limit: LIMITS[kind].site,
  })
  // 예약을 확인 못 하면 막는 쪽으로 — 무료 키를 넘겨 쓰지 않게
  if (error || !data) return 'site_limit'
  return data
}

/** AI 가 붐비거나 실패해서 결과를 못 줬으면 돌려준다 */
export async function releaseUsage(kind: UsageKind, userId: string): Promise<void> {
  await createAdminClient().rpc('release_ai_usage', { p_kind: kind, p_user: userId })
}

/**
 * 한 요청이 지금 잡고 있는 횟수. 큐 일감은 onChange 로 poster_ai_jobs.holds 에 적어 두어, 일감이 중간에 죽어도
 * 막힘 정리가 남은 것만 한 번 돌려준다. 잡지 않은 종류는 돌려주지 않는다(두 번 돌려주기 방지).
 * 적기 → 돌려주기 순서라 그 사이에 죽으면 덜 돌려줄 뿐 두 번 돌려주지 않는다.
 */
export class UsageLedger {
  private held: UsageKind[]

  constructor(
    readonly userId: string,
    initial: readonly UsageKind[] = [],
    private readonly onChange?: (held: UsageKind[]) => Promise<void>,
  ) {
    this.held = [...initial]
  }

  get holds(): UsageKind[] {
    return [...this.held]
  }

  has(kind: UsageKind): boolean {
    return this.held.includes(kind)
  }

  async reserve(kind: UsageKind): Promise<'ok' | 'user_limit' | 'site_limit'> {
    const result = await reserveUsage(kind, this.userId)
    if (result === 'ok') {
      this.held.push(kind)
      await this.onChange?.(this.holds)
    }
    return result
  }

  async release(kind: UsageKind): Promise<void> {
    if (!this.drop(kind)) return
    await this.onChange?.(this.holds)
    await releaseUsage(kind, this.userId)
  }

  /** 쓴 횟수(그림을 그렸거나 학교 Mac 일감이 맡음) — 돌려줄 목록에서만 뺀다 */
  async spend(kind: UsageKind): Promise<void> {
    if (this.drop(kind)) await this.onChange?.(this.holds)
  }

  async releaseAll(): Promise<void> {
    for (const kind of this.holds) await this.release(kind)
  }

  private drop(kind: UsageKind): boolean {
    const i = this.held.indexOf(kind)
    if (i < 0) return false
    this.held.splice(i, 1)
    return true
  }
}
