"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { USER_EMAIL_MAP } from "@/lib/userEmails";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AuthButtons() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ nickname: string | null; full_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase.from('users').select('nickname, full_name, avatar_url').eq('id', session.user.id).single();
        if (data) {
          setProfile(data);
        }
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data } = await supabase.from('users').select('nickname, full_name, avatar_url').eq('id', session.user.id).single();
          if (data) {
            setProfile(data);
          }
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  if (loading) {
    return <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />;
  }

  if (user) {
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
    
    // Find mapped name from email
    let mappedName = "";
    if (user.email) {
      const entry = Object.entries(USER_EMAIL_MAP).find(([, email]) => email === user.email);
      if (entry) mappedName = entry[0];
    }
    
    // Fallback chain for display name
    const actualFullName = profile?.full_name || mappedName || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
    const displayName = profile?.nickname || actualFullName;
    
    const initials = displayName.substring(0, 2).toUpperCase();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="relative h-9 w-9 rounded-full focus:outline-none ring-2 ring-transparent hover:ring-blue-500/50 transition-all cursor-pointer">
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-bold text-xs">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <div className="flex items-center justify-start gap-2 p-2 text-sm">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium text-zinc-900 dark:text-white">{displayName}</p>
              <p className="w-[200px] truncate text-xs text-zinc-500 dark:text-zinc-400">
                {user.email}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/me')} className="cursor-pointer">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>내 페이지 (마이페이지)</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400">
            <LogOut className="mr-2 h-4 w-4" />
            <span>로그아웃</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full font-medium bg-white/50 dark:bg-black/50 backdrop-blur-md border-zinc-200 dark:border-zinc-800")}>
      로그인
    </Link>
  );
}
