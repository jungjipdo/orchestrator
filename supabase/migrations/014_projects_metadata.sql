-- ============================================
-- 014: projects 테이블에 metadata JSONB 컬럼 추가
-- Plan과 동일한 detail_plan.sub_tasks[] 패턴 지원
-- ============================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
