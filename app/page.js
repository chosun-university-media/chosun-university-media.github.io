import Script from "next/script";

export default function HomePage() {
  return (
    <>
      <div id="app" className="app-shell">
        <aside className="sidebar" aria-label="주요 메뉴">
          <button className="brand" type="button" data-action="go-home" aria-label="한눈에 보기로 이동">
            <img src="/assets/chosun-symbol-basic.jpg" alt="조선대학교 로고" className="brand-symbol-only" />
            <div className="brand-copy">
              <strong>조선대학교</strong>
              <span>언론 관리 플랫폼</span>
            </div>
          </button>
          <nav id="nav" className="nav-list" />
        </aside>

        <div className="workspace">
          <header className="topbar">
            <div className="title-block">
              <p id="eyebrow">홍보팀 운영 콘솔</p>
              <h1 id="page-title">대시보드</h1>
            </div>
            <div className="topbar-actions">
              <label className="search-box" htmlFor="global-search">
                <span aria-hidden="true">⌕</span>
                <input id="global-search" type="search" placeholder="전체 검색" autoComplete="off" />
              </label>
              <button className="icon-button" type="button" data-action="export-backup" title="전체 백업" aria-label="전체 백업">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
                </svg>
              </button>
            </div>
          </header>

          <main id="view" className="view" tabIndex="-1" />
        </div>
      </div>

      <div id="modal-root" className="modal-root" aria-live="polite" />
      <div id="toast-root" className="toast-root" aria-live="polite" />
      <input id="backup-import" type="file" accept="application/json" hidden />
      <Script src="/app.js?v=20260724-deploy-v1" strategy="afterInteractive" />
    </>
  );
}
