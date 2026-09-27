// 로컬 데모 모드 초기 데이터 — supabase/migrations/0002_seed.sql 과 동일한 내용
import type {
  Company, Department, Employee, ErrorCode, EventItem, Faq,
  MachineModel, Notice, Part, Product,
} from './types'
import { nowIso } from './types'

const D = {
  SALES: 'd0000000-0000-0000-0000-000000000001',
  SALES_ADMIN: 'd0000000-0000-0000-0000-000000000002',
  PARTS: 'd0000000-0000-0000-0000-000000000003',
  TECH: 'd0000000-0000-0000-0000-000000000004',
  ADMIN: 'd0000000-0000-0000-0000-000000000005',
}
export const DEPT = D

export const seedDepartments: Department[] = [
  { id: D.SALES, code: 'SALES', name: '영업' },
  { id: D.SALES_ADMIN, code: 'SALES_ADMIN', name: '영업관리' },
  { id: D.PARTS, code: 'PARTS', name: '자재' },
  { id: D.TECH, code: 'TECH', name: '기술' },
  { id: D.ADMIN, code: 'ADMIN', name: '관리' },
]

const emp = (n: number, name: string, title: string, dept: string,
  role: Employee['role']): Employee => ({
  id: `e0000000-0000-0000-0000-0000000000${n.toString(16).padStart(2, '0')}`,
  name, title, department_id: dept, role, status: 'AVAILABLE',
  phone: `010-1000-${String(n).padStart(4, '0')}`,
  email: n === 13 ? 'admin@eiden.kr' : `${role.replace('ROLE_', '').toLowerCase()}${n}@eiden.kr`,
  active: true,
})

export const seedEmployees: Employee[] = [
  emp(1, '장원준', '부장', D.SALES, 'ROLE_SALES'),
  emp(2, '강재명', '부장', D.SALES, 'ROLE_SALES'),
  emp(3, '유지혁', '부장', D.SALES, 'ROLE_SALES'),
  emp(4, '홍준표', '부장', D.SALES_ADMIN, 'ROLE_SALES_ADMIN'),
  emp(5, '조현진', '대리', D.SALES_ADMIN, 'ROLE_SALES_ADMIN'),
  emp(6, '황여진', '대리', D.SALES_ADMIN, 'ROLE_SALES_ADMIN'),
  emp(7, '김태영', '과장', D.PARTS, 'ROLE_PARTS'),
  emp(8, '오성민', '차장', D.TECH, 'ROLE_TECH'),
  emp(9, '배준석', '과장', D.TECH, 'ROLE_TECH'),
  emp(10, '신예린', '대리', D.TECH, 'ROLE_TECH'),
  emp(11, '문기철', '대리', D.TECH, 'ROLE_TECH'),
  emp(12, '한솔비', '사원', D.TECH, 'ROLE_TECH'),
  emp(13, '시스템관리자', '관리자', D.ADMIN, 'ROLE_ADMIN'),
]

export const seedMachines: MachineModel[] = [
  { id: 'a0000000-0000-0000-0000-000000000001', manufacturer: 'EIDEN', name: 'ED-200 반자동', category: '반자동 머신', active: true },
  { id: 'a0000000-0000-0000-0000-000000000002', manufacturer: 'EIDEN', name: 'ED-350 반자동', category: '반자동 머신', active: true },
  { id: 'a0000000-0000-0000-0000-000000000003', manufacturer: 'La Cimbali', name: 'CU 라심발리 S15', category: 'CU 라심발리 S15', active: true },
  { id: 'a0000000-0000-0000-0000-000000000004', manufacturer: 'JETTINO', name: '제티노 전자동 J-100', category: '제티노 전자동', active: true },
  { id: 'a0000000-0000-0000-0000-000000000005', manufacturer: 'JETTINO', name: '제티노 전자동 J-200', category: '제티노 전자동', active: true },
  { id: 'a0000000-0000-0000-0000-000000000006', manufacturer: '기타', name: '기타 전자동 머신', category: '기타 전자동', active: true },
]

const prod = (n: number, name: string, category: string, model_no: string, price: number): Product => ({
  id: `b0000000-0000-0000-0000-00000000000${n}`, name, category, model_no, price, active: true,
})
export const seedProducts: Product[] = [
  prod(1, '에이든 블렌드 원두 1kg', '원두', 'BN-001', 18000),
  prod(2, '다크 로스팅 원두 1kg', '원두', 'BN-002', 19500),
  prod(3, 'ED-200 반자동 머신', '머신', 'ED-200', 1850000),
  prod(4, '제티노 전자동 J-100', '머신', 'J-100', 2450000),
  prod(5, '정수 필터 카트리지', '소모품', 'FT-100', 35000),
]

