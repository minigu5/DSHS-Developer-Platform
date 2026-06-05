"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PROJECT_TYPES, FEATURES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type IdeaFormInput = {
  title: string;
  type: string;
  category: string;
  content: string;
};

const TYPE_VALUES = PROJECT_TYPES.map((t) => t.value) as [string, ...string[]];
const CATEGORY_VALUES = FEATURES.map((f) => f.value) as [string, ...string[]];

const IdeaSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(120, "제목은 120자 이하여야 합니다."),
  type: z.enum(TYPE_VALUES, { message: "올바른 프로그램 종류가 아닙니다." }),
  category: z.enum(CATEGORY_VALUES, { message: "올바른 카테고리가 아닙니다." }),
  content: z.string().trim().min(1, "아이디어 내용을 입력해주세요.").max(20_000, "내용은 20,000자 이하여야 합니다."),
});

function parse(input: IdeaFormInput) {
  const result = IdeaSchema.safeParse(input);
  if (!result.success) {
    return { ok: false as const, error: result.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }
  return { ok: true as const, data: result.data };
}

export async function createIdea(
  input: IdeaFormInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = parse(input);
  if (!parsed.ok) return { error: parsed.error };

  const { data, error } = await supabase
    .from("ideas")
    .insert({
      author_id: user.id,
      title: parsed.data.title,
      type: parsed.data.type,
      category: parsed.data.category,
      content: parsed.data.content,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (!data?.id) return { error: "아이디어를 저장했지만 ID를 가져오지 못했습니다." };

  revalidatePath("/haejwo");
  revalidatePath(`/haejwo/${data.id}`);
  return { id: data.id };
}

export async function updateIdea(
  id: string,
  input: IdeaFormInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const parsed = parse(input);
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase
    .from("ideas")
    .update({
      title: parsed.data.title,
      type: parsed.data.type,
      category: parsed.data.category,
      content: parsed.data.content,
    })
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/haejwo");
  revalidatePath(`/haejwo/${id}`);
  return { id };
}

export async function markIdeaDone(
  ideaId: string,
  projectId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // 1) 본인 프로젝트인지 검증
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("author_id", user.id)
    .single();

  if (!project) return { error: "본인이 등록한 프로젝트만 선택할 수 있습니다." };

  // 2) 아이디어 작성자 본인인지 검증
  const { data: idea } = await supabase
    .from("ideas")
    .select("author_id")
    .eq("id", ideaId)
    .single();

  if (!idea) return { error: "아이디어를 찾을 수 없습니다." };
  if (idea.author_id !== user.id) {
    return { error: "본인이 등록한 아이디어만 완료 처리할 수 있습니다." };
  }

  const { error } = await supabase
    .from("ideas")
    .update({ status: "done", linked_project_id: projectId })
    .eq("id", ideaId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/haejwo/${ideaId}`);
  revalidatePath("/haejwo");
  return { success: true };
}

export async function deleteIdea(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("ideas")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/haejwo");
  return { success: true };
}
