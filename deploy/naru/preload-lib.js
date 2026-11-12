// /usr/local/lib/dshs/preload-lib.js — preload.js 의 순수 함수(시험: node --test deploy/naru/test/)
'use strict'
const crypto = require('crypto')

/**
 * `next start` 에 붙일 -H·-p. request.url 을 https://<공개 호스트>/… 로 만들려는 값이다(실제로 여는 포트가 아님, preload.js 2).
 * NEXT_PUBLIC_SITE_URL 에서 호스트만 뽑는다 — 끝에 / 가 붙어도 깨지지 않게(2026-11-11 리뷰). 없거나 https 가 아니면 던져서 켜지지 않게.
 */
function nextStartArgs(siteUrl) {
  const url = new URL(siteUrl || 'invalid:')
  if (url.protocol !== 'https:' || !url.hostname) throw new Error(`NEXT_PUBLIC_SITE_URL 이 https 주소가 아니에요: ${siteUrl}`)
  return ['-H', url.hostname, '-p', '443']
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

/**
 * 서울 입구(relay/lib/forward.js)를 거치지 않은 바깥 요청인가 — 그러면 공개 주소로 돌려보낸다(2026-11-12 보안 점검).
 * 원 주소(dshs2.dshs.dev)로 직접 와서 앱을 다른 출처로 쓰거나 입구를 건너뛰고 부하를 주는 길을 막는다.
 * 서버 안(루프백 — 배포 스크립트의 /login 확인 등)과 서버에 키가 없을 때(시험)는 그대로.
 */
function shouldRedirectToSite({ relayKey, headerKey, remoteAddress }) {
  if (!relayKey || LOOPBACK.has(remoteAddress)) return false
  if (typeof headerKey !== 'string' || headerKey.length !== relayKey.length) return true
  return !crypto.timingSafeEqual(Buffer.from(headerKey), Buffer.from(relayKey))
}

module.exports = { nextStartArgs, shouldRedirectToSite }
