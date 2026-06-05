// SSRF 방어: 외부 사용자 입력 URL을 서버에서 fetch 하기 전에 호출.
// 1) 스킴은 http/https 만 허용
// 2) 호스트네임/해석 IP 가 사설망·루프백·링크로컬·클라우드 메타데이터 가 아닌지 검증

import { lookup } from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
]);

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function inV4Range(ip: string, cidr: string): boolean {
  const [base, prefixStr] = cidr.split('/');
  const prefix = Number(prefixStr);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

function isPrivateOrReservedV4(ip: string): boolean {
  const ranges = [
    '0.0.0.0/8',
    '10.0.0.0/8',
    '100.64.0.0/10',
    '127.0.0.0/8',
    '169.254.0.0/16',
    '172.16.0.0/12',
    '192.0.0.0/24',
    '192.0.2.0/24',
    '192.168.0.0/16',
    '198.18.0.0/15',
    '198.51.100.0/24',
    '203.0.113.0/24',
    '224.0.0.0/4',
    '240.0.0.0/4',
    '255.255.255.255/32',
  ];
  return ranges.some((r) => inV4Range(ip, r));
}

function isPrivateOrReservedV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('ff')) return true; // multicast
  if (lower.startsWith('::ffff:')) {
    const v4 = lower.slice(7);
    if (net.isIPv4(v4)) return isPrivateOrReservedV4(v4);
  }
  return false;
}

export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateOrReservedV4(ip);
  if (net.isIPv6(ip)) return isPrivateOrReservedV6(ip);
  return true;
}

export type SsrfCheck =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

export async function assertSafePublicUrl(rawUrl: string): Promise<SsrfCheck> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid url' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'scheme not allowed' };
  }

  const host = url.hostname.toLowerCase();
  if (!host) return { ok: false, reason: 'empty host' };
  if (BLOCKED_HOSTNAMES.has(host)) return { ok: false, reason: 'blocked host' };

  // 호스트가 이미 IP 리터럴인 경우 즉시 검증
  const stripped = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  if (net.isIP(stripped)) {
    if (isBlockedIp(stripped)) return { ok: false, reason: 'private or reserved ip' };
    return { ok: true, url };
  }

  // DNS 해석 — 모든 결과가 공인 IP 여야 통과
  try {
    const results = await lookup(host, { all: true, verbatim: true });
    if (results.length === 0) return { ok: false, reason: 'no dns result' };
    for (const r of results) {
      if (isBlockedIp(r.address)) return { ok: false, reason: 'resolves to private ip' };
    }
  } catch {
    return { ok: false, reason: 'dns lookup failed' };
  }

  return { ok: true, url };
}
