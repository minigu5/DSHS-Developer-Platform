// AI 가 만든 HTML 을 저장하기 전에 위험한 것을 걷어낸다. Workers 에는 DOMParser 가 없어 정규식으로 가볍게 —
// 최종 방어는 sandbox iframe(스크립트·same-origin 없음) + srcdoc CSP(document.ts).

const FONT_LINK = /^https:\/\/fonts\.googleapis\.com\//i

export function sanitizePosterHtml(html: string): string {
  return (
    html
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<script\b[^>]*>/gi, '')
      .replace(/<(iframe|object|embed|form)\b[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<\/?(iframe|object|embed|form|base)\b[^>]*>/gi, '')
      .replace(/<meta\b[^>]*http-equiv[^>]*>/gi, '')
      .replace(/<link\b[^>]*>/gi, (tag) => {
        const href = tag.match(/\bhref\s*=\s*["']?([^"'\s>]+)/i)?.[1] ?? ''
        return FONT_LINK.test(href) ? tag : ''
      })
      // on* 이벤트 속성(따옴표 " ' 없음 모두)
      .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      // javascript: 로 시작하는 URL 속성
      .replace(/\s+(href|src|action|xlink:href|formaction)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]*)/gi, '')
  )
}

export function hasArtSlot(html: string): boolean {
  return /<img\b[^>]*\bsrc\s*=\s*(["'])ART\1/i.test(html)
}
