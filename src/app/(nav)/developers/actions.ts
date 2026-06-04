"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function checkNicknameDuplicate(nickname: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("nickname", nickname)
    .neq("id", userId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  return { isDuplicate: !!data };
}

export async function updateProfile(data: { 
  nickname: string | null; 
  bio: string | null; 
  avatar_url: string;
  interests?: string[];
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Nickname duplicate check again on server side for safety
    if (data.nickname) {
      const { isDuplicate, error: checkError } = await checkNicknameDuplicate(data.nickname, user.id);
      if (checkError) return { error: checkError };
      if (isDuplicate) return { error: "이미 사용 중인 닉네임입니다." };
    }

    // Use upsert to handle cases where public.users record might be missing (trigger failed)
    const { error } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        email: user.email!,
        nickname: data.nickname,
        bio: data.bio,
        avatar_url: data.avatar_url,
        interests: data.interests || [],
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error("Profile update error:", error);
      return { error: error.message };
    }

    revalidatePath(`/developers/${user.id}`);
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (err) {
    console.error("Unexpected error in updateProfile:", err);
    return { error: "예기치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }
}
