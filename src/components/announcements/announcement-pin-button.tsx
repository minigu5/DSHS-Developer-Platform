"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pin, PinOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { togglePinAnnouncement } from "@/lib/announcements/actions";

interface AnnouncementPinButtonProps {
  announcementId: string;
  isPinned: boolean;
}

export function AnnouncementPinButton({ announcementId, isPinned }: AnnouncementPinButtonProps) {
  const [pinned, setPinned] = useState(isPinned);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const result = await togglePinAnnouncement(announcementId, !pinned);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setPinned(!pinned);
    toast.success(pinned ? "고정을 해제했습니다." : "공지사항을 고정했습니다.");
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleToggle}
      disabled={loading}
      className={
        pinned
          ? "gap-1.5 rounded-full border-sky-300 bg-sky-50 text-sky-600 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-400 dark:hover:bg-sky-950/50"
          : "gap-1.5 rounded-full"
      }
    >
      {pinned ? (
        <>
          <PinOff className="h-3.5 w-3.5" /> 고정 해제
        </>
      ) : (
        <>
          <Pin className="h-3.5 w-3.5" /> 고정
        </>
      )}
    </Button>
  );
}
