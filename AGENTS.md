# EIDEN Partner — AI 작업 가이드 (AGENTS.md)

> 이 파일은 OpenCode, ChatGPT, Claude Code 등 AI 코딩 도구가 이 프로젝트를 열었을 때
> 바로 이해하고 작업할 수 있도록 작성된 프로젝트 설명서입니다.
> (OpenCode는 프로젝트 루트의 AGENTS.md를 자동으로 읽습니다.)

## 1. 프로젝트 개요

- **이름**: EIDEN Partner (eiden-partner)
- **용도**: 커피머신 회사 EIDEN의 거래처(B2B) 전용 웹앱. 거래처가 발주/견적/재고/부품/기타 문의와 AS 접수를 하고, 회사 직원/관리자가 처리한다.
- **형태**: 모바일 우선 PWA. 휴대폰 홈 화면에 앱처럼 설치 가능.
- **운영 URL**: https://mxjiny844-netizen.github.io/
- **실운영 중**: 실제 거래처가 사용하는 서비스이므로, DB 스키마 변경이나 배포는 신중하게.

## 2. 기술 스택

- React 19 + Vite 7 + TypeScript
- Tailwind CSS 3 + shadcn/ui (`src/components/ui`)
- react-router-dom v7 (SPA)
- Supabase (Auth + Postgres + RLS) — `@supabase/supabase-js`
- PWA: `vite-plugin-pwa` (generateSW, `dist/sw.js` 자동 생성)
- 기타: react-hook-form, zod, recharts, qrcode.react, sonner, lucide-react

## 3. 실행 방법

```bash
npm install
npm run dev        # 개발 서버 (기본 http://localhost:5173)
npm run build      # 타입체크(tsc -b) + 프로덕션 빌드 → dist/
npm run smoke      # Supabase 연결 스모크 테스트 (scripts/smoke.ts)
```

환경 변수는 루트의 `.env`에 있다 (없으면 `.env.example` 복사):

```
VITE_SUPABASE_URL=https://uzckctzkllvkzlzvlete.supabase.co
VITE_SUPABASE_ANON_KEY=...        # 공개 가능 키
SUPABASE_SERVICE_ROLE_KEY=...     # ⚠️ 절대 외부 유출 금지 (스크립트/관리 작업 전용)
```

⚠️ **보안 주의**: `.env`(특히 SERVICE_ROLE_KEY)가 포함된 폴더를 그대로 ChatGPT 등 외부 서비스에 업로드하지 않는다. 업로드용 zip에는 `.env`를 빼고 `.env.example`만 포함한다.

## 4. 배포 (GitHub Pages)

- 저장소: `mxjiny844-netizen/mxjiny844-netizen.github.io`
- 브랜치: `main`(소스) + `gh-pages`(빌드 결과물, `dist/.git`에서 force push)
- 절차:

```bash
npm run build
cp dist/index.html dist/404.html   # SPA 라우팅용
touch dist/.nojekyll
cd dist
git add -A && git commit -m "..." && git push -f origin HEAD:gh-pages
cd .. && git add -A && git commit -m "..." && git push origin main
```

- 배포 후 반영 확인: `curl -s https://mxjiny844-netizen.github.io/ | grep -oE 'assets/index-[^"]*\.js'`

## 5. 코드 구조

```
src/
  App.tsx               # 라우터 (React Router)
  lib/
    db.ts               # Backend 추상화 (Supabase / 로컬 모크), sbClient() export
    api.ts              # 회원가입/계정/비밀번호재설정 등 API 함수
    types.ts            # 타입 + PRODUCT_CATEGORIES(제품 분류 6종 고정)
  pages/
    auth.tsx            # 로그인/회원가입/비밀번호재설정(/reset-password)
    home(company).tsx   # 거래처 홈
    inquiry.tsx         # 발주/견적/재고/기타 문의 + 부품 문의
    as.tsx              # AS 자가진단(/as/diagnose) + AS 접수(/as/new)
    tickets.tsx         # 내 문의/AS 목록·상세
    staff.tsx           # 직원 포털
    admin.tsx           # 관리자(거래처 승인/계정/직원 관리)
    board.tsx, stats.tsx
  components/
    shells.tsx          # MobileShell(모바일 프레임), StaffShell(직원/관리자 반응형 셸)
    InstallBanner.tsx   # PWA 설치 배너 (인앱 브라우저 감지 포함)
    common.tsx, ui/     # 공통 컴포넌트, shadcn/ui
supabase/migrations/    # DB 마이그레이션 SQL (0001~0004)
scripts/smoke.ts        # 스모크 테스트
```

