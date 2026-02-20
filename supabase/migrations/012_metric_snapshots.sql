-- ============================================
-- 012: Metric Snapshots 테이블
-- 9종 운영 지표를 일/주 단위로 집계 저장
-- ============================================

CREATE TABLE IF NOT EXISTS metric_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID,                              -- NULL이면 전체 집계
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
    period_start DATE NOT NULL,

    -- 핵심 지표
    throughput INTEGER NOT NULL DEFAULT 0,         -- 완료 건수
    avg_cycle_time_min REAL,                       -- 평균 사이클 타임 (분)
    avg_lead_time_min REAL,                        -- 평균 리드 타임 (분)
    estimate_accuracy REAL,                        -- actual/estimate 비율
    wip_count INTEGER NOT NULL DEFAULT 0,          -- 기간 말 active 건수
    aging_wip_count INTEGER NOT NULL DEFAULT 0,    -- 3일+ active 건수
    blocked_count INTEGER NOT NULL DEFAULT 0,      -- 기간 중 blocked 발생
    created_count INTEGER NOT NULL DEFAULT 0,      -- 기간 중 생성
    deleted_count INTEGER NOT NULL DEFAULT 0,      -- 기간 중 삭제
    reopen_count INTEGER NOT NULL DEFAULT 0,       -- 기간 중 재오픈

    -- 컨텍스트
    top_source TEXT,                               -- 가장 많은 source
    ai_model_distribution JSONB DEFAULT '{}',      -- 모델별 사용 비율

    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, project_id, period_type, period_start)
);

-- RLS
ALTER TABLE metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY metric_snapshots_user_policy ON metric_snapshots
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_lookup
    ON metric_snapshots (user_id, period_type, period_start DESC);
