-- =============================================
-- projects 테이블 — GitHub 레포 기반 프로젝트
-- plans와 독립적으로 관리
-- =============================================

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  
  -- GitHub 레포 정보
  repo_id bigint not null,
  repo_name text not null,          -- e.g. "orchestrator"
  repo_full_name text not null,     -- e.g. "jungjipdo/orchestrator"
  repo_url text not null,           -- e.g. "https://github.com/jungjipdo/orchestrator"
  description text,
  default_branch text default 'main',
  language text,
  is_private boolean default false,
  
  -- 프로젝트 상태
  status text default 'backlog' check (status in ('backlog', 'active', 'archived', 'completed')),
  
  -- 타임스탬프
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- 중복 방지
  constraint projects_repo_id_unique unique (repo_id)
);

-- RLS (임시: 전체 허용 — Auth 도입 후 user_id 기반으로 전환)
alter table projects enable row level security;
create policy "Allow all access" on projects for all using (true);

-- updated_at 자동 갱신
create or replace function update_projects_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_projects_updated_at();

-- 인덱스
create index if not exists idx_projects_status on projects(status);
create index if not exists idx_projects_repo_id on projects(repo_id);
