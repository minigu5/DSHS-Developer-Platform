-- 프로젝트 종류 다중 선택: projects.type(text) → projects.types(text[])
-- 웹사이트·앱·확장프로그램 등을 한 프로젝트에 여러 개 고를 수 있게 한다.
--
-- 실행 순서 (중요):
--   1단계 → 코드 배포 → 2단계
--   1단계를 먼저 실행해야 새 코드가 types 컬럼을 읽을 수 있다.
--   type 컬럼은 2단계 전까지 남겨 두므로 배포 전 옛 코드도 계속 동작한다.

-- ───────── 1단계: 코드 배포 전에 실행 ─────────

-- 1. types 컬럼 추가 + 기존 값을 1칸짜리 배열로 옮김
ALTER TABLE projects ADD COLUMN IF NOT EXISTS types text[] NOT NULL DEFAULT '{}';
UPDATE projects SET types = ARRAY[type] WHERE cardinality(types) = 0 AND type IS NOT NULL;

-- 2. 새 코드는 type을 쓰지 않으므로 NOT NULL 해제
ALTER TABLE projects ALTER COLUMN type DROP NOT NULL;


-- ───────── 2단계: 코드 배포 후에 실행 ─────────

-- 3. 배포 사이에 옛 코드로 올라온 프로젝트 보정
UPDATE projects SET types = ARRAY[type] WHERE cardinality(types) = 0 AND type IS NOT NULL;

-- 4. 종류는 최소 1개
ALTER TABLE projects ADD CONSTRAINT projects_types_not_empty CHECK (cardinality(types) >= 1);

-- 5. 옛 컬럼 삭제
ALTER TABLE projects DROP COLUMN type;
