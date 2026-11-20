// 올린 SVG 에 스크립트가 들어 있는지(2026-11-20 감사). 사이트는 <img>로만 보여 줘 실행되지 않지만,
// Cloudinary 원본 주소를 직접 열면 실행되므로 아예 받지 않는다. 정상 아이콘에는 이런 것이 없다.
const ACTIVE_SVG = /<script\b|<foreignObject\b|\bon[a-z]+\s*=|javascript:|<iframe\b|<embed\b|<object\b/i

export function hasActiveSvgContent(svg: string): boolean {
  return ACTIVE_SVG.test(svg)
}
