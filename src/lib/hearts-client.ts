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
