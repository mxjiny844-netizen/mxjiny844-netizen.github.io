// 이벤트/공지/FAQ 게시판 + 더보기(내 정보·앱 설치·QR 공유) + 알림
import { useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Megaphone, Bell, Share2, Download } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { loadMasters, markAllRead, myNotifications, type Masters } from '@/lib/api'
import type { AppNotification } from '@/lib/types'
import { COMPANY_STATUS_LABEL } from '@/lib/types'
import { EmptyState, fmtDate, fmtDateTime } from '@/components/common'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BoardTab = 'EVENT' | 'NOTICE' | 'FAQ'

export function BoardPage() {
  const [tab, setTab] = useState<BoardTab>('EVENT')
  const [masters, setMasters] = useState<Masters | null>(null)
  useEffect(() => { loadMasters().then(setMasters) }, [])
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">이벤트 / 공지</h2>
      <div className="flex gap-2">
        {([['EVENT', '이벤트'], ['NOTICE', '공지사항'], ['FAQ', '자주 묻는 질문']] as [BoardTab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn('rounded-full px-4 py-1.5 text-sm font-medium',
              tab === k ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200')}>
            {l}
          </button>
        ))}
      </div>

      {!masters ? <p className="text-sm text-slate-400">불러오는 중…</p> : tab === 'EVENT' ? (
        masters.events.length === 0 ? <EmptyState title="진행 중인 이벤트가 없습니다" /> : (
          <ul className="space-y-3">
            {masters.events.map(ev => {
              const ongoing = (!ev.start_date || ev.start_date <= today) && (!ev.end_date || ev.end_date >= today)
              return (
                <li key={ev.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {ev.image_url && <img src={ev.image_url} alt={ev.title} className="h-36 w-full object-cover" />}
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold',
                        ongoing ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                        {ongoing ? '진행중' : '종료/예정'}
                      </span>
                      {ev.condition && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{ev.condition}</span>}
                    </div>
                    <p className="mt-1.5 font-bold text-slate-900">{ev.title}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{ev.content}</p>
                    <p className="mt-2 text-xs text-slate-400">{fmtDate(ev.start_date)} ~ {fmtDate(ev.end_date)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )
      ) : tab === 'NOTICE' ? (
        masters.notices.length === 0 ? <EmptyState title="공지사항이 없습니다" /> : (
          <ul className="space-y-2">
            {[...masters.notices].sort((a, z) => Number(z.pinned) - Number(a.pinned)).map(n => (
              <li key={n.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">
                  {n.pinned && <Megaphone className="mr-1 inline h-4 w-4 text-amber-500" />}{n.title}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{n.content}</p>
                <p className="mt-2 text-xs text-slate-400">{fmtDate(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )
      ) : (
        masters.faqs.length === 0 ? <EmptyState title="등록된 FAQ가 없습니다" /> : (
          <ul className="space-y-2">
            {masters.faqs.map(f => (
              <li key={f.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm"><span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{f.category}</span></p>
                <p className="mt-2 font-semibold text-slate-900">Q. {f.question}</p>
                <p className="mt-1 text-sm text-slate-600">A. {f.answer}</p>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

// ---------- 더보기: 내 정보 + 홈 화면 설치 + QR 공유 ----------
export function MorePage() {
  const { session } = useAuth()
  const installEvt = useRef<any>(null)
  const [canInstall, setCanInstall] = useState(false)
  const url = window.location.origin + window.location.pathname

  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); installEvt.current = e; setCanInstall(true) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  async function install() {
    if (!installEvt.current) return
    installEvt.current.prompt()
    await installEvt.current.userChoice
    setCanInstall(false)
  }

  const c = session?.company
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">더보기</h2>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-400">내 거래처 정보</p>
        <dl className="mt-3 grid grid-cols-3 gap-y-2 text-sm">
          <dt className="text-slate-400">업체명</dt><dd className="col-span-2 font-semibold">{c?.name}</dd>
          <dt className="text-slate-400">담당자</dt><dd className="col-span-2">{c?.manager}</dd>
          <dt className="text-slate-400">전화번호</dt><dd className="col-span-2">{c?.phone}</dd>
          <dt className="text-slate-400">지역</dt><dd className="col-span-2">{c?.region}</dd>
          <dt className="text-slate-400">상태</dt>
          <dd className="col-span-2">{c ? COMPANY_STATUS_LABEL[c.status] : '-'}</dd>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 font-semibold text-slate-800">
          <Download className="h-4 w-4" /> 휴대폰 홈 화면에 설치
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          이 앱은 PWA로, 설치 후 일반 앱처럼 사용할 수 있습니다.
          {canInstall
            ? ' 아래 버튼을 눌러 바로 설치하세요.'
            : ' 브라우저 메뉴(⋮ 또는 공유)에서 「홈 화면에 추가」를 선택하세요.'}
        </p>
        {canInstall && <Button className="mt-3 w-full" onClick={install}>앱 설치하기</Button>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        <p className="flex items-center justify-center gap-2 font-semibold text-slate-800">
          <Share2 className="h-4 w-4" /> 동료에게 공유하기
        </p>
        <p className="mt-1 text-xs text-slate-500">QR 코드를 스캔하면 바로 접속됩니다.</p>
        <div className="mt-3 inline-block rounded-xl border border-slate-200 p-3">
          <QRCodeCanvas value={url} size={140} />
        </div>
        <p className="mt-2 break-all text-xs text-slate-400">{url}</p>
        <Button variant="outline" className="mt-3 w-full"
          onClick={() => navigator.clipboard?.writeText(url)}>URL 복사</Button>
      </section>
    </div>
  )
}

// ---------- 알림 목록 (거래처/직원 공용) ----------
export function NotificationsPage() {
  const { session } = useAuth()
  const [items, setItems] = useState<AppNotification[] | null>(null)
  useEffect(() => {
    if (!session) return
    myNotifications(session).then(setItems)
    markAllRead(session)
  }, [session])

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <Bell className="h-5 w-5" /> 알림
      </h2>
      {!items ? <p className="text-sm text-slate-400">불러오는 중…</p>
        : items.length === 0 ? <EmptyState title="알림이 없습니다" /> : (
          <ul className="space-y-2">
            {items.map(n => (
              <li key={n.id}>
                <a href={n.link ?? '#'} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="font-semibold text-slate-900">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-400">{fmtDateTime(n.created_at)}</p>
                </a>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
