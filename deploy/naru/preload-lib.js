// /usr/local/lib/dshs/preload-lib.js — preload.js 의 순수 함수(시험: node --test deploy/naru/test/)
'use strict'

/**
 * `next start` 에 붙일 -H·-p. request.url 을 https://<공개 호스트>/… 로 만들려는 값이다(실제로 여는 포트가 아님, preload.js 2).
 * NEXT_PUBLIC_SITE_URL 에서 호스트만 뽑는다 — 끝에 / 가 붙어도 깨지지 않게(2026-11-11 리뷰). 없거나 https 가 아니면 던져서 켜지지 않게.
 */
function nextStartArgs(siteUrl) {
  const url = new URL(siteUrl || 'invalid:')
  if (url.protocol !== 'https:' || !url.hostname) throw new Error(`NEXT_PUBLIC_SITE_URL 이 https 주소가 아니에요: ${siteUrl}`)
  return ['-H', url.hostname, '-p', '443']
}

module.exports = { nextStartArgs }
