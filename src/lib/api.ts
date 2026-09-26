// ============================================================
// 업무 로직 — 로컬/Supabase 두 백엔드에서 동일하게 동작
// ============================================================
import type {
  AssignLog, AssignMethod, AuditLog, Company, Employee, EventItem,
  History, HistoryAction, MachineModel, AppNotification, Notice, Part,
  Product, Department, ErrorCode, Faq, SelfResLog, Ticket,
  TicketKind, TicketMessage, TicketStatus, MessageKind, Attachment,
} from './types'
import type { Session } from './db'
import { nowIso, OPEN_STATUSES } from './types'
import { getBackend, type Backend } from './db'

const b = (): Backend => getBackend()

// ---------- 마스터 데이터 ----------
export interface Masters {
  departments: Department[]; employees: Employee[]; companies: Company[]
  machines: MachineModel[]; products: Product[]; parts: Part[]
  errorCodes: ErrorCode[]; faqs: Faq[]; events: EventItem[]; notices: Notice[]
}
export async function loadMasters(): Promise<Masters> {
  const [departments, employees, companies, machines, products, parts, errorCodes, faqs, events, notices] =
    await Promise.all([
      b().select<Department>('departments'),
      b().select<Employee>('employees'),
      b().select<Company>('companies'),
      b().select<MachineModel>('machine_models'),
      b().select<Product>('products'),
      b().select<Part>('parts'),
      b().select<ErrorCode>('error_codes'),
      b().select<Faq>('faqs'),
      b().select<EventItem>('events'),
      b().select<Notice>('notices'),
    ])
  const alive = <T extends { deleted_at?: string | null; active?: boolean }>(rows: T[]) =>
    rows.filter(r => !r.deleted_at && r.active !== false)
  return {
    departments, employees: alive(employees), companies: alive(companies),
    machines: alive(machines), products: alive(products), parts: alive(parts),
    errorCodes: alive(errorCodes), faqs: alive(faqs), events: alive(events), notices: alive(notices),
  }
}

// ---------- 감사/이력/알림 ----------
async function audit(actor: string, action: string, entity?: string, entity_id?: string, detail?: unknown) {
  const row: Omit<AuditLog, 'id' | 'created_at'> = { actor_name: actor, action, entity, entity_id, detail }
  await b().insert('audit_logs', row)
}
async function addHistory(ticket_id: string, actor_name: string, action: HistoryAction, detail?: string, visible = true) {
  const row: Omit<History, 'id' | 'created_at'> = { ticket_id, actor_name, action, detail, visible_to_company: visible }
  await b().insert('ticket_history', row)
}
async function notify(n: Omit<AppNotification, 'id' | 'created_at' | 'read'>) {
  await b().insert('notifications', { ...n, read: false })
}
async function notifyDept(masters: Masters, deptCode: string, n: Omit<AppNotification, 'id' | 'created_at' | 'read' | 'employee_id'>) {
  const dept = masters.departments.find(d => d.code === deptCode)
  if (!dept) return
  const targets = masters.employees.filter(e => e.department_id === dept.id && e.status !== 'OFF')
  await Promise.all(targets.map(t => notify({ ...n, employee_id: t.id })))
}

// ---------- 티켓 생성 ----------
export interface NewTicketInput {
  kind: TicketKind
  sales_type?: Ticket['sales_type']
  company: Company
  requester_id?: string
  contact_name?: string; contact_phone?: string; contact_region?: string
  product_id?: string | null; product_name?: string; quantity?: number | null
  part_name?: string; part_no?: string; part_qty?: number | null; machine_manufacturer?: string
  store_name?: string; store_code?: string
  machine_model_id?: string | null; machine_model_name?: string; machine_category?: string
  serial_no?: string; error_code?: string; symptom?: string
  urgent?: boolean; self_resolved_attempt?: boolean
  title?: string; content?: string
  attachments?: { file_url: string; file_name?: string; file_type?: string }[]
}

const KIND_DEPT: Record<TicketKind, string> = { SALES: 'SALES', PART: 'PARTS', AS: 'TECH' }

