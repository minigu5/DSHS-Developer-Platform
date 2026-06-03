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

  const { error } = await supabase
    .from("users")
    .update({
      nickname: data.nickname,
      bio: data.bio,
      avatar_url: data.avatar_url,
      interests: data.interests,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/developers/${user.id}`);
  return { success: true };
}
