"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { HEART_CHANGE_EVENT, type HeartChangeDetail } from "@/lib/hearts-client";

/** 상세 수치 띠의 하트 칸 — 위 하트 버튼을 누르면 새로 고침 없이 같이 바뀐다. */
function useHeartCount(projectId: string, initial: number) {
  const [count, setCount] = useState(initial);
  // 서버가 새 수를 내려주면(새로 고침) 그 값으로 맞춘다
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setCount(initial);
  }
  useEffect(() => {
    function onChange(e: Event) {
      const { detail } = e as CustomEvent<HeartChangeDetail>;
      if (detail.projectId === projectId) setCount(detail.count);
    }
    window.addEventListener(HEART_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(HEART_CHANGE_EVENT, onChange);
  }, [projectId]);
  return count;
}

export function HeartStatValue({ projectId, count: initial }: { projectId: string; count: number }) {
  const count = useHeartCount(projectId, initial);
  return (
    <>
      <Heart className="h-4 w-4 text-rose-500" aria-hidden />
      {count.toLocaleString("ko-KR")}
    </>
  );
}

export function HeartStatSub({ projectId, count: initial, commentCount }: { projectId: string; count: number; commentCount: number }) {
  const count = useHeartCount(projectId, initial);
  return <>{count > 0 ? `댓글 ${commentCount}개` : "아직 아무도 안 눌렀어요"}</>;
}
