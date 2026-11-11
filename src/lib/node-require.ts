// Node 전용 패키지(sharp·undici)를 실행할 때 불러온다 — 그냥 import 하면 OpenNext 가 Worker 묶음에도 넣어
// gzip 218KB 가 늘었다(2026-11-11, 무료 한도 3MB). 대곽나루 서버(next start)는 릴리스 폴더의 node_modules 에서 찾는다.
// 타입은 `import type` 으로만 가져올 것(지워지므로 묶음에 안 들어감). Worker 에서는 부르지 않는다.
export async function nodeRequire<T>(id: string): Promise<T> {
  const { createRequire } = await import('node:module')
  return createRequire(`${process.cwd()}/package.json`)(id) as T
}