const part = (n: number, name: string, part_no: string, mid: number, price: number, stock: number): Part => ({
  id: `c0000000-0000-0000-0000-00000000000${n}`, name, part_no,
  machine_model_id: `a0000000-0000-0000-0000-00000000000${mid}`, price, stock_qty: stock, active: true,
})
export const seedParts: Part[] = [
  part(1, '그룹헤드 가스켓', 'GS-2001', 1, 8000, 120),
  part(2, '샤워 스크린', 'SC-1045', 1, 6500, 80),
  part(3, '스팀 밸브 어셈블리', 'SV-3300', 3, 42000, 15),
  part(4, '펌프 모터', 'PM-5500', 4, 89000, 6),
  part(5, '보일러 히터 220V', 'BH-2210', 4, 55000, 0),
]

export const seedErrorCodes: ErrorCode[] = [
  {
    id: 'ec000000-0000-0000-0000-000000000001', machine_category: '제티노 전자동', code: '100',
    title: '추출 불량 — 커피가 나오지 않음',
    expected_cause: '원두 호퍼 비어 있음, 추출구 막힘, 물탱크 부족',
    customer_check: '① 원두가 호퍼에 있는지 확인 ② 물탱크 수위 확인 ③ 추출구에 커피 찌꺼기가 막혀 있는지 확인',
    action1: '원두를 채우고 물탱크를 끼운 뒤 전원을 껐다 켜 주세요.',
    action2: '추출구와 드립트레이를 분리해 물로 세척한 뒤 다시 장착하세요.',
    action3: '그래도 안 되면 머신 내부 세척 모드(메뉴 → 관리 → 세척)를 1회 실행하세요.',
    caution: '세척 시 뜨거운 물이 나올 수 있으니 손을 대지 마세요.', active: true,
  },
  {
    id: 'ec000000-0000-0000-0000-000000000002', machine_category: '제티노 전자동', code: '101',
    title: '밀크 시스템 경고',
    expected_cause: '우유 튜브 막힘, 우유 용기 미장착',
    customer_check: '우유 용기가 장착되어 있는지, 튜브가 꺾이지 않았는지 확인',
    action1: '우유 튜브를 빼서 흐르는 물에 헹구세요.',
    action2: '우유 용기를 다시 장착하고 밀크 세척을 실행하세요.',
    action3: '경고가 지속되면 전원 재부팅 후 확인하세요.',
    caution: '우유 튜브는 매일 세척해야 위생 문제를 예방할 수 있습니다.', active: true,
  },
  {
    id: 'ec000000-0000-0000-0000-000000000003', machine_category: 'CU 라심발리 S15', code: '200',
    title: '보일러 온도 이상',
    expected_cause: '물 부족, 히터 센서 오류',
    customer_check: '급수 연결 상태와 필터 막힘 여부 확인',
    action1: '정수 필터를 점검하고 급수 밸브가 열려 있는지 확인하세요.',
    action2: '전원을 5분간 끈 뒤 다시 켜 주세요.',
    action3: '동일 증상 반복 시 내부 히터 점검이 필요합니다. AS를 접수하세요.',
    caution: '보일러 부위는 고온이므로 직접 분해하지 마세요.', active: true,
  },
  {
    id: 'ec000000-0000-0000-0000-000000000004', machine_category: '반자동 머신', code: '300',
    title: '펌프 압력 저하',
    expected_cause: '필터 막힘, 가스켓 노후',
    customer_check: '포타필터와 샤워 스크린 막힘 확인',
    action1: '포타필터를 분해해 세척하세요.',
    action2: '샤워 스크린과 가스켓 상태를 확인하고 필요 시 교체하세요.',
    action3: '백플러싱 세척을 1회 실행하세요.',
    caution: '세척제 사용 후에는 맑은 물로 3회 이상 헹구세요.', active: true,
  },
  {
    id: 'ec000000-0000-0000-0000-000000000005', machine_category: null, code: '900',
    title: '전원/공통 오류',
    expected_cause: '전원 코드, 누전 차단기',
    customer_check: '전원 코드 연결과 매장 차단기 상태 확인',
    action1: '다른 콘센트에 연결해 보세요.',
    action2: '차단기가 내려갔는지 확인하세요.',
    action3: '그래도 안 되면 AS를 접수하세요.',
    caution: '젖은 손으로 전원 코드를 만지지 마세요.', active: true,
  },
]

