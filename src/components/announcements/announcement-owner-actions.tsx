"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { deleteAnnouncement } from "@/lib/announcements/actions";

interface AnnouncementOwnerActionsProps {
  announcementId: string;
  authorId: string;
  currentUserId: string | null;
  isAdmin: boolean;
}

export function AnnouncementOwnerActions({
  announcementId,
  authorId,
  currentUserId,
  isAdmin,
}: AnnouncementOwnerActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = currentUserId === authorId || isAdmin;
  if (!canEdit) return null;

  async function handleDelete() {
    setLoading(true);
    const result = await deleteAnnouncement(announcementId);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success("공지사항이 삭제되었습니다.");
    router.push("/announcements");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/announcements/${announcementId}/edit`}
        className={cn(
          buttonVariants({ size: "sm", variant: "outline" }),
          "gap-1.5 rounded-full",
        )}
      >
        <Pencil className="h-3.5 w-3.5" />
        수정
      </Link>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger>
          <span
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "cursor-pointer gap-1.5 rounded-full border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </span>
        </DialogTrigger>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>공지사항 삭제</DialogTitle>
            <DialogDescription>
              이 공지사항을 삭제하면 복구할 수 없습니다. 정말 삭제하시겠어요?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
