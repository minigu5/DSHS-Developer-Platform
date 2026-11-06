-- 2026-11-06 포스터 그림 일감의 art_local 횟수를 한 번만 돌려주기(최종 리뷰 Important 1).
-- 정리(settle)·취소·실패가 겹치거나, 글만 고치는 요청이 이미 정리된 일감 id 를 포스터에 다시 써도
-- 이 칸을 조건부로 채운 요청만 release_ai_usage 를 부른다(src/lib/posters/art-jobs.ts releaseJobUsage).
ALTER TABLE public.poster_art_jobs ADD COLUMN usage_released_at timestamptz;
