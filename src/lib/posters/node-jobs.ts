// 대곽나루 서버(Node)에서 응답 뒤에도 이어 갈 일(포스터 AI 일감·걸 PNG 찍기). Worker 의 Cloudflare Queues·ctx.waitUntil 대신.
// Node 는 프로세스가 살아 있는 동안 일이 끝까지 가므로 탭을 닫아도 된다. 배포로 멈출 때만 문제라
// src/instrumentation.ts 의 SIGTERM 처리가 drainBackgroundJobs 로 기다린다(못 끝낸 포스터 일감은 settlePosterJob 이 막힘 처리·횟수 반환).

const running = new Set<Promise<void>>()

export function runInBackground(name: string, job: () => Promise<unknown>): void {
  const task: Promise<void> = Promise.resolve()
    .then(job)
    .then(
      () => undefined,
      (e) => console.error(`[naru] 뒤에서 하던 일 실패(${name})`, String(e).slice(0, 200)),
    )
    .finally(() => running.delete(task))
  running.add(task)
}

/** 남은 일이 끝나거나 timeoutMs 가 지나면 돌아온다. 끝나지 못한 개수. 기다리는 동안 새로 들어온 일도 기다린다(멈추는 중에도 요청을 받으므로). */
export async function drainBackgroundJobs(timeoutMs: number): Promise<number> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs)
  })
  while (running.size > 0) {
    if ((await Promise.race([Promise.allSettled([...running]), deadline])) === 'timeout') break
  }
  clearTimeout(timer)
  return running.size
}
