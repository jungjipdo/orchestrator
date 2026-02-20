-- ============================================
-- 011: WorkItem 수명주기 컬럼 추가
-- started_at, completed_at, deleted_at, actual_min
-- ============================================

-- 수명주기 타임스탬프
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 실제 소요 시간 (분)
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS actual_min INTEGER;

-- 기존 source_app 컬럼은 이미 존재하므로 건너뜀
-- source_app: 'orchestration' | 'manual' | 'import'

-- 인덱스: soft delete 필터 + 완료 날짜 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_work_items_deleted_at ON work_items (deleted_at);
CREATE INDEX IF NOT EXISTS idx_work_items_completed_at ON work_items (completed_at);
CREATE INDEX IF NOT EXISTS idx_work_items_started_at ON work_items (started_at);
