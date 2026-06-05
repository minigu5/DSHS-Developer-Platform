"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { INTERESTS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

const INTEREST_VALUES = INTERESTS.map((i) => i.value) as [string, ...string[]];

const NicknameSchema = z
  .string()
  .trim()
  .min(2, "닉네임은 2자 이상이어야 합니다.")
  .max(20, "닉네임은 20자 이하여야 합니다.");

const ProfileSchema = z.object({
  nickname: z.union([NicknameSchema, z.null()]),
  bio: z.union([z.string().trim().max(500, "자기소개는 500자 이하여야 합니다."), z.null()]),
  avatar_url: z
    .string()
    .trim()
    .max(500, "아바타 URL이 너무 깁니다.")
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "아바타는 http(s) URL 이어야 합니다."),
  interests: z.array(z.enum(INTEREST_VALUES)).max(INTERESTS.length).optional(),
});

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

    const parsed = ProfileSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
    }
    const { nickname, bio, avatar_url, interests } = parsed.data;

    // Nickname duplicate check again on server side for safety
    if (nickname) {
      const { isDuplicate, error: checkError } = await checkNicknameDuplicate(nickname, user.id);
      if (checkError) return { error: checkError };
      if (isDuplicate) return { error: "이미 사용 중인 닉네임입니다." };
    }

    // Use upsert to handle cases where public.users record might be missing (trigger failed)
    const { error } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        email: user.email!,
        nickname,
        bio,
        avatar_url,
        interests: interests || [],
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