## 6. Supabase / DB 핵심 규칙

- 프로젝트 ref: `uzckctzkllvkzlzvlete`, 리전 포함 URL: `https://uzckctzkllvkzlzvlete.supabase.co`
- Auth: 이메일 가입, **Confirm email OFF**. Site URL = `https://mxjiny844-netizen.github.io/`, Redirect URLs에 `https://mxjiny844-netizen.github.io/**` 등록됨.
- **RLS가 걸린 테이블에 insert 후 SELECT가 안 되는 경우가 있으므로**, 로그성 테이블(audit_logs, ticket_history, notifications, assignment_logs, self_resolution_logs)과 비로그인 회원가입 companies insert는 반드시 `db.ts`의 `insertOnly(table, row)` (RETURNING 없는 insert)를 사용한다.
- 회원가입 흐름: `signupCompany()` → companies insert + `provisionAccount`로 Supabase Auth 계정 자동 생성 → 관리자 승인 후 로그인 가능.
- 비밀번호 재설정: `sendPasswordReset(email)` → 메일 링크 → `/reset-password` 페이지에서 변경.
- 주요 테이블: companies(거래처), profiles(계정-회사 연결/권한), employees(직원), tickets(문의/AS 공통, type으로 구분), ticket_history, notifications, audit_logs, assignment_logs, self_resolution_logs.

## 7. 권한/화면 구조

- 권한: `admin`(관리자) / `staff`(직원) / `company`(거래처)
- 로그인 후 `roleHome()`은 항상 `/` 반환 → 전원 모바일 홈으로 진입. 직원/관리자는 MobileShell 우측 상단 "직원 모드/관리자 모드" 버튼으로 `/staff` 진입.
- 관리자는 관리자 모드에서 거래처 승인, 계정 생성/비번 재설정 메일 발송, 직원 관리 가능.

## 8. 현재 도메인 규칙 (사용자 요청으로 확정된 사항)

- 문의 제품 분류는 6종 고정: 반자동 커피머신 / 전자동 커피머신 / 그라인더 / 스무디 머신 / 부품(반자동) / 부품(전자동). 제품명·모델명은 고객이 직접 텍스트 입력(품목 마스터 없음).
- 모든 문의 폼에 "연락처(휴대폰)" 필드 있음 (가입 전화번호로 자동 채움, 수정 가능).
- 첨부파일 업로드 기능은 제거됨 (의도적. `uploadAttachment`는 남아있지만 호출처 없음).
- AS 자가진단: 오류코드는 선택, 증상 상세만으로도 AS 접수로 진행 가능.

## 9. 테스트/운영 계정

- 관리자: `mxjiny82@gmail.com` (실운영 관리자)
- 테스트 거래처: `mxjiny82@naver.com` (에이덴테스트), `testbakery@test.kr` (테스트베이커리)
- 데모: admin@eiden.kr, cafe@ondo.kr 등 (비밀번호 demo1234, 로컬 모드용)

## 10. 작업 시 주의

- UI 텍스트는 전부 한국어.
- 모바일 우선: 모든 화면은 모바일에서 깨지지 않아야 함 (표는 `overflow-x-auto` 래핑 패턴 사용).
- 변경 후에는 `npm run build`로 타입 에러를 확인하고, 가능하면 `npm run smoke` 실행.
- 사용자(의뢰인)는 개발자가 아니므로, 복잡한 절차 없이 "폴더째 OpenCode에 열어서" 작업한다는 점을 전제로 설명을 작성할 것.
