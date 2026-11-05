// 프로젝트 댓글의 작성자 표시 — 익명 프로젝트를 만든 사람의 댓글은 DB 가 public_user_id 를 비워서 준다.

export type CommentRowView = {
  id: string
  content: string
  created_at: string
  /** 댓글 쓴 사람 = 프로젝트 소유자 */
  is_author: boolean
  /** 익명 프로젝트 소유자의 댓글이면 null — 화면은 이 칸으로만 사람을 붙인다(user_id 는 사용자 키로 못 읽음) */
  public_user_id: string | null
  user: { full_name: string | null; nickname: string | null; avatar_url: string | null } | null
}

export type CommentAuthorView =
  | { kind: 'anonymous-author' }
  | { kind: 'user'; userId: string; name: string; avatarUrl: string | null; isAuthor: boolean }
  | { kind: 'unknown' }

export function commentAuthorView(c: CommentRowView): CommentAuthorView {
  if (c.public_user_id) {
    return {
      kind: 'user',
      userId: c.public_user_id,
      name: c.user?.nickname || c.user?.full_name || '알 수 없음',
      avatarUrl: c.user?.avatar_url ?? null,
      isAuthor: c.is_author,
    }
  }
  return c.is_author ? { kind: 'anonymous-author' } : { kind: 'unknown' }
}

/** 수정·삭제 메뉴를 보일지 — 최종 권한은 RLS(user_id = auth.uid())가 판단한다. */
export function isMyComment(c: CommentRowView, viewerId: string | null, viewerOwnsProject: boolean): boolean {
  if (!viewerId) return false
  if (c.public_user_id) return c.public_user_id === viewerId
  return c.is_author && viewerOwnsProject
}
