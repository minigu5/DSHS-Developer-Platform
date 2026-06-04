"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EditButton({ projectId, authorId }: { projectId: string; authorId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setShow(user?.id === authorId));
  }, [authorId]);

  if (!show) return null;

  return (
    <Link
      href={`/projects/${projectId}/edit`}
      className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "rounded-full font-medium")}
    >
      <Pencil className="w-4 h-4 mr-2 text-zinc-600 dark:text-zinc-400" /> 수정하기
    </Link>
  );
}
