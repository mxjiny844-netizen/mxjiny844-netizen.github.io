// PWA 설치 안내 배너
// - 이미 설치된 상태(standalone)면 표시하지 않음
// - 안드로이드/크롬: beforeinstallprompt가 잡히면 버튼 클릭으로 바로 설치
// - 아이폰/기타: 홈 화면 추가 방법 안내 표시
import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

declare global {
  interface Window { __pwaPrompt?: any }
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true
}

export function InstallBanner() {
  const [visible, setVisible] = useState(false)
  const [canPrompt, setCanPrompt] = useState(false)
  const ua = navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  // 카카오톡·네이버 등 인앱 브라우저에서는 설치가 불가능 → 다른 브라우저로 열기 안내
  const isInApp = /kakaotalk|naver\(inapp|instagram|line\//i.test(ua)

  useEffect(() => {
    if (isStandalone()) return
    if (localStorage.getItem('eiden-install-dismissed')) return
    setVisible(true)
    if (window.__pwaPrompt) setCanPrompt(true)
    const onPrompt = (e: Event) => {
      e.preventDefault()
      window.__pwaPrompt = e
      setCanPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem('eiden-install-dismissed', '1')
    setVisible(false)
  }
  const install = async () => {
    const p = window.__pwaPrompt
    if (!p) return
    p.prompt()
    await p.userChoice
    window.__pwaPrompt = undefined
    setVisible(false)
  }

  return (
    <div
      onClick={canPrompt ? install : undefined}
      role={canPrompt ? 'button' : undefined}
      className={`relative rounded-2xl border border-eiden-navy/20 bg-white p-4 shadow-sm ${canPrompt ? 'cursor-pointer' : ''}`}>
      <button onClick={(e) => { e.stopPropagation(); dismiss() }} aria-label="닫기"
        className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-100">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-eiden-navy">
          <Download className="h-5 w-5 text-white" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">홈 화면에 앱으로 설치하세요</p>
          {isInApp ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              지금 쓰는 창에서는 설치가 안 됩니다. 우측 하단(또는 상단) <b>⋮ 메뉴</b> → <b>다른 브라우저로 열기</b>로 연 뒤 설치하세요.
            </p>
          ) : canPrompt ? (
            <p className="mt-0.5 text-xs text-slate-500">아래 버튼 한 번이면 바탕화면에 앱이 생깁니다.</p>
          ) : isIOS ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Safari 하단 <Share className="inline h-3.5 w-3.5 align-[-2px]" /> 공유 버튼 → <b>홈 화면에 추가</b>를 누르세요.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              브라우저 우측 상단 <b>⋮ 메뉴</b> → <b>홈 화면에 추가</b>(또는 앱 설치)를 누르세요.
            </p>
          )}
        </div>
      </div>
      {canPrompt && (
        <button onClick={(e) => { e.stopPropagation(); install() }}
          className="mt-3 w-full rounded-xl bg-eiden-navy py-2.5 text-sm font-bold text-white active:scale-[0.99]">
          앱 설치하기
        </button>
      )}
    </div>
  )
}