export async function createTicket(input: NewTicketInput, masters: Masters): Promise<Ticket> {
  const ticket_no = await b().nextTicketNo(input.kind)
  const dept = masters.departments.find(d => d.code === KIND_DEPT[input.kind])
  const row: Partial<Ticket> = {
    ticket_no, kind: input.kind, sales_type: input.sales_type ?? null,
    company_id: input.company.id, requester_id: input.requester_id ?? null,
    company_name: input.company.name,
    contact_name: input.contact_name ?? input.company.manager,
    contact_phone: input.contact_phone ?? input.company.phone,
    region: input.contact_region ?? input.company.region,
    product_id: input.product_id ?? null, product_name: input.product_name,
    quantity: input.quantity ?? null,
    part_name: input.part_name, part_no: input.part_no, part_qty: input.part_qty ?? null,
    machine_manufacturer: input.machine_manufacturer,
    store_name: input.store_name, store_code: input.store_code,
    machine_model_id: input.machine_model_id ?? null,
    machine_model_name: input.machine_model_name, machine_category: input.machine_category,
    serial_no: input.serial_no, error_code: input.error_code, symptom: input.symptom,
    urgent: input.urgent ?? false, self_resolved_attempt: input.self_resolved_attempt ?? false,
    title: input.title, content: input.content,
    status: 'NEW', department_id: dept?.id ?? null,
  }
  const ticket = await b().insert<Ticket>('tickets', row)
  for (const a of input.attachments ?? []) {
    await b().insert<Attachment>('ticket_attachments', { ticket_id: ticket.id, ...a })
  }
  await addHistory(ticket.id, input.company.manager ?? input.company.name, 'CREATED', `문의번호 ${ticket_no}`)

  // 자동 배정
  await autoAssign(ticket, masters)

  // 알림: 해당 부서 직원
  const kindLabel = { SALES: '영업 문의', PART: '부품 문의', AS: 'AS 접수' }[input.kind]
  await notifyDept(masters, KIND_DEPT[input.kind], {
    title: `새 ${kindLabel} 접수`,
    body: `${input.company.name} — ${input.title ?? input.symptom ?? ''}`.slice(0, 80),
    link: `/staff/tickets/${ticket.id}`,
  })
  if (input.kind === 'SALES') {
    await notifyDept(masters, 'SALES_ADMIN', {
      title: '새 영업 문의 접수',
      body: `${input.company.name} — ${input.title ?? ''}`.slice(0, 80),
      link: `/staff/tickets/${ticket.id}`,
    })
  }
  await audit(input.company.name, 'TICKET_CREATED', 'tickets', ticket.id, { ticket_no })
  return ticket
}

// ---------- 자동 배정 ----------
export async function autoAssign(ticket: Ticket, masters: Masters): Promise<Employee | null> {
  const mode = ((await b().getSetting('assignment_mode')) ?? 'LOAD_BALANCED') as AssignMethod
  const deptCode = KIND_DEPT[ticket.kind]

  // 영업 문의는 거래처 담당 영업사원 우선 배정
  if (ticket.kind === 'SALES' && ticket.company_id) {
    const company = masters.companies.find(c => c.id === ticket.company_id)
    const rep = company?.sales_rep_id ? masters.employees.find(e => e.id === company.sales_rep_id) : null
    if (rep && rep.status !== 'OFF' && rep.status !== 'AWAY') {
      return applyAssign(ticket, rep, 'LOAD_BALANCED')
    }
  }
  if (mode === 'MANUAL') return null

  const dept = masters.departments.find(d => d.code === deptCode)
  if (!dept) return null
  const candidates = masters.employees.filter(
    e => e.department_id === dept.id && e.active !== false && e.status !== 'OFF' && e.status !== 'AWAY',
  )
  if (!candidates.length) return null

  const all = await b().select<Ticket>('tickets')
  const openCount = (empId: string) =>
    all.filter(t => t.assignee_id === empId && OPEN_STATUSES.includes(t.status) && !t.deleted_at).length

  let chosen: Employee
  if (mode === 'ROUND_ROBIN') {
    const logs = (await b().select<AssignLog>('assignment_logs'))
      .sort((a, z) => z.created_at.localeCompare(a.created_at))
    const lastIdx = candidates.findIndex(c => c.id === logs[0]?.employee_id)
    chosen = candidates[(lastIdx + 1) % candidates.length] ?? candidates[0]
  } else {
    // LOAD_BALANCED: Open Ticket이 가장 적은 직원
    chosen = [...candidates].sort((a, z) => openCount(a.id) - openCount(z.id))[0]
  }
  return applyAssign(ticket, chosen, mode)
}

