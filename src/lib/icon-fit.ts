// 프로젝트 아이콘 맞춤값(projects.icon_fit) — 화면(ProjectIcon)이 읽는 쪽.
// 아이콘 그림이 자기 바탕(둥근 네모)을 갖고 모서리·바깥이 투명하면, 우리 틀의 흰 바탕이 모서리 실선·흰 테두리로 비쳤다(2026-11-08).
// 서버가 저장·매일 동기화 때 그림을 한 번 살펴(icon-fit-analyze.ts) 바탕색(bg)과 꽉 채울 영역(box)을 적어 둔다.
// src = 분석한 icon_url — 아이콘이 바뀌면 값이 저절로 무효가 된다(다시 분석할 때까지 예전처럼 흰 바탕).

export interface IconFit {
  src: string;
  /** 흰색 대신 깔 바탕색 (#rrggbb) */
  bg?: string;
  /** 꽉 채울 영역 — 그림 크기에 대한 비율 [x, y, 크기] (정사각형) */
  box?: [number, number, number];
}

const HEX = /^#[0-9a-f]{6}$/;

/** DB 값(사용자 키로도 쓸 수 있는 칸이라 믿지 않는다)을 검사해 지금 아이콘에 맞는 것만 돌려준다 */
export function parseIconFit(value: unknown, src: string | null | undefined): IconFit | null {
  if (!src || !value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.src !== src) return null;
  const fit: IconFit = { src };
  if (typeof v.bg === 'string' && HEX.test(v.bg)) fit.bg = v.bg;
  if (Array.isArray(v.box) && v.box.length === 3 && v.box.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    const [x, y, size] = v.box as number[];
    if (size >= 0.3 && size <= 1 && x >= 0 && y >= 0 && x + size <= 1.001 && y + size <= 1.001) fit.box = [x, y, size];
  }
  return fit;
}
