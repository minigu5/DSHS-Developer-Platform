// 대곽나루 주소의 "서울 입구" 상태 문구(2026-11-08). 한국 통신사는 무료 Cloudflare 주소를 LA로 보내 느려서, 대곽나루 허브가
// 학생 주소를 서울로 들어오는 입구(새 계정 Pages 중계)에 자동으로 붙인다. 허브 GET /devplatform/servers 의 edge 를 받아
// 학생에게 왜 그런지 그대로 알린다(사용자 승인 문구 — 바꾸면 server_connection 계획 문서의 Global Constraints 와 맞출 것).

export type NaruEdge = 'queued' | 'pending' | 'seoul' | 'spare' | 'spare_quota'

const EDGES: readonly NaruEdge[] = ['queued', 'pending', 'seoul', 'spare', 'spare_quota']

export const CONNECT_NOTE =
  '주소를 붙이면 한국에서 빨리 열리도록 서울 입구에 연결해요. 이때 인증서를 새로 받느라 1~2분 동안 주소가 안 열릴 수 있어요(서버는 그대로 켜져 있어요).'

export const SEOUL_WHY = '무료 Cloudflare 주소는 한국 통신사가 미국(LA)으로 보내서 느려요. 그래서 서울로 들어가는 입구를 따로 붙여요.'

const PREPARING = '서울 입구 준비 중(약 1~2분)'
const SPARE = '지금은 예비 길(미국 경유)로 열려요'

export function parseEdge(v: unknown): NaruEdge | null {
  return typeof v === 'string' && (EDGES as readonly string[]).includes(v) ? (v as NaruEdge) : null
}

export function edgeNotice(edge: NaruEdge | null): { label: string; detail: string } | null {
  switch (edge) {
    case 'queued':
    case 'pending':
      return { label: PREPARING, detail: SEOUL_WHY }
    case 'seoul':
      return { label: '연결됨 · 서울 입구', detail: SEOUL_WHY }
    case 'spare':
      return { label: SPARE, detail: '조금 느리지만 사이트는 그대로예요. 서울 입구가 정상이 되면 새벽에 자동으로 돌아와요.' }
    case 'spare_quota':
      return {
        label: SPARE,
        detail: '오늘 학생 사이트 전체 요청이 많아서 예비 길로 열려요. 조금 느리지만 사이트는 그대로예요. 오전 9시 이후 자동으로 서울 입구로 돌아와요.',
      }
    default:
      return null
  }
}