async function applyAssign(ticket: Ticket, emp: Employee, method: AssignMethod): Promise<Employee> {
  await b().update('tickets', ticket.id, { assignee_id: emp.id, status: 'CHECKING' })
  await b().insert<AssignLog>('assignment_logs', { ticket_id: ticket.id, employee_id: emp.id, method })
  await addHistory(ticket.id, '시스템', 'ASSIGNED', `${emp.name} ${emp.title ?? ''} 배정 (${method})`)
  await notify({
    employee_id: emp.id, title: '새 티켓이 배정되었습니다',
    body: ticket.ticket_no, link: `/staff/tickets/${ticket.id}`,
  })
  ticket.assignee_id = emp.id
  ticket.status = 'CHECKING'
  return emp
}

export async function manualAssign(ticket: Ticket, employeeId: string, actor: string, masters: Masters) {
  const emp = masters.employees.find(e => e.id === employeeId)
  if (!emp) throw new Error('직원을 찾을 수 없습니다.')
  await applyAssign(ticket, emp, 'MANUAL')
  await addHistory(ticket.id, actor, 'ASSIGNED', `${emp.name} 수동 배정`)
  await audit(actor, 'TICKET_ASSIGNED', 'tickets', ticket.id, { employee: emp.name })
}

// ---------- 답변 / 상태 ----------
export interface ReplyInput {
  kind: MessageKind; body?: string
  quote_amount?: number | null; callback_at?: string | null
  attachments?: { file_url: string; file_name?: string; file_type?: string }[]
}
export async function addMessage(ticket: Ticket, input: ReplyInput, actor: { id?: string; name: string }, isStaff: boolean) {
  const msg = await b().insert<TicketMessage>('ticket_messages', {
    ticket_id: ticket.id, author_id: actor.id ?? null, author_name: actor.name,
    kind: input.kind, body: input.body, quote_amount: input.quote_amount ?? null,
    callback_at: input.callback_at ?? null,
  })
  for (const a of input.attachments ?? []) {
    await b().insert('ticket_attachments', { ticket_id: ticket.id, message_id: msg.id, ...a })
  }
  const patch: Partial<Ticket> = {}
  let action: HistoryAction = 'REPLIED'
  if (input.kind === 'QUOTE') { patch.quote_amount = input.quote_amount; patch.status = 'CHAT_RESPONSE' }
  if (input.kind === 'CALLBACK') { patch.callback_at = input.callback_at; patch.status = 'CALLBACK'; action = 'PHONE_CALL' }
  if (input.kind === 'INTERNAL') action = 'INTERNAL_MEMO'
  if (input.kind === 'TEXT' && isStaff && ticket.status === 'CHECKING') patch.status = 'CHAT_RESPONSE'
  if (Object.keys(patch).length) await b().update('tickets', ticket.id, patch)
  await addHistory(ticket.id, actor.name, action, input.body?.slice(0, 120), input.kind !== 'INTERNAL')
  if (input.kind !== 'INTERNAL' && ticket.company_id) {
    await notify({
      company_id: ticket.company_id, title: '문의에 답변이 등록되었습니다',
      body: ticket.ticket_no, link: `/tickets/${ticket.id}`,
    })
  }
  return msg
}

export async function changeStatus(ticket: Ticket, status: TicketStatus, actor: string) {
  const patch: Partial<Ticket> = { status }
  if (status === 'RESOLVED') patch.resolved_at = nowIso()
  if (status === 'CLOSED') patch.closed_at = nowIso()
  await b().update('tickets', ticket.id, patch)
  const action: HistoryAction = status === 'RESOLVED' ? 'RESOLVED' : status === 'CLOSED' ? 'CLOSED' : 'STATUS_CHANGED'
  await addHistory(ticket.id, actor, action, status)
  if (ticket.company_id) {
    await notify({
      company_id: ticket.company_id, title: '문의 상태가 변경되었습니다',
      body: `${ticket.ticket_no}`, link: `/tickets/${ticket.id}`,
    })
  }
  await audit(actor, 'STATUS_CHANGED', 'tickets', ticket.id, { status })
}

