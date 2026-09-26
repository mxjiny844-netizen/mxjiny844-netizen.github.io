-- ============================================================
-- EIDEN Partner — PostgreSQL Schema (Supabase)
-- 0001_init.sql
-- 실행: Supabase SQL Editor에 붙여넣거나 `supabase db push`
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- ENUM ----------
create type user_role as enum (
  'ROLE_COMPANY', 'ROLE_SALES', 'ROLE_SALES_ADMIN',
  'ROLE_PARTS', 'ROLE_TECH', 'ROLE_ADMIN'
);
create type company_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type employee_status as enum ('AVAILABLE', 'BUSY', 'AWAY', 'OFF');
create type ticket_kind as enum ('SALES', 'PART', 'AS');
create type sales_type as enum ('ORDER', 'QUOTE', 'STOCK', 'ETC'); -- 발주/견적/재고/기타
create type ticket_status as enum (
  'NEW', 'CHECKING', 'CHAT_RESPONSE', 'CALLBACK',
  'PARTS_CHECK', 'ON_SITE_REQUIRED', 'RESOLVED', 'CLOSED'
);
create type message_kind as enum ('TEXT', 'QUOTE', 'CALLBACK', 'INTERNAL', 'SYSTEM');
create type assign_method as enum ('LOAD_BALANCED', 'ROUND_ROBIN', 'MANUAL');
create type history_action as enum (
  'CREATED', 'ASSIGNED', 'STATUS_CHANGED', 'REPLIED',
  'PHONE_CALL', 'INTERNAL_MEMO', 'RESOLVED', 'CLOSED'
);

-- ---------- 기본 테이블 ----------
create table departments (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,            -- SALES / SALES_ADMIN / PARTS / TECH / ADMIN
  name text not null,                   -- 영업 / 영업관리 / 자재 / 기술 / 관리
  created_at timestamptz default now()
);

create table employees (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,                         -- auth.users 연결(선택)
  name text not null,
  title text,                           -- 부장/과장/대리 ...
  department_id uuid references departments(id),
  role user_role not null,
  status employee_status default 'AVAILABLE',
  phone text,
  email text,
  active boolean default true,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                   -- 업체명
  business_no text,                     -- 사업자번호
  manager text,                         -- 담당자
  phone text,
  email text,
  region text,
  sales_rep_id uuid references employees(id),  -- 담당 영업사원
  status company_status default 'PENDING',
  reject_reason text,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'ROLE_COMPANY',
  name text not null,
  phone text,
  company_id uuid references companies(id),
  employee_id uuid references employees(id),
  created_at timestamptz default now()
);

