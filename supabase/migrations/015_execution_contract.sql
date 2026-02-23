-- ============================================
-- 015: agent_tasks에 실행 계약서 + 위험도 필드 추가
-- Harness Engineering H1(Execution Contract) + H3(Risk-tier)
-- ============================================

-- 위험도 등급: low(스타일/텍스트), mid(로직 변경), high(DB/API/보안)
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS risk_tier TEXT DEFAULT 'mid'
    CHECK (risk_tier IN ('low', 'mid', 'high'));

-- 실행 계약서: 허용 경로/명령/예산
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS allowed_paths TEXT[] DEFAULT '{}';
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS allowed_commands TEXT[] DEFAULT '{}';
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS budget_tokens INTEGER;
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS budget_minutes INTEGER;

-- 추가 메타데이터 (확장용)
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS contract_meta JSONB DEFAULT '{}';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_tasks_risk_tier ON agent_tasks(risk_tier);
