-- ============================================
-- 013: 3-Tier 계층 구조 (goals 테이블 + work_items.goal_id)
-- Project / Plan 각각 독립 트랙으로 goals 연결
-- ============================================

-- 1. goals 테이블 신규 생성
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,  -- Project 트랙
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,         -- Plan 트랙
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'backlog'
        CHECK (status IN ('backlog', 'active', 'done', 'deferred')),
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    description TEXT,
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- project_id와 plan_id 중 정확히 하나만 존재
    CONSTRAINT goals_parent_xor
        CHECK (
            (project_id IS NOT NULL AND plan_id IS NULL) OR
            (project_id IS NULL AND plan_id IS NOT NULL)
        )
);

-- RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY goals_all_policy ON goals FOR ALL
    USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
CREATE INDEX IF NOT EXISTS idx_goals_plan_id ON goals(plan_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- 2. work_items에 goal_id FK 추가
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS goal_id UUID
    REFERENCES goals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_work_items_goal_id ON work_items(goal_id);