create table machine_models (
  id uuid primary key default uuid_generate_v4(),
  manufacturer text,                    -- 머신 제조사
  name text not null,                   -- 모델명
  category text not null,               -- 반자동 머신 / CU 라심발리 S15 / 제티노 전자동 / 기타 전자동
  active boolean default true,
  created_at timestamptz default now()
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  model_no text,
  price numeric,
  active boolean default true,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create table parts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                   -- 부품명
  part_no text,                         -- 부품번호
  machine_model_id uuid references machine_models(id),
  price numeric,
  stock_qty integer default 0,
  active boolean default true,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- ---------- 문의 티켓 ----------
create table tickets (
  id uuid primary key default uuid_generate_v4(),
  ticket_no text unique not null,       -- EIDEN-SALES-YYYYMMDD-XXXX
  kind ticket_kind not null,
  sales_type sales_type,                -- kind=SALES 일 때
  company_id uuid references companies(id),
  requester_id uuid references profiles(id),
  -- 접수 정보(거래처 화면 스냅샷)
  company_name text,
  contact_name text,
  contact_phone text,
  region text,
  -- 영업 문의
  product_id uuid references products(id),
  product_name text,
  quantity numeric,
  -- 부품 문의
  part_name text,
  part_no text,
  part_qty integer,
  machine_manufacturer text,
  -- AS
  store_name text,                      -- 점포명
  store_code text,                      -- 점포코드
  machine_model_id uuid references machine_models(id),
  machine_model_name text,
  machine_category text,
  serial_no text,
  error_code text,
  symptom text,
  urgent boolean default false,
  self_resolved_attempt boolean default false, -- 자가진단 시도 후 전환 여부
  -- 공통
  title text,
  content text,
  status ticket_status default 'NEW',
  assignee_id uuid references employees(id),
  department_id uuid references departments(id),
  quote_amount numeric,
  callback_at timestamptz,
  created_at timestamptz default now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  deleted_at timestamptz
);

create table ticket_messages (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid references tickets(id) on delete cascade,
  author_id uuid,                       -- profiles.id or employees.id
  author_name text,
  kind message_kind default 'TEXT',
  body text,
  quote_amount numeric,
  callback_at timestamptz,
  created_at timestamptz default now()
);

create table ticket_attachments (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid references tickets(id) on delete cascade,
  message_id uuid references ticket_messages(id) on delete set null,
  file_url text not null,               -- Supabase Storage URL or data URL
  file_name text,
  file_type text,                       -- image / video / etc
  created_at timestamptz default now()
);

create table ticket_history (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid references tickets(id) on delete cascade,
  actor_name text,
  action history_action not null,
  detail text,
  visible_to_company boolean default true,  -- 내부메모는 false
  created_at timestamptz default now()
);

-- ---------- AS 오류코드 / 자가진단 ----------
create table error_codes (
  id uuid primary key default uuid_generate_v4(),
  machine_category text,                -- 적용 머신 분류(없으면 공통)
  code text not null,                   -- 오류번호 (예: 100)
  title text not null,                  -- 오류 설명
  expected_cause text,                  -- 예상 원인
  customer_check text,                  -- 고객 확인사항
  action1 text,
  action2 text,
  action3 text,
  caution text,                         -- 주의사항
  active boolean default true,
  created_at timestamptz default now(),
  unique(machine_category, code)
);

create table self_resolution_logs (
  id uuid primary key default uuid_generate_v4(),
  error_code_id uuid references error_codes(id),
  company_id uuid references companies(id),
  machine_category text,
  payload jsonb,                        -- 사용자가 입력한 접수정보 스냅샷
  resolved boolean not null,
  ticket_id uuid references tickets(id), -- 실패 시 자동 생성된 AS 티켓
  created_at timestamptz default now()
);

create table faqs (
  id uuid primary key default uuid_generate_v4(),
  category text,
  question text not null,
  answer text not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- ---------- 이벤트 / 공지 ----------
create table events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text,
  image_url text,
  product_id uuid references products(id),
  condition text,                       -- 행사조건 (10+1 등)
  start_date date,
  end_date date,
  active boolean default true,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create table notices (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text,
  pinned boolean default false,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- ---------- 알림 / 배정 / 감사 ----------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  target_role user_role,                -- 역할 기반 알림(선택)
  company_id uuid references companies(id),
  employee_id uuid references employees(id),
  title text not null,
  body text,
  link text,                            -- 앱 내 이동 경로
  read boolean default false,
  created_at timestamptz default now()
);

create table assignment_logs (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid references tickets(id) on delete cascade,
  employee_id uuid references employees(id),
  method assign_method not null,
  created_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_name text,
  action text not null,
  entity text,
  entity_id text,
  detail jsonb,
  created_at timestamptz default now()
);

-- ---------- 설정 ----------
create table settings (
  key text primary key,
  value jsonb not null
);
insert into settings(key, value) values
  ('assignment_mode', '"LOAD_BALANCED"');

-- ---------- 문의번호 시퀀스 ----------
create sequence ticket_no_seq start 1;

create or replace function gen_ticket_no(p_kind ticket_kind)
returns text language plpgsql as $$
declare
  v_prefix text;
begin
  v_prefix := case p_kind
    when 'SALES' then 'EIDEN-SALES-'
    when 'PART'  then 'EIDEN-PART-'
    when 'AS'    then 'EIDEN-AS-'
  end;
  return v_prefix || to_char(now(), 'YYYYMMDD') || '-' ||
         lpad(nextval('ticket_no_seq')::text, 4, '0');
end $$;

-- ---------- 인덱스 ----------
create index idx_tickets_company on tickets(company_id) where deleted_at is null;
create index idx_tickets_status on tickets(status) where deleted_at is null;
create index idx_tickets_assignee on tickets(assignee_id) where deleted_at is null;
create index idx_tickets_kind on tickets(kind);
create index idx_tickets_created on tickets(created_at);
create index idx_error_codes_code on error_codes(code);
create index idx_notifications_company on notifications(company_id, read);

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table companies enable row level security;
alter table departments enable row level security;
alter table employees enable row level security;
alter table products enable row level security;
alter table parts enable row level security;
alter table machine_models enable row level security;
alter table tickets enable row level security;
alter table ticket_messages enable row level security;
alter table ticket_attachments enable row level security;
alter table ticket_history enable row level security;
alter table error_codes enable row level security;
alter table self_resolution_logs enable row level security;
alter table faqs enable row level security;
alter table events enable row level security;
alter table notices enable row level security;
alter table notifications enable row level security;
alter table assignment_logs enable row level security;
alter table audit_logs enable row level security;
alter table settings enable row level security;

-- 헬퍼: 내 프로필
create or replace function my_profile()
returns profiles language sql security definer stable as $$
  select * from profiles where id = auth.uid()
$$;

create or replace function is_staff()
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role <> 'ROLE_COMPANY'
  )
$$;

create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'ROLE_ADMIN'
  )
