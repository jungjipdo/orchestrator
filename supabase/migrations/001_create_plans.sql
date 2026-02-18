-- ============================================
-- plans 테이블 — Plan 시스템 (3-Type: task/event/project)
-- metadata JSONB로 타입별 확장 필드 저장
-- ============================================

CREATE TABLE IF NOT EXISTS plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  plan_type   TEXT NOT NULL CHECK (plan_type IN ('task', 'event', 'project')),
  status      TEXT NOT NULL DEFAULT 'backlog'
              CHECK (status IN ('backlog','candidate','active','done','blocked','deferred')),
  priority    TEXT CHECK (priority IN ('low','medium','high','critical')),
  description TEXT,
  due_at      TIMESTAMPTZ,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_plans_type ON plans (plan_type);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans (status);
CREATE INDEX IF NOT EXISTS idx_plans_due_at ON plans (due_at) WHERE due_at IS NOT NULL;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_plans_updated_at();
