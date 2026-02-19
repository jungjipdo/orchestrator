-- ============================================
-- 007: 기존 공유 데이터 정리
-- user_id가 NULL인 레거시 데이터 삭제
-- (RLS 전환 전에 생성된 데이터)
-- ============================================

-- session_logs는 work_items FK 참조이므로 먼저 삭제
DELETE FROM session_logs WHERE user_id IS NULL;

-- 나머지 테이블
DELETE FROM work_items WHERE user_id IS NULL;
DELETE FROM fixed_events WHERE user_id IS NULL;
DELETE FROM project_deadlines WHERE user_id IS NULL;
DELETE FROM external_apps WHERE user_id IS NULL;
DELETE FROM event_logs WHERE user_id IS NULL;
DELETE FROM projects WHERE user_id IS NULL;
DELETE FROM plans WHERE user_id IS NULL;

-- github_connections는 이미 user_id RLS가 있었으므로 skip
