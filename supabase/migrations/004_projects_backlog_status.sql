-- =============================================
-- projects 테이블 status 필드에 'backlog' 추가
-- 기본값도 'backlog'으로 변경
-- =============================================

-- 1. 기존 check constraint 제거
alter table projects drop constraint if exists projects_status_check;

-- 2. 새 check constraint 추가 (backlog 포함)
alter table projects add constraint projects_status_check 
  check (status in ('backlog', 'active', 'archived', 'completed'));

-- 3. 기본값 변경
alter table projects alter column status set default 'backlog';
