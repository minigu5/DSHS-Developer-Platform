"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isDeveloper } from "@/lib/constants";

export type AnnouncementFormInput = {
  title: string;
  category: string;
  content: string;
};

const AnnouncementSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(120, "제목은 120자 이하여야 합니다."),
  category: z.enum(["promotion", "beta", "feedback", "update", "general", "admin"], {
    message: "올바른 카테고리를 선택해주세요.",
  }),
  content: z.string().min(1, "내용을 입력해주세요.").max(50_000, "내용은 50,000자 이하여야 합니다."),
});

function parse(input: AnnouncementFormInput, userEmail: string | undefined) {
  const result = AnnouncementSchema.safeParse(input);
  if (!result.success) {
    return { ok: false as const, error: result.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }
  if (result.data.category === "admin" && !isDeveloper(userEmail)) {
    return { ok: false as const, error: "관리자만 '관리자' 카테고리를 사용할 수 있습니다." };
  }
  return { ok: true as const, data: result.data };
}

export async function createAnnouncement(
  input: AnnouncementFormInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = parse(input, user.email ?? undefined);
  if (!parsed.ok) return { error: parsed.error };

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      author_id: user.id,
      title: parsed.data.title,
      category: parsed.data.category,
      content: parsed.data.content,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (!data?.id) return { error: "공지사항을 저장했지만 ID를 가져오지 못했습니다." };

  revalidatePath("/announcements");
  revalidatePath(`/announcements/${data.id}`);
  return { id: data.id };
}

export async function updateAnnouncement(
  id: string,
  input: AnnouncementFormInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = parse(input, user.email ?? undefined);
  if (!parsed.ok) return { error: parsed.error };

  const { data: existing } = await supabase
    .from("announcements")
    .select("author_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "공지사항을 찾을 수 없습니다." };
  if (existing.author_id !== user.id && !isDeveloper(user.email)) {
    return { error: "수정 권한이 없습니다." };
  }

  const { error } = await supabase
    .from("announcements")
    .update({
      title: parsed.data.title,
      category: parsed.data.category,
      content: parsed.data.content,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/announcements");
  revalidatePath(`/announcements/${id}`);
  return { id };
}

export async function deleteAnnouncement(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: existing } = await supabase
    .from("announcements")
    .select("author_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "공지사항을 찾을 수 없습니다." };
  if (existing.author_id !== user.id && !isDeveloper(user.email)) {
    return { error: "삭제 권한이 없습니다." };
  }

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/announcements");
  return { success: true };
}

export async function togglePinAnnouncement(
  id: string,
  pinned: boolean,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  if (!isDeveloper(user.email)) return { error: "관리자만 공지사항을 고정할 수 있습니다." };

  const { error } = await supabase
    .from("announcements")
    .update({ is_pinned: pinned })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/announcements");
  revalidatePath(`/announcements/${id}`);
  return { success: true };
}
