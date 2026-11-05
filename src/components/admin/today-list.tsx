"use client";

import Link from "@/components/shared/link";
import { CheckCircle2 } from "lucide-react";

import {
  adminDeleteBurstExceptFirst,
  adminDismiss,
  adminRebanByBan,
  adminRevertGuide,
} from "@/lib/admin/actions";
import type { AdminTodayItem } from "@/lib/admin/read";
import { revokeSubdomain } from "@/lib/domains/actions";

import { BanButton } from "./ban-dialog";
import { ConfirmAction, QuickAction, SMALL_BTN } from "./confirm-action";
import { ContentActions } from "./content-actions";
import { ContentLine } from "./content-line";

const CARD = "rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

function Dismiss({ itemKey }: { itemKey: string }) {
  return <QuickAction label="확인함" success="확인함으로 넘겼어요" action={() => adminDismiss(itemKey)} />;
}

function TodayRow({ t }: { t: AdminTodayItem }) {
  const head = <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{t.reason}</p>;

  if (t.kind === "profanity" && t.items?.[0]) {
    return (
      <li className="py-2">
        {head}
        <ContentLine item={t.items[0]} actions={<><ContentActions item={t.items[0]} /><Dismiss itemKey={t.key} /></>} />
      </li>
    );
  }

  if (t.kind === "burst" && t.items) {
    const first = t.items[0];
    return (
      <li className="py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {head}
          <div className="flex flex-wrap gap-1.5">
            {t.items.length > 1 && (
              <ConfirmAction
                label="하나만 남기고 지우기"
                title={`${t.items.length - 1}개를 지울까요?`}
                description="가장 먼저 올린 하나만 남기고 나머지를 지워요. 되돌릴 수 없어요."
                confirmLabel="지우기"
                success="정리했어요"
                action={() => adminDeleteBurstExceptFirst(first.kind, t.items!.map((i) => ({ id: i.id, createdAt: i.createdAt })))}
              />
            )}
            <Dismiss itemKey={t.key} />
          </div>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {t.items.map((i) => (
            <ContentLine key={i.id} item={i} actions={<ContentActions item={i} />} />
          ))}
        </div>
      </li>
    );
  }

  if (t.kind === "guide_shrink" && t.guide) {
    const { docKey, revNo } = t.guide;
    return (
      <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {head}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            가이드 위키 <span className="font-medium text-zinc-800 dark:text-zinc-200">{docKey}</span> 버전 {revNo}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ConfirmAction
            label="되돌리기"
            title="바로 앞 버전으로 되돌릴까요?"
            description="이 수정 전 내용으로 새 버전을 저장해요. 기록은 남아요."
            confirmLabel="되돌리기"
            success="되돌렸어요"
            action={() => adminRevertGuide(docKey, revNo)}
          />
          <Link href={`/guide-wiki/${docKey}/diff?from=${revNo - 1}&to=${revNo}`} className={SMALL_BTN}>
            바뀐 점 보기
          </Link>
          <Dismiss itemKey={t.key} />
        </div>
      </li>
    );
  }

  if (t.kind === "broken_domain") {
    return (
      <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>{head}</div>
        <div className="flex flex-wrap gap-1.5">
          <ConfirmAction
            label="주소 회수"
            title="이 주소를 회수할까요?"
            description="주소가 닫히고, 같은 이름은 다시 받을 수 없게 막아 둬요. 아래 주소 관리에서 이름을 풀 수 있어요."
            confirmLabel="회수"
            success="회수했어요"
            action={async () => {
              const r = await revokeSubdomain(t.target.id, "끊긴 주소 — 관리자 회수");
              return r.ok ? { ok: true } : { ok: false, error: r.error };
            }}
          />
          <Link href="#domains" className={SMALL_BTN}>
            주소 관리에서 보기
          </Link>
          <Dismiss itemKey={t.key} />
        </div>
      </li>
    );
  }

  if (t.kind === "ban_ended") {
    return (
      <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>{head}</div>
        <div className="flex flex-wrap gap-1.5">
          <BanButton label="다시 차단" who={null} onBan={(d, r) => adminRebanByBan(t.target.id, d, r)} />
          <Dismiss itemKey={t.key} />
        </div>
      </li>
    );
  }

  return null;
}

export function TodayList({ items }: { items: AdminTodayItem[] }) {
  if (items.length === 0) {
    return (
      <div className={`${CARD} flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400`}>
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        오늘 확인할 것이 없어요.
      </div>
    );
  }
  return (
    <ul className={`${CARD} divide-y divide-zinc-100 py-2 dark:divide-zinc-800`}>
      {items.map((t) => (
        <TodayRow key={t.key} t={t} />
      ))}
    </ul>
  );
}
