-- ============================================
-- plans 테이블 — plan_type에 'fixed' 추가
-- 반복/고정 일정 지원
-- ============================================

-- 1. 기존 check constraint 제거
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_plan_type_check;

-- 2. 새 check constraint 추가 (fixed 포함)
ALTER TABLE plans ADD CONSTRAINT plans_plan_type_check
  CHECK (plan_type IN ('task', 'event', 'fixed', 'project'));
