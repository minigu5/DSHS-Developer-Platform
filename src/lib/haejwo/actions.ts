"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type IdeaFormInput = {
  title: string;
  type: string;
  category: string;
  content: string;
};

export async function createIdea(
  input: IdeaFormInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  if (!input.title.trim()) return { error: "제목을 입력해주세요." };
  if (!input.content.trim()) return { error: "아이디어 내용을 입력해주세요." };

  const { data, error } = await supabase
    .from("ideas")
    .insert({
      author_id: user.id,
      title: input.title.trim(),
      type: input.type,
      category: input.category,
      content: input.content,
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

  if (!input.title.trim()) return { error: "제목을 입력해주세요." };
  if (!input.content.trim()) return { error: "아이디어 내용을 입력해주세요." };

  const { error } = await supabase
    .from("ideas")
    .update({
      title: input.title.trim(),
      type: input.type,
      category: input.category,
      content: input.content,
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

  // 본인 프로젝트인지 검증
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("author_id", user.id)
    .single();

  if (!project) return { error: "본인이 등록한 프로젝트만 선택할 수 있습니다." };

  const { error } = await supabase
    .from("ideas")
    .update({ status: "done", linked_project_id: projectId })
    .eq("id", ideaId);

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
