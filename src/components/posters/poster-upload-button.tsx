"use client";

import { useRef, useState } from "react";
import { ImageUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { POSTER_LIMITS } from "@/lib/posters/config";

export const POSTER_FILE_ACCEPT = "image/png,image/jpeg,image/webp";
export const POSTER_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const POSTER_UPLOADED_NOT_HUNG = "포스터는 올렸지만 상세 페이지에 걸지 못했어요. 포스터 화면에서 \"상세 페이지에 걸기\"를 눌러 주세요.";

/** 직접 만든 포스터 그림을 /api/posters/upload 로 올린다. 실패하면 서버 문구를 그대로 돌려준다. hung 은 걸기까지 됐는지(올리기만 됐을 수 있음). */
export async function uploadPosterFile(projectId: string, file: File, hang: boolean): Promise<{ ok: true; hung: boolean } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("projectId", projectId);
  form.append("file", file);
  form.append("hang", hang ? "1" : "0");
  try {
    const res = await fetch("/api/posters/upload", { method: "POST", body: form });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; hung?: boolean } | null;
    if (res.ok && body?.ok) return { ok: true, hung: body.hung === true };
    return { ok: false, error: body?.error ?? "그림을 올리지 못했어요. 잠시 뒤 다시 해 주세요." };
  } catch {
    return { ok: false, error: "그림을 올리지 못했어요. 잠시 뒤 다시 해 주세요." };
  }
}

/**
 * 포스터 그림 올리기 — 버튼으로 고르거나 목록에 끌어다 놓으면(useFileDrop) 바로 올린다. 걸린 포스터가 없으면 올린 그림을 바로 건다.
 * 버튼과 놓을 상자가 같은 올리기 상태(pending)를 쓰게 목록이 한 번 부르고 둘에 나눠 준다.
 */
export function usePosterUpload({ projectId, full, hangIfNone, onUploaded }: { projectId: string; full: boolean; hangIfNone: boolean; onUploaded: () => void }) {
  const [pending, setPending] = useState(false);

  const upload = async (file: File) => {
    if (pending) return;
    if (full) {
      toast.error(`포스터는 ${POSTER_LIMITS.perProject}개까지예요. 하나를 지우면 올릴 수 있어요.`);
      return;
    }
    if (!POSTER_FILE_ACCEPT.split(",").includes(file.type)) {
      toast.error("PNG, JPG, WebP 그림만 올릴 수 있어요.");
      return;
    }
    if (file.size > POSTER_FILE_MAX_BYTES) {
      toast.error("포스터 그림은 10MB까지 올릴 수 있어요.");
      return;
    }
    setPending(true);
    const result = await uploadPosterFile(projectId, file, hangIfNone);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (hangIfNone && !result.hung) toast.warning(POSTER_UPLOADED_NOT_HUNG);
    else toast.success(hangIfNone ? "올리고 상세 페이지에 걸었어요." : "포스터를 올렸어요.");
    onUploaded();
  };
  return { pending, full, upload };
}

export function PosterUploadButton({ uploader }: { uploader: ReturnType<typeof usePosterUpload> }) {
  const input = useRef<HTMLInputElement>(null);
  const { pending, full, upload } = uploader;

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={POSTER_FILE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <Button variant="outline" className="h-11 rounded-full px-5" disabled={full || pending} onClick={() => input.current?.click()}>
        <ImageUp className="mr-1 h-4 w-4" aria-hidden /> {pending ? "올리는 중…" : "포스터 그림 올리기"}
      </Button>
    </>
  );
}
