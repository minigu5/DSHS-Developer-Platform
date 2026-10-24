// OpenNext(Cloudflare Workers) 캐시 설정.
// 페이지가 모두 Supabase 쿠키를 읽어 요청마다 그려지고(ƒ), 미리 만든 페이지는 정적(○) 4개뿐이라
// ISR용 R2·대기열·태그 캐시 없이 정적 자산 캐시(읽기 전용)만 쓴다.
// 나중에 쿠키 없는 ISR 페이지를 만들면 r2-incremental-cache + do-queue + d1-next-tag-cache로 바꿀 것.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
