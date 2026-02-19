-- ============================================
-- 006: user_id 추가 + RLS 정책 전환
-- 모든 테이블에 user_id 컬럼 추가 후
-- allow_all → user_id = auth.uid() 정책으로 교체
-- ============================================

-- === 1. user_id 컬럼 추가 ===

ALTER TABLE work_items
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE fixed_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE project_deadlines
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE session_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE external_apps
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE event_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- plans 테이블 (001_create_plans에서 생성)
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- === 2. 기존 allow_all 정책 삭제 ===

DROP POLICY IF EXISTS "allow_all_work_items" ON work_items;
DROP POLICY IF EXISTS "allow_all_fixed_events" ON fixed_events;
DROP POLICY IF EXISTS "allow_all_project_deadlines" ON project_deadlines;
DROP POLICY IF EXISTS "allow_all_session_logs" ON session_logs;
DROP POLICY IF EXISTS "allow_all_external_apps" ON external_apps;
DROP POLICY IF EXISTS "allow_all_event_logs" ON event_logs;
DROP POLICY IF EXISTS "Allow all access" ON projects;

-- === 3. user_id 기반 RLS 정책 생성 ===

-- work_items
CREATE POLICY "Users manage own work_items"
  ON work_items FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- fixed_events
CREATE POLICY "Users manage own fixed_events"
  ON fixed_events FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- project_deadlines
CREATE POLICY "Users manage own project_deadlines"
  ON project_deadlines FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- session_logs
CREATE POLICY "Users manage own session_logs"
  ON session_logs FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- external_apps
CREATE POLICY "Users manage own external_apps"
  ON external_apps FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- event_logs
CREATE POLICY "Users manage own event_logs"
  ON event_logs FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- projects
CREATE POLICY "Users manage own projects"
  ON projects FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- plans
CREATE POLICY "Users manage own plans"
  ON plans FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- === 4. user_id 인덱스 ===

CREATE INDEX IF NOT EXISTS idx_work_items_user_id ON work_items(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_events_user_id ON fixed_events(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);
