// EIDEN Partner — 도메인 타입 & 상수
export type Role =
  | 'ROLE_COMPANY' | 'ROLE_SALES' | 'ROLE_SALES_ADMIN'
  | 'ROLE_PARTS' | 'ROLE_TECH' | 'ROLE_ADMIN'
export type CompanyStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type EmpStatus = 'AVAILABLE' | 'BUSY' | 'AWAY' | 'OFF'
export type TicketKind = 'SALES' | 'PART' | 'AS'
export type SalesType = 'ORDER' | 'QUOTE' | 'STOCK' | 'ETC'
export type TicketStatus =
  | 'NEW' | 'CHECKING' | 'CHAT_RESPONSE' | 'CALLBACK'
  | 'PARTS_CHECK' | 'ON_SITE_REQUIRED' | 'RESOLVED' | 'CLOSED'
export type MessageKind = 'TEXT' | 'QUOTE' | 'CALLBACK' | 'INTERNAL' | 'SYSTEM'
export type AssignMethod = 'LOAD_BALANCED' | 'ROUND_ROBIN' | 'MANUAL'
export type HistoryAction =
  | 'CREATED' | 'ASSIGNED' | 'STATUS_CHANGED' | 'REPLIED'
  | 'PHONE_CALL' | 'INTERNAL_MEMO' | 'RESOLVED' | 'CLOSED'

export interface Department { id: string; code: string; name: string }
export interface Employee {
  id: string; user_id?: string; name: string; title?: string
  department_id: string; role: Role; status: EmpStatus
  phone?: string; email?: string; active: boolean; deleted_at?: string | null
}
export interface Company {
  id: string; name: string; business_no?: string; manager?: string
  phone?: string; email?: string; region?: string
  sales_rep_id?: string | null; status: CompanyStatus
  reject_reason?: string; created_at: string; deleted_at?: string | null
}
export interface Profile {
  id: string; role: Role; name: string; phone?: string
  company_id?: string | null; employee_id?: string | null
}
export interface MachineModel {
  id: string; manufacturer?: string; name: string; category: string; active: boolean
}
export interface Product {
  id: string; name: string; category?: string; model_no?: string
  price?: number; active: boolean; deleted_at?: string | null
}
export interface Part {
  id: string; name: string; part_no?: string; machine_model_id?: string | null
  price?: number; stock_qty: number; active: boolean; deleted_at?: string | null
}
export interface Ticket {
  id: string; ticket_no: string; kind: TicketKind; sales_type?: SalesType | null
  company_id?: string | null; requester_id?: string | null
  company_name?: string; contact_name?: string; contact_phone?: string; region?: string
  product_id?: string | null; product_name?: string; quantity?: number | null
  part_name?: string; part_no?: string; part_qty?: number | null; machine_manufacturer?: string
  store_name?: string; store_code?: string
  machine_model_id?: string | null; machine_model_name?: string; machine_category?: string
  serial_no?: string; error_code?: string; symptom?: string
  urgent?: boolean; self_resolved_attempt?: boolean
  title?: string; content?: string
  status: TicketStatus; assignee_id?: string | null; department_id?: string | null
  quote_amount?: number | null; callback_at?: string | null
  created_at: string; resolved_at?: string | null; closed_at?: string | null
  deleted_at?: string | null
}
export interface TicketMessage {
  id: string; ticket_id: string; author_id?: string | null; author_name?: string
  kind: MessageKind; body?: string; quote_amount?: number | null
  callback_at?: string | null; created_at: string
}
export interface Attachment {
  id: string; ticket_id: string; message_id?: string | null
  file_url: string; file_name?: string; file_type?: string; created_at: string
}
export interface History {
  id: string; ticket_id: string; actor_name?: string; action: HistoryAction
  detail?: string; visible_to_company: boolean; created_at: string
}
export interface ErrorCode {
  id: string; machine_category?: string | null; code: string; title: string
  expected_cause?: string; customer_check?: string
  action1?: string; action2?: string; action3?: string; caution?: string
  active: boolean
}
export interface SelfResLog {
  id: string; error_code_id?: string | null; company_id?: string | null
  machine_category?: string; payload?: Record<string, unknown>
  resolved: boolean; ticket_id?: string | null; created_at: string
}
export interface Faq { id: string; category?: string; question: string; answer: string; active: boolean }
export interface EventItem {
  id: string; title: string; content?: string; image_url?: string
  product_id?: string | null; condition?: string
  start_date?: string; end_date?: string; active: boolean; deleted_at?: string | null
}
export interface Notice {
  id: string; title: string; content?: string; pinned: boolean
  created_at: string; deleted_at?: string | null
}
export interface AppNotification {
  id: string; target_role?: Role | null; company_id?: string | null
  employee_id?: string | null; title: string; body?: string
  link?: string; read: boolean; created_at: string
}
export interface AssignLog {
  id: string; ticket_id: string; employee_id: string
  method: AssignMethod; created_at: string
}
export interface AuditLog {
  id: string; actor_name?: string; action: string; entity?: string
  entity_id?: string; detail?: unknown; created_at: string
}

// ---------- 라벨 / 상수 ----------
export const STATUS_LABEL: Record<TicketStatus, string> = {
  NEW: '신규 접수', CHECKING: '확인중', CHAT_RESPONSE: '채팅답변', CALLBACK: '전화예정',
  PARTS_CHECK: '부품확인', ON_SITE_REQUIRED: '출장필요', RESOLVED: '처리완료', CLOSED: '종료',
}
export const STATUS_COLOR: Record<TicketStatus, string> = {
  NEW: 'bg-red-100 text-red-700', CHECKING: 'bg-amber-100 text-amber-700',
  CHAT_RESPONSE: 'bg-sky-100 text-sky-700', CALLBACK: 'bg-violet-100 text-violet-700',
  PARTS_CHECK: 'bg-orange-100 text-orange-700', ON_SITE_REQUIRED: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700', CLOSED: 'bg-slate-200 text-slate-600',
}
export const KIND_LABEL: Record<TicketKind, string> = { SALES: '영업', PART: '부품', AS: 'AS' }
export const SALES_TYPE_LABEL: Record<SalesType, string> = {
  ORDER: '발주', QUOTE: '견적', STOCK: '재고', ETC: '기타',
}
export const EMP_STATUS_LABEL: Record<EmpStatus, string> = {
  AVAILABLE: '근무중', BUSY: '처리중', AWAY: '부재중', OFF: '퇴근',
}
export const ROLE_LABEL: Record<Role, string> = {
  ROLE_COMPANY: '거래처', ROLE_SALES: '영업', ROLE_SALES_ADMIN: '영업관리',
  ROLE_PARTS: '자재', ROLE_TECH: '기술', ROLE_ADMIN: '관리자',
}
export const COMPANY_STATUS_LABEL: Record<CompanyStatus, string> = {
  PENDING: '승인대기', APPROVED: '승인완료', REJECTED: '반려',
}
export const MACHINE_CATEGORIES = ['반자동 머신', 'CU 라심발리 S15', '제티노 전자동', '기타 전자동']
export const OPEN_STATUSES: TicketStatus[] = ['NEW', 'CHECKING', 'CHAT_RESPONSE', 'CALLBACK', 'PARTS_CHECK', 'ON_SITE_REQUIRED']

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
export const nowIso = () => new Date().toISOString()
