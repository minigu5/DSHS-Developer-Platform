"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isDeveloper } from "@/lib/constants";

export function EditButton({
  projectId,
  authorId,
  teamMembers,
}: {
  projectId: string;
  authorId: string;
  teamMembers?: string[] | null;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        const isAuthor = user?.id === authorId;
        const isTeamMember = !!user?.email && (teamMembers?.includes(user.email) ?? false);
        setShow(isAuthor || isTeamMember || isDeveloper(user?.email));
      });
  }, [authorId, teamMembers]);

  if (!show) return null;

  return (
    <Link
      href={`/projects/${projectId}/edit`}
      className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-11 rounded-full px-4 text-sm text-zinc-700 dark:text-zinc-300")}
    >
      <Pencil className="mr-1.5 h-4 w-4" aria-hidden /> 수정하기
    </Link>
  );
}
