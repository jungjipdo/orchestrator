-- =============================================
-- 010: github_connections UNIQUE constraint
-- upsert(onConflict: 'user_id')를 위해 필요
-- =============================================

ALTER TABLE github_connections
    ADD CONSTRAINT github_connections_user_id_unique UNIQUE (user_id);
