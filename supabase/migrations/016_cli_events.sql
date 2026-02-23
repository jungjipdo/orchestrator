-- ============================================
-- 016: CLI 이벤트 수신 테이블
-- orchx CLI → Orchestrator 서버 통신 + 멱등성(idempotency) 보장
-- ============================================

CREATE TABLE IF NOT EXISTS cli_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,           -- 클라이언트 UUID (멱등성 키)
    event_type TEXT NOT NULL,                -- 'file.changed', 'test.completed', 'contract.violation' 등
    payload JSONB DEFAULT '{}',
    session_id TEXT,                         -- orchx session_id 참조
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'processed', 'failed')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- RLS (임시: 전체 허용 — Auth 연동 후 user 기반 전환)
ALTER TABLE cli_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY cli_events_all ON cli_events FOR ALL USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_cli_events_event_id ON cli_events(event_id);
CREATE INDEX IF NOT EXISTS idx_cli_events_status ON cli_events(status);
CREATE INDEX IF NOT EXISTS idx_cli_events_session ON cli_events(session_id);
CREATE INDEX IF NOT EXISTS idx_cli_events_type ON cli_events(event_type);
