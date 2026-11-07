"use client";

import { useRef, useState, type DragEvent } from "react";

/**
 * 파일을 끌어다 놓기 — 놓을 상자에 handlers 를 펼치고, dragging 이면 "여기에 놓으세요" 표시를 보인다.
 * 안쪽 요소를 지날 때마다 enter/leave 가 번갈아 와서 깊이를 센다. 글자·링크를 끌 땐 반응하지 않는다(Files 만).
 * 못 올리는 때(개수 다 참 등)도 놓기는 받아서 onFile 이 알린다 — 안 받으면 브라우저가 그림을 열어 수정 화면에 쓰던 내용이 날아간다.
 */
export function useFileDrop(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

  const handlers = {
    onDragEnter: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      // 막지 않으면 브라우저가 그림을 새 탭으로 연다
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
  };
  return { dragging, handlers };
}
