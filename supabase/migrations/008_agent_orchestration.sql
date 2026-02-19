-- ============================================
-- 008_agent_orchestration.sql
-- 에이전트 오케스트레이션 핵심 테이블
-- ============================================

-- === agent_connections ===
-- 사용자가 등록한 AI 에이전트 (Cursor, Antigravity, Codex 등)

CREATE TABLE agent_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    agent_type TEXT NOT NULL DEFAULT 'custom',
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'registered',
    integration_level TEXT NOT NULL DEFAULT 'L1',
    last_activity_at TIMESTAMPTZ,
    agent_meta JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agent_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent_connections"
    ON agent_connections FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_agent_connections_user ON agent_connections(user_id);
CREATE INDEX idx_agent_connections_project ON agent_connections(project_id);

-- === agent_tasks ===
-- 에이전트에게 할당된 개별 작업 단위 (Focus Session)

CREATE TABLE agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_connection_id UUID NOT NULL REFERENCES agent_connections(id) ON DELETE CASCADE,
    work_item_id UUID,
    instruction TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent_tasks"
    ON agent_tasks FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX idx_agent_tasks_connection ON agent_tasks(agent_connection_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);

-- === run_results ===
-- 에이전트 작업 실행 결과

CREATE TABLE run_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL,
    summary TEXT,
    artifacts JSONB NOT NULL DEFAULT '[]',
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE run_results ENABLE ROW LEVEL SECURITY;

-- run_results는 직접 user_id가 없으므로, agent_tasks를 통해 RLS 적용
CREATE POLICY "Users manage own run_results"
    ON run_results FOR ALL
    USING (agent_task_id IN (SELECT id FROM agent_tasks WHERE user_id = auth.uid()))
    WITH CHECK (agent_task_id IN (SELECT id FROM agent_tasks WHERE user_id = auth.uid()));

CREATE INDEX idx_run_results_task ON run_results(agent_task_id);
CREATE INDEX idx_run_results_outcome ON run_results(outcome);