// ---------- 오류코드 자가진단 ----------
export async function findErrorCode(code: string, category?: string): Promise<ErrorCode | null> {
  const all = await b().select<ErrorCode>('error_codes')
  const c = code.trim()
  return all.find(e => e.active !== false && e.code === c && (!e.machine_category || e.machine_category === category))
    ?? all.find(e => e.active !== false && e.code === c)
    ?? null
}

export async function logSelfResolution(
  ec: ErrorCode | null, company: Company, machineCategory: string | undefined,
  payload: Record<string, unknown>, resolved: boolean, ticketId?: string,
) {
  const row: Omit<SelfResLog, 'id' | 'created_at'> = {
    error_code_id: ec?.id ?? null, company_id: company.id,
    machine_category: machineCategory, payload, resolved, ticket_id: ticketId ?? null,
  }
  return b().insert<SelfResLog>('self_resolution_logs', row)
}

// ---------- 거래처 가입 / 승인 ----------
export interface SignupInput {
  name: string; business_no: string; manager: string
  phone: string; email: string; region: string; sales_rep_id?: string | null
}
export async function signupCompany(input: SignupInput, masters: Masters) {
  const dup = masters.companies.find(c => c.business_no && c.business_no === input.business_no)
  if (dup) throw new Error('이미 등록된 사업자번호입니다.')
  const company = await b().insert<Company>('companies', { ...input, status: 'PENDING' })
  await notifyDept(masters, 'ADMIN', {
    title: '거래처 가입 승인 요청', body: input.name, link: '/staff/admin/companies',
  })
  await audit(input.name, 'COMPANY_SIGNUP', 'companies', company.id)
  return company
}
export async function approveCompany(company: Company, actor: string) {
  await b().update('companies', company.id, { status: 'APPROVED', reject_reason: null })
  await notify({ company_id: company.id, title: '가입이 승인되었습니다', body: '이제 EIDEN Partner를 이용하실 수 있습니다.', link: '/' })
  await audit(actor, 'COMPANY_APPROVED', 'companies', company.id)
}
export async function rejectCompany(company: Company, reason: string, actor: string) {
  await b().update('companies', company.id, { status: 'REJECTED', reject_reason: reason })
  await audit(actor, 'COMPANY_REJECTED', 'companies', company.id, { reason })
}

// ---------- 조회 ----------
export async function listTickets(session: Session): Promise<Ticket[]> {
  const all = await b().select<Ticket>('tickets')
  let rows = all.filter(t => !t.deleted_at)
  if (session.profile.role === 'ROLE_COMPANY') {
    rows = rows.filter(t => t.company_id === session.company?.id)
  }
  return rows.sort((a, z) => z.created_at.localeCompare(a.created_at))
}
export async function ticketBundle(ticketId: string) {
  const [ticket, messages, history, attachments] = await Promise.all([
    b().find<Ticket>('tickets', ticketId),
    b().select<TicketMessage>('ticket_messages'),
    b().select<History>('ticket_history'),
    b().select<Attachment>('ticket_attachments'),
  ])
  return {
    ticket,
    messages: messages.filter(m => m.ticket_id === ticketId).sort((a, z) => a.created_at.localeCompare(z.created_at)),
    history: history.filter(h => h.ticket_id === ticketId).sort((a, z) => a.created_at.localeCompare(z.created_at)),
    attachments: attachments.filter(a => a.ticket_id === ticketId),
  }
}

// ---------- 알림 ----------
export async function myNotifications(session: Session): Promise<AppNotification[]> {
  const all = await b().select<AppNotification>('notifications')
  return all
    .filter(n => {
      if (session.profile.role === 'ROLE_COMPANY') return n.company_id === session.company?.id
      if (session.employee) return n.employee_id === session.employee.id || n.target_role === session.profile.role
      return false
    })
    .sort((a, z) => z.created_at.localeCompare(a.created_at))
}
export async function markNotificationRead(id: string) {
  await b().update('notifications', id, { read: true })
}
export async function markAllRead(session: Session) {
  const list = await myNotifications(session)
  await Promise.all(list.filter(n => !n.read).map(n => markNotificationRead(n.id)))
}

