"use client";

import { adminBanByContent, adminDeleteContent } from "@/lib/admin/actions";
import { CONTENT_KIND_LABELS } from "@/lib/admin/feed-filters";
import type { FeedItem } from "@/lib/admin/today";

import { BanButton } from "./ban-dialog";
import { ConfirmAction } from "./confirm-action";

/** 글 줄에 붙는 지우기·작성자 차단. 위키 수정은 지우지 않는다(되돌리기로) */
export function ContentActions({ item }: { item: FeedItem }) {
  const label = CONTENT_KIND_LABELS[item.kind];
  return (
    <>
      {item.kind !== "guide" && (
        <ConfirmAction
          label={item.kind === "profile" ? "닉네임·소개 지우기" : "지우기"}
          title={item.kind === "profile" ? "닉네임과 소개를 지울까요?" : `이 ${label}을(를) 지울까요?`}
          description={
            item.kind === "profile"
              ? "계정은 그대로 두고 닉네임·소개만 비워요. 다음에 들어오면 닉네임을 다시 정해요."
              : item.kind === "project"
                ? "지우면 되돌릴 수 없어요. 받은 주소가 있으면 같이 반납돼요."
                : "지우면 되돌릴 수 없어요."
          }
          confirmLabel="지우기"
          success="지웠어요"
          action={() => adminDeleteContent(item.kind, item.id)}
        />
      )}
      <BanButton who={item.anonymous ? null : item.authorName} onBan={(d, r) => adminBanByContent(item.kind, item.id, d, r)} />
    </>
  );
}
