-- ============================================================
-- EIDEN Partner — 0003: profiles 가입 정책 + Storage 버킷
-- ============================================================

-- 회원가입 직후 본인 프로필 생성 허용 (앱/스크립트가 auth.uid()로 insert)
create policy p_profiles_insert on profiles for insert
  with check (id = auth.uid());

-- 첨부파일 버킷 (사진/동영상)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- 로그인 사용자 업로드/조회 허용
create policy p_attach_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments');
create policy p_attach_read on storage.objects for select
  using (bucket_id = 'attachments');