export const seedFaqs: Faq[] = [
  { id: 'fa000000-0000-0000-0000-000000000001', category: '주문', question: '최소 주문 수량이 있나요?', answer: '원두는 5kg, 소모품은 1박스 단위로 주문 가능합니다. 그 이하는 영업 담당자와 상담해 주세요.', active: true },
  { id: 'fa000000-0000-0000-0000-000000000002', category: '배송', question: '주문 후 배송은 얼마나 걸리나요?', answer: '오후 2시 이전 접수 건은 당일 출고되며, 지역에 따라 1~2일 소요됩니다.', active: true },
  { id: 'fa000000-0000-0000-0000-000000000003', category: 'AS', question: 'AS 방문 비용이 있나요?', answer: '보증기간 내 무상이며, 보증기간 경과 시 출장비와 부품비가 청구됩니다.', active: true },
  { id: 'fa000000-0000-0000-0000-000000000004', category: '부품', question: '단종된 부품은 어떻게 하나요?', answer: '대체 부품이 있으면 안내해 드리며, 없을 경우 머신 교체 견적을 받아보실 수 있습니다.', active: true },
]

const day = 86400000
const dstr = (offset: number) => new Date(Date.now() + offset * day).toISOString().slice(0, 10)

export const seedCompanies: Company[] = [
  { id: 'f0000000-0000-0000-0000-000000000001', name: '카페 온도', business_no: '123-45-67890', manager: '김민지', phone: '010-5555-0001', email: 'cafe@ondo.kr', region: '서울 마포구', sales_rep_id: 'e0000000-0000-0000-0000-000000000001', status: 'APPROVED', created_at: nowIso() },
  { id: 'f0000000-0000-0000-0000-000000000002', name: '브루잉랩 판교', business_no: '234-56-78901', manager: '이승훈', phone: '010-5555-0002', email: 'brew@lab.kr', region: '경기 성남시', sales_rep_id: 'e0000000-0000-0000-0000-000000000002', status: 'APPROVED', created_at: nowIso() },
  { id: 'f0000000-0000-0000-0000-000000000003', name: '모닝커피 신촌점', business_no: '345-67-89012', manager: '박서연', phone: '010-5555-0003', email: 'morning@coffee.kr', region: '서울 서대문구', sales_rep_id: 'e0000000-0000-0000-0000-000000000003', status: 'PENDING', created_at: nowIso() },
]

export const seedEvents: EventItem[] = [
  { id: 'ev000000-0000-0000-0000-000000000001', title: '원두 10+1 행사', content: '에이든 블렌드 원두 10박스 주문 시 1박스를 추가로 드립니다.', product_id: 'b0000000-0000-0000-0000-000000000001', condition: '10+1', start_date: dstr(-7), end_date: dstr(23), active: true },
  { id: 'ev000000-0000-0000-0000-000000000002', title: '정수 필터 할인', content: '정수 필터 카트리지 20% 할인 행사를 진행합니다.', product_id: 'b0000000-0000-0000-0000-000000000005', condition: '20% 할인', start_date: dstr(-3), end_date: dstr(11), active: true },
]

export const seedNotices: Notice[] = [
  { id: 'no000000-0000-0000-0000-000000000001', title: 'EIDEN Partner 앱 오픈 안내', content: '전화/카톡 문의 대신 앱에서 문의를 남겨 주시면 더 빠르게 처리됩니다.', pinned: true, created_at: nowIso() },
  { id: 'no000000-0000-0000-0000-000000000002', title: '추석 연휴 배송 일정 안내', content: '연휴 기간 출고가 중단됩니다. 일정은 이벤트 게시판을 확인해 주세요.', pinned: false, created_at: nowIso() },
]

// 로컬 데모 로그인용 프로필 (Supabase 모드에서는 profiles 테이블 사용)
export const DEMO_PASSWORD = 'demo1234'
export const DEMO_COMPANY_ID = seedCompanies[0].id
export const ADMIN_EMPLOYEE_ID = 'e0000000-0000-0000-0000-00000000000d'
