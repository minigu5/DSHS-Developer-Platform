"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type TipFormInput = {
  title: string;
  summary: string;
  content: string;
  cover_url: string;
  tags: string[];
};

const TipSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(120, "제목은 120자 이하여야 합니다."),
  summary: z.string().trim().min(1, "한 줄 요약을 입력해주세요.").max(30, "한 줄 요약은 30자 이하여야 합니다."),
  content: z.string().min(1, "본문 내용을 입력해주세요.").max(50_000, "본문은 50,000자 이하여야 합니다."),
  cover_url: z.string().trim().min(1, "대표 이미지 URL을 입력해주세요.").max(500, "대표 이미지 URL이 너무 깁니다.").url("올바른 URL 형식이 아닙니다."),
  tags: z.array(z.string().trim().min(1).max(30)).max(20, "태그는 20개 이하여야 합니다."),
});

function parse(input: TipFormInput) {
  const result = TipSchema.safeParse(input);
  if (!result.success) {
    return { ok: false as const, error: result.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }
  return { ok: true as const, data: result.data };
}

export async function createTip(
  input: TipFormInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = parse(input);
  if (!parsed.ok) return { error: parsed.error };

  const { data, error } = await supabase
    .from("tips")
    .insert({
      author_id: user.id,
      title: parsed.data.title,
      summary: parsed.data.summary,
      content: parsed.data.content,
      cover_url: parsed.data.cover_url,
      tags: parsed.data.tags,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (!data?.id) return { error: "팁을 저장했지만 ID를 가져오지 못했습니다." };

  revalidatePath("/tips");
  revalidatePath(`/tips/${data.id}`);
  return { id: data.id };
}

export async function updateTip(
  id: string,
  input: TipFormInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = parse(input);
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase
    .from("tips")
    .update({
      title: parsed.data.title,
      summary: parsed.data.summary,
      content: parsed.data.content,
      cover_url: parsed.data.cover_url,
      tags: parsed.data.tags,
    })
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/tips");
  revalidatePath(`/tips/${id}`);
  return { id };
}

export async function deleteTip(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("tips")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/tips");
  return { success: true };
}