// ---------- 통합 검색 ----------
export interface SearchResult { type: string; label: string; sub?: string; link: string }
export async function globalSearch(q: string, session: Session): Promise<SearchResult[]> {
  const s = q.trim().toLowerCase()
  if (!s) return []
  const m = await loadMasters()
  const tickets = await listTickets(session)
  const out: SearchResult[] = []
  const hit = (v?: string | null) => !!v && v.toLowerCase().includes(s)
  for (const t of tickets) {
    if (hit(t.ticket_no) || hit(t.title) || hit(t.company_name) || hit(t.contact_name)
      || hit(t.contact_phone) || hit(t.product_name) || hit(t.part_no) || hit(t.part_name)
      || hit(t.serial_no) || hit(t.error_code)) {
      out.push({
        type: '문의', label: `${t.ticket_no} ${t.title ?? t.symptom ?? ''}`,
        sub: `${t.company_name ?? ''} · ${t.status}`,
        link: session.profile.role === 'ROLE_COMPANY' ? `/tickets/${t.id}` : `/staff/tickets/${t.id}`,
      })
    }
  }
  if (session.profile.role !== 'ROLE_COMPANY') {
    for (const c of m.companies) {
      if (hit(c.name) || hit(c.phone) || hit(c.manager) || hit(c.business_no)) {
        out.push({ type: '거래처', label: c.name, sub: `${c.manager ?? ''} ${c.phone ?? ''}`, link: '/staff/admin/companies' })
      }
    }
    for (const e of m.employees) {
      if (hit(e.name)) out.push({ type: '직원', label: `${e.name} ${e.title ?? ''}`, sub: e.email, link: '/staff/admin/employees' })
    }
  }
  for (const p of m.products) {
    if (hit(p.name) || hit(p.model_no)) out.push({ type: '제품', label: p.name, sub: p.model_no, link: session.profile.role === 'ROLE_COMPANY' ? '/board' : '/staff/admin/products' })
  }
  for (const p of m.parts) {
    if (hit(p.name) || hit(p.part_no)) out.push({ type: '부품', label: p.name, sub: p.part_no, link: session.profile.role === 'ROLE_COMPANY' ? '/inquiry/part' : '/staff/admin/parts' })
  }
  for (const e of m.errorCodes) {
    if (hit(e.code) || hit(e.title)) out.push({ type: '오류코드', label: `${e.code} — ${e.title}`, sub: e.machine_category ?? '공통', link: '/as/diagnose' })
  }
  return out.slice(0, 50)
}

// ---------- 통계 ----------
export async function loadStats() {
  const [tickets, logs, masters] = await Promise.all([
    b().select<Ticket>('tickets'),
    b().select<SelfResLog>('self_resolution_logs'),
    loadMasters(),
  ])
  return { tickets: tickets.filter(t => !t.deleted_at), selfRes: logs, masters }
}

// ---------- 첨부 (로컬: dataURL / Supabase: Storage) ----------
export async function uploadAttachment(file: File): Promise<{ file_url: string; file_name: string; file_type: string }> {
  const backend = b()
  if (backend.mode === 'supabase') {
    const sb = (backend as any).sb as ReturnType<typeof import('@supabase/supabase-js').createClient>
    const path = `${Date.now()}-${file.name}`
    const { error } = await sb.storage.from('attachments').upload(path, file)
    if (error) throw new Error('첨부 업로드 실패: ' + error.message)
    const { data } = sb.storage.from('attachments').getPublicUrl(path)
    return { file_url: data.publicUrl, file_name: file.name, file_type: file.type.startsWith('video') ? 'video' : 'image' }
  }
  // 로컬 모드: 1.5MB 이하는 dataURL로 저장
  if (file.size > 1.5 * 1024 * 1024) {
    return { file_url: '', file_name: `${file.name} (로컬 데모 모드 — 대용량 파일은 파일명만 기록됩니다)`, file_type: file.type.startsWith('video') ? 'video' : 'image' }
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
  return { file_url: dataUrl, file_name: file.name, file_type: file.type.startsWith('video') ? 'video' : 'image' }
}
