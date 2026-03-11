import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/vendors', label: 'Vendors', icon: '🏢' },
  { to: '/activities', label: 'Activities', icon: '📋' },
  { to: '/payments', label: 'Payments', icon: '💳' },
]

const settingsItems = [
  { to: '/categories', label: 'Work Categories', icon: '🏷️' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  const initials = `${(user?.first_name || '')[0] || ''}${(user?.last_name || '')[0] || ''}`.toUpperCase()

  return (
    <aside className="w-[240px] bg-orchid flex flex-col fixed top-0 left-0 bottom-0 z-50">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.12]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-[10px] flex items-center justify-center text-lg">🏫</div>
          <div>
            <h1 className="font-serif text-[15px] text-white leading-tight font-bold">Orchids Schools</h1>
            <span className="text-[11px] text-white/60">Vendor Portal</span>
          </div>
        </div>
      </div>

      {/* Branch indicator */}
      <div className="mx-3 mt-4 bg-white/10 rounded-lg px-3 py-2.5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#5dde9c]" />
        <span className="text-xs text-white/85 font-medium">{user?.branch_name || 'Branch'}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4">
        <div className="text-[10px] font-semibold tracking-[0.08em] text-white/40 uppercase px-2 pb-1.5 pt-3">Main Menu</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/[0.18] text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="text-[10px] font-semibold tracking-[0.08em] text-white/40 uppercase px-2 pb-1.5 pt-5">Settings</div>
        {settingsItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/[0.18] text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/[0.12]">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.08]">
          <div className="w-[30px] h-[30px] rounded-full bg-white/30 flex items-center justify-center text-[13px] text-white font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-medium truncate">{user?.first_name} {user?.last_name}</p>
            <span className="text-[10px] text-white/50">Branch Admin</span>
          </div>
          <button onClick={logout} className="text-white/50 hover:text-white/80 transition-colors" title="Logout">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
