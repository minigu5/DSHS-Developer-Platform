import type { SupabaseClient } from "@supabase/supabase-js";

/** 하트 누르기/취소 — 이미 눌린 상태에서 또 누름(23505)은 성공으로 본다. */
export async function setHeart(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  on: boolean,
): Promise<{ error: string | null }> {
  const { error } = on
    ? await supabase.from("project_hearts").insert({ project_id: projectId, user_id: userId })
    : await supabase.from("project_hearts").delete().eq("project_id", projectId).eq("user_id", userId);
  if (error && error.code !== "23505") return { error: error.message };
  return { error: null };
}

/** 하트 버튼이 바뀐 수를 알리는 브라우저 이벤트 — 같은 화면의 다른 자리(상세 수치 띠)가 받아 바로 바꾼다. */
export const HEART_CHANGE_EVENT = "project-heart-change";

export type HeartChangeDetail = { projectId: string; count: number; hearted: boolean };

export function emitHeartChange(detail: HeartChangeDetail) {
  window.dispatchEvent(new CustomEvent<HeartChangeDetail>(HEART_CHANGE_EVENT, { detail }));
}
