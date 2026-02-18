-- ============================================
-- github_connections — GitHub App 연결 정보
-- 유저별 installation + access_token 저장
-- ============================================

create table if not exists github_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  installation_id bigint not null,
  github_username text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  connected_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table github_connections enable row level security;
create policy "Users manage own connections"
  on github_connections for all using (user_id = auth.uid());

-- Index
create index if not exists idx_github_connections_user on github_connections(user_id);

-- updated_at trigger
create or replace trigger set_github_connections_updated_at
  before update on github_connections
  for each row execute function update_updated_at();
