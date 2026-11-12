// 대곽나루 서버(Node)가 멈출 때 순서 — 뒤에서 하던 일(포스터 일감 등)을 기다리고, 서버를 닫아 이미 받은 응답을 마무리한 뒤 나간다.
// 서버 닫기는 deploy/naru/preload.js 가 globalThis.__dshsCloseServer 로 넘겨준다(손으로 실행하면 없음). src/instrumentation.ts 가 부른다.

export interface ShutdownDeps {
  drain: () => Promise<number>
  closeServer: (() => Promise<void>) | undefined
  exit: () => void
  log: (message: string) => void
}

export async function shutdownGracefully({ drain, closeServer, exit, log }: ShutdownDeps): Promise<void> {
  const left = await drain()
  if (left > 0) log(`[naru] 못 끝낸 일 ${left}개를 두고 멈춤`)
  if (closeServer) await closeServer()
  exit()
}
