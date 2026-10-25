// 주소 받기 화면의 자동 연결 확인 — 일정 간격으로 `round` 를 반복하는 작은 타이머.
//   - 탭이 숨겨져 있으면 쉰다(회차도 세지 않는다)
//   - 탭이 다시 보이면(`wake`) 바로 한 번 확인한다. 호스트 설정 화면에서 돌아온 순간이 가장 가능성이 높다
//   - `maxRounds` 번 확인하고도 끝나지 않으면 멈추고 `onStop` 을 부른다
// 화면(React)과 분리해 node:test 로 검증한다.

export type PollerOptions = {
  intervalMs: number
  maxRounds: number
  /** `wake` 가 너무 잦아도 이 시간 안에는 다시 확인하지 않는다 */
  minGapMs: number
  isVisible: () => boolean
  round: () => Promise<void>
  onStop: () => void
  now?: () => number
}

export type Poller = { stop: () => void; wake: () => void }

export function startPoller(o: PollerOptions): Poller {
  const now = o.now ?? Date.now
  let stopped = false
  let running = false
  let rounds = 0
  let lastEnd = -Infinity
  let timer: ReturnType<typeof setTimeout> | undefined

  const tick = async (): Promise<void> => {
    if (stopped || running) return
    clearTimeout(timer)
    running = true
    try {
      if (o.isVisible()) {
        rounds++
        await o.round()
        lastEnd = now()
      }
    } catch {
      // 한 회차의 실패가 반복을 끊지 않는다 — 다음 회차에 다시 한다
    } finally {
      running = false
    }
    if (stopped) return
    if (rounds >= o.maxRounds) {
      stopped = true
      o.onStop()
      return
    }
    timer = setTimeout(tick, o.intervalMs)
  }

  void tick()

  return {
    stop() {
      stopped = true
      clearTimeout(timer)
    },
    wake() {
      if (now() - lastEnd < o.minGapMs) return
      void tick()
    },
  }
}
