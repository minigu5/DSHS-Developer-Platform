"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type TipFormInput = {
  title: string;
  summary: string;
  content: string;
  cover_url: string;
  tags: string[];
};

function validate(input: TipFormInput): string | null {
  if (!input.title.trim()) return "제목을 입력해주세요.";
  if (input.title.trim().length > 120) return "제목은 120자 이하여야 합니다.";
  if (!input.content.trim()) return "본문 내용을 입력해주세요.";
  return null;
}

export async function createTip(input: TipFormInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const { data, error } = await supabase
    .from("tips")
    .insert({
      author_id: user.id,
      title: input.title.trim(),
      summary: input.summary.trim() || null,
      content: input.content,
      cover_url: input.cover_url.trim() || null,
      tags: input.tags,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/tips");
  return { id: data.id };
}

export async function updateTip(id: string, input: TipFormInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const { error } = await supabase
    .from("tips")
    .update({
      title: input.title.trim(),
      summary: input.summary.trim() || null,
      content: input.content,
      cover_url: input.cover_url.trim() || null,
      tags: input.tags,
    })
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/tips");
  revalidatePath(`/tips/${id}`);
  return { id };
}

export async function deleteTip(id: string) {
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
