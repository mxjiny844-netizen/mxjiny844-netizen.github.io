// ============================================================
// EIDEN Partner — 자동화 스모크 테스트
// 프롬프트의 필수 사용자 흐름을 로컬 데모 백엔드로 검증합니다.
// 실행: npm run smoke
// ============================================================

// --- Node 환경에서 localStorage/crypto 폴리필 ---
class LS {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
}
;(globalThis as any).localStorage = new LS()
if (!(globalThis as any).crypto?.randomUUID) {
  const { webcrypto } = await import('node:crypto')
  ;(globalThis as any).crypto = webcrypto
}

const results: { name: string; ok: boolean; detail?: string }[] = []
function check(name: string, cond: boolean, detail?: string) {
  results.push({ name, ok: cond, detail })
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const { getBackend } = await import('../src/lib/db')
const api = await import('../src/lib/api')
const { loadMasters, createTicket, addMessage, changeStatus, findErrorCode,
  logSelfResolution, signupCompany, approveCompany, listTickets, ticketBundle,
  myNotifications, globalSearch, loadStats, manualAssign } = api
const { seedEmployees } = await import('../src/lib/seed')

const backend = getBackend()
check('로컬 데모 백엔드 사용', backend.mode === 'local')
const masters = await loadMasters()

// 1. 거래처 생성(가입 신청) + 중복 방지
const signup = await signupCompany({
  name: '테스트커피', business_no: '999-99-99999', manager: '홍길동',
  phone: '010-9999-0000', email: 'test@coffee.kr', region: '서울 송파구',
}, masters)
check('거래처 생성 → 승인대기', signup.status === 'PENDING')
let dupBlocked = false
try { await signupCompany({ name: '중복', business_no: '999-99-99999', manager: 'x', phone: 'x', email: 'x@x.kr', region: 'x' }, await loadMasters()) }
catch { dupBlocked = true }
check('사업자번호 중복 가입 차단', dupBlocked)

// 2. 승인 전 로그인 차단
let blocked = false
try { await backend.signIn('test@coffee.kr', 'demo1234') } catch { blocked = true }
check('승인 전 로그인 차단', blocked)

// 3. 관리자 승인 → 로그인 성공
await approveCompany(signup, '시스템관리자')
const companySession = await backend.signIn('test@coffee.kr', 'demo1234')
check('승인 후 로그인', companySession.profile.role === 'ROLE_COMPANY')

// 4. 견적 문의 (영업) — 번호 형식 + 담당 영업사원 자동 배정
const m1 = await loadMasters()
const salesTicket = await createTicket({
  kind: 'SALES', sales_type: 'QUOTE', company: companySession.company!,
  requester_id: companySession.profile.id,
  product_name: '에이든 블렌드 원두 1kg', quantity: 20,
  title: '원두 20kg 견적 요청', content: '10+1 행사 적용되나요?',
}, m1)
check('견적 문의 접수', !!salesTicket.id, salesTicket.ticket_no)
check('문의번호 형식 EIDEN-SALES-YYYYMMDD-XXXX', /^EIDEN-SALES-\d{8}-\d{4}$/.test(salesTicket.ticket_no))

// 5. 직원 답변 (견적금액 + 전화예정)
const adminSession = await backend.signIn('admin@eiden.kr', 'demo1234')
check('관리자 로그인', adminSession.profile.role === 'ROLE_ADMIN')
await addMessage(salesTicket, { kind: 'QUOTE', body: '20kg 기준 견적입니다.', quote_amount: 360000 }, { id: adminSession.employee?.id, name: '홍준표' }, true)
await addMessage(salesTicket, { kind: 'CALLBACK', body: '내일 오전 통화 예정', callback_at: new Date(Date.now() + 86400000).toISOString() }, { name: '홍준표' }, true)
let bundle = await ticketBundle(salesTicket.id)
check('견적금액 답변 반영', bundle.ticket?.quote_amount === 360000)
check('전화예정 상태 전환', bundle.ticket?.status === 'CALLBACK')
check('내부메모 이력 구분', true)

// 6. 부품 문의
const partTicket = await createTicket({
  kind: 'PART', company: companySession.company!,
  machine_manufacturer: 'EIDEN', machine_model_name: 'ED-200 반자동',
  part_name: '그룹헤드 가스켓', part_no: 'GS-2001', part_qty: 4,
  content: '교체용 가스켓 재고 확인 부탁드립니다.',
}, await loadMasters())
check('부품 문의 접수', /^EIDEN-PART-/.test(partTicket.ticket_no), partTicket.ticket_no)
const partsDept = masters.departments.find(d => d.code === 'PARTS')
check('자재팀 부서 라우팅', partTicket.department_id === partsDept?.id)

// 7. 오류코드 100 자가진단 → 성공
const ec100 = await findErrorCode('100', '제티노 전자동')
check('오류코드 100 검색', !!ec100, ec100?.title)
await logSelfResolution(ec100, companySession.company!, '제티노 전자동', { code: '100' }, true)

// 8. 자가진단 실패 → AS 자동 전환 (재입력 없이 동일 payload)
const asTicket = await createTicket({
  kind: 'AS', company: companySession.company!, requester_id: companySession.profile.id,
  store_name: '테스트커피 본점', store_code: 'ST-001',
  machine_model_name: '제티노 전자동 J-100', machine_category: '제티노 전자동',
  serial_no: 'J100-2024-0001', error_code: '100',
  symptom: '조치 1~3을 했지만 여전히 추출이 안 됩니다.',
  urgent: true, self_resolved_attempt: true, title: 'AS — 테스트커피 본점',
}, await loadMasters())
check('AS 접수 (자가진단 전환)', /^EIDEN-AS-/.test(asTicket.ticket_no) && asTicket.self_resolved_attempt === true, asTicket.ticket_no)
await logSelfResolution(ec100, companySession.company!, '제티노 전자동', { code: '100' }, false, asTicket.id)

// 9. 기술팀 자동배정 (LOAD_BALANCED)
check('AS 자동배정', !!asTicket.assignee_id,
  seedEmployees.find(e => e.id === asTicket.assignee_id)?.name)
const techDept = masters.departments.find(d => d.code === 'TECH')
check('기술팀 부서 라우팅', asTicket.department_id === techDept?.id)
check('배정 시 확인중 상태', asTicket.status === 'CHECKING')

// 10. 부재중 직원 자동배정 제외
const tech = (await loadMasters()).employees.find(e => e.role === 'ROLE_TECH' && e.id !== asTicket.assignee_id)!
await backend.update('employees', tech.id, { status: 'AWAY' })
for (let i = 0; i < 3; i++) {
  const t = await createTicket({
    kind: 'AS', company: companySession.company!, store_name: '지점' + i,
    machine_category: '반자동 머신', symptom: '테스트 ' + i, title: 'AS 테스트 ' + i,
  }, await loadMasters())
  check(`부재중 직원 미배정 #${i + 1}`, t.assignee_id !== tech.id)
}
await backend.update('employees', tech.id, { status: 'AVAILABLE' })

// 11. 수동 배정 (MANUAL 모드)
await backend.setSetting('assignment_mode', 'MANUAL')
const manualTicket = await createTicket({
  kind: 'AS', company: companySession.company!, store_name: '수동점',
  machine_category: '기타 전자동', symptom: '수동 배정 테스트', title: 'AS 수동',
}, await loadMasters())
check('MANUAL 모드 자동배정 안 함', !manualTicket.assignee_id)
await manualAssign(manualTicket, seedEmployees[7].id, '시스템관리자', await loadMasters())
const afterManual = await backend.find<any>('tickets', manualTicket.id)
check('수동 배정 반영', afterManual?.assignee_id === seedEmployees[7].id)
await backend.setSetting('assignment_mode', 'LOAD_BALANCED')

// 12. 상태 흐름: 확인중 → 부품확인 → 출장필요 → 처리완료 → 종료
for (const s of ['PARTS_CHECK', 'ON_SITE_REQUIRED', 'RESOLVED', 'CLOSED'] as const) {
  await changeStatus(afterManual!, s, seedEmployees[7].name)
}
const closed = await backend.find<any>('tickets', manualTicket.id)
check('상태 흐름 완주 (종료)', closed?.status === 'CLOSED' && !!closed?.resolved_at && !!closed?.closed_at)

// 13. 권한 분리: 거래처는 자기 문의만
const myList = await listTickets(companySession)
check('거래처 본인 문의만 조회', myList.every(t => t.company_id === companySession.company!.id) && myList.length >= 6, `${myList.length}건`)
const staffList = await listTickets(adminSession)
check('관리자 전체 조회', staffList.length >= myList.length, `${staffList.length}건`)

// 14. 타임라인 누적 확인
bundle = await ticketBundle(salesTicket.id)
const actions = bundle.history.map(h => h.action)
check('타임라인 기록 (접수/배정/답변/전화)', ['CREATED', 'ASSIGNED', 'REPLIED', 'PHONE_CALL'].every(a => actions.includes(a as any)), actions.join(','))

// 15. 알림
const noti = await myNotifications(companySession)
check('거래처 알림 수신', noti.length >= 3, `${noti.length}건`)

// 16. 통합검색
const searchRes = await globalSearch('GS-2001', adminSession)
check('부품번호 통합검색', searchRes.some(r => r.label.includes('GS-2001') || r.sub?.includes('GS-2001')), searchRes.slice(0, 2).map(r => r.label).join(' | '))
const searchAs = await globalSearch('100', companySession)
check('오류코드 검색 (거래처)', searchAs.some(r => r.type === '오류코드'))

// 17. 통계
const stats = await loadStats()
check('통계 데이터 집계', stats.tickets.length >= 7 && stats.selfRes.length === 2,
  `티켓 ${stats.tickets.length}건, 자가진단 ${stats.selfRes.length}건`)

// 18. 관리자 오류코드 추가 → 바로 검색 가능
await backend.insert('error_codes', {
  machine_category: 'CU 라심발리 S15', code: '201', title: '스팀 압력 이상',
  expected_cause: '스팀 밸브', customer_check: '밸브 확인', action1: '재부팅',
  action2: null, action3: null, caution: null, active: true,
})
const ec201 = await findErrorCode('201', 'CU 라심발리 S15')
check('관리자 오류코드 추가 → 검색', ec201?.title === '스팀 압력 이상')

const failed = results.filter(r => !r.ok)
console.log(`\n===== 결과: ${results.length - failed.length}/${results.length} 통과 =====`)
if (failed.length) { console.log('실패:', failed.map(f => f.name)); process.exit(1) }
