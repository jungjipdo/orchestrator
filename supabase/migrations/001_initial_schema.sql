-- ============================================
-- Orchestrator — Initial Schema (001)
-- 6개 테이블: work_items, fixed_events, project_deadlines,
--             session_logs, external_apps, event_logs
-- ============================================

-- === 1. work_items ===
-- 핵심 작업 엔티티 (상태: backlog → candidate → active → done | blocked | deferred)

CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'candidate', 'active', 'done', 'blocked', 'deferred')),
  next_action TEXT,
  estimate_min INTEGER,
  energy TEXT CHECK (energy IN ('high', 'medium', 'low')),
  due_at TIMESTAMPTZ,
  source_app TEXT,
  source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_items_updated_at
  BEFORE UPDATE ON work_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- === 2. fixed_events ===
-- 고정 일정 (Hard Event: 약속, 미팅, 마감)

CREATE TABLE IF NOT EXISTS fixed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  importance TEXT NOT NULL DEFAULT 'medium'
    CHECK (importance IN ('critical', 'high', 'medium', 'low')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === 3. project_deadlines ===
-- 프로젝트 마감 + 마일스톤

CREATE TABLE IF NOT EXISTS project_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  milestone TEXT NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === 4. session_logs ===
-- 작업 세션 기록 (/focus → /close)

CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  result TEXT CHECK (result IN ('done', 'partial', 'blocked')),
  done_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === 5. external_apps ===
-- 외부 앱 연동 정보

CREATE TABLE IF NOT EXISTS external_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  deep_link_pattern TEXT,
  sync_mode TEXT NOT NULL DEFAULT 'read_only'
    CHECK (sync_mode IN ('read_only', 'manual', 'approved_write')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === 6. event_logs ===
-- 이벤트 파이프라인 로그 (trigger → classify → propose → apply → log)

CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  actor TEXT NOT NULL DEFAULT 'system'
    CHECK (actor IN ('user', 'system', 'ai')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === RLS 활성화 ===
-- 개인용 프로젝트지만 RLS 활성화 후 permissive 정책 적용 (보안 기본)

ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- 모든 테이블에 public 전체 접근 허용 (개인용, Planfit과 동일 패턴)
CREATE POLICY "allow_all_work_items" ON work_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_fixed_events" ON fixed_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_project_deadlines" ON project_deadlines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_session_logs" ON session_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_external_apps" ON external_apps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_event_logs" ON event_logs FOR ALL USING (true) WITH CHECK (true);

-- === 인덱스 ===

CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_due_at ON work_items(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX idx_work_items_project_id ON work_items(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_fixed_events_start_at ON fixed_events(start_at);
CREATE INDEX idx_session_logs_work_item_id ON session_logs(work_item_id);
CREATE INDEX idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_triggered_at ON event_logs(triggered_at);
