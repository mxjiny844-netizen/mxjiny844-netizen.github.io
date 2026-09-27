-- ============================================================
-- EIDEN Partner — 0004: 거래처 문의 접수 시 자동배정 로그 RLS 수정
-- ============================================================
-- 거래처가 문의(티켓)를 접수하면 앱이 자동배정 결과를 assignment_logs에 기록한다.
-- 기존 정책은 is_staff()만 insert 가능해 거래처 접수가 RLS 오류로 실패했다.
-- 배정 로그는 시스템 기록이므로 로그인 사용자 누구나 insert 허용(조회는 직원 전용 유지).

drop policy if exists p_assignment_write on assignment_logs;
create policy p_assignment_write on assignment_logs for insert
  with check (auth.role() = 'authenticated');