$$;

-- profiles: 본인 것만 조회/수정, 직원/관리자는 전체 조회
create policy p_profiles_self on profiles for select
  using (id = auth.uid() or is_staff());
create policy p_profiles_update on profiles for update
  using (id = auth.uid() or is_admin());

-- companies: 거래처는 자기 회사만, 직원은 전체, 승인은 관리자/영업관리
create policy p_companies_select on companies for select
  using (is_staff() or id = (select company_id from my_profile()));
create policy p_companies_insert on companies for insert
  with check (true);  -- 가입 신청은 누구나(승인 전)
create policy p_companies_update on companies for update
  using (is_staff());

-- 읽기 전용 마스터 데이터: 로그인 사용자 전체 조회 가능
create policy p_departments_read on departments for select using (auth.role() = 'authenticated');
create policy p_employees_read on employees for select using (auth.role() = 'authenticated');
create policy p_products_read on products for select using (auth.role() = 'authenticated');
create policy p_parts_read on parts for select using (auth.role() = 'authenticated');
create policy p_machines_read on machine_models for select using (auth.role() = 'authenticated');
create policy p_error_codes_read on error_codes for select using (auth.role() = 'authenticated');
create policy p_faqs_read on faqs for select using (auth.role() = 'authenticated');
create policy p_events_read on events for select using (auth.role() = 'authenticated');
create policy p_notices_read on notices for select using (auth.role() = 'authenticated');

-- 마스터 데이터 쓰기: 직원/관리자
create policy p_departments_write on departments for all using (is_admin());
create policy p_employees_write on employees for all using (is_admin());
create policy p_products_write on products for all using (is_staff());
create policy p_parts_write on parts for all using (is_staff());
create policy p_machines_write on machine_models for all using (is_staff());
create policy p_error_codes_write on error_codes for all using (is_staff());
create policy p_faqs_write on faqs for all using (is_staff());
create policy p_events_write on events for all using (is_staff());
create policy p_notices_write on notices for all using (is_staff());

-- tickets: 거래처는 자기 회사 티켓만, 직원은 전체(부서 필터는 앱에서)
create policy p_tickets_select on tickets for select
  using (is_staff() or company_id = (select company_id from my_profile()));
create policy p_tickets_insert on tickets for insert
  with check (is_staff() or company_id = (select company_id from my_profile()));
create policy p_tickets_update on tickets for update
  using (is_staff() or company_id = (select company_id from my_profile()));

-- 메시지/첨부/이력: 티켓 접근 가능한 사용자만
create policy p_messages_select on ticket_messages for select
  using (is_staff() or exists(
    select 1 from tickets t where t.id = ticket_id
      and t.company_id = (select company_id from my_profile())));
create policy p_messages_insert on ticket_messages for insert
  with check (is_staff() or exists(
    select 1 from tickets t where t.id = ticket_id
      and t.company_id = (select company_id from my_profile())));
-- 내부메모(INTERNAL)는 앱에서 거래처에게 숨김 + RLS 이중 방어
create policy p_messages_internal_guard on ticket_messages for select
  using (kind <> 'INTERNAL' or is_staff());

create policy p_attachments_all on ticket_attachments for all
  using (is_staff() or exists(
    select 1 from tickets t where t.id = ticket_id
      and t.company_id = (select company_id from my_profile())));

create policy p_history_select on ticket_history for select
  using (is_staff() or (visible_to_company and exists(
    select 1 from tickets t where t.id = ticket_id
      and t.company_id = (select company_id from my_profile()))));
create policy p_history_insert on ticket_history for insert
  with check (auth.role() = 'authenticated');

create policy p_selfres_insert on self_resolution_logs for insert
  with check (auth.role() = 'authenticated');
create policy p_selfres_select on self_resolution_logs for select
  using (is_staff() or company_id = (select company_id from my_profile()));

create policy p_notifications_select on notifications for select
  using (is_staff() or company_id = (select company_id from my_profile()));
create policy p_notifications_write on notifications for all
  using (auth.role() = 'authenticated');

create policy p_assignment_read on assignment_logs for select using (is_staff());
create policy p_assignment_write on assignment_logs for insert with check (is_staff());
create policy p_audit_read on audit_logs for select using (is_admin());
create policy p_audit_write on audit_logs for insert with check (auth.role() = 'authenticated');
create policy p_settings_read on settings for select using (auth.role() = 'authenticated');
create policy p_settings_write on settings for all using (is_admin());

-- ---------- Storage ----------
-- 버킷: attachments (티켓 첨부 사진/동영상), public-read 또는 signed URL 정책은 운영 시 결정
-- insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true);
