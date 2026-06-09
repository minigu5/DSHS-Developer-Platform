-- reviews 테이블의 rating 컬럼을 NULL 허용으로 변경
-- 댓글만 남기고 별점을 선택하지 않을 수 있게 함

ALTER TABLE public.reviews
  ALTER COLUMN rating DROP NOT NULL;

-- 기존 CHECK 제약 제거 후 NULL 허용 버전으로 교체
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_rating_check;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_rating_check
    CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));
