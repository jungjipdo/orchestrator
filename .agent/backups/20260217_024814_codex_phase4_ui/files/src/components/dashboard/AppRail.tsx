// ============================================
// AppRail — 우측 앱 레일 (글래스 스타일)
// ============================================

const APP_ITEMS = [
    { id: 'home', label: 'Home', symbol: 'HM' },
    { id: 'remind', label: 'Re-mind', symbol: 'RM' },
    { id: 'journal', label: 'Journal', symbol: 'PJ' },
    { id: 'diary', label: 'Diary', symbol: 'PD' },
    { id: 'calendar', label: 'Calendar', symbol: 'CL' },
    { id: 'settings', label: 'Settings', symbol: 'ST' },
] as const

export function AppRail() {
    return (
        <aside className="app-rail" aria-label="앱 레일">
            <h3 className="app-rail__title">Apps</h3>
            <ul className="app-rail__list">
                {APP_ITEMS.map((app) => (
                    <li key={app.id}>
                        <button type="button" className="app-rail__item" title={app.label}>
                            <span className="app-rail__icon" aria-hidden="true">{app.symbol}</span>
                            <span className="app-rail__label">{app.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
            <p className="app-rail__hint">Rules/Model/Theme 설정은 Settings로 이동</p>
        </aside>
    )
}
