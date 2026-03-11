import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  DashboardOutlined,
  ShopOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  AuditOutlined,
  TagsOutlined,
  BankOutlined,
  LogoutOutlined,
  TeamOutlined,
  KeyOutlined,
  SwapOutlined,
} from '@ant-design/icons'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  { to: '/vendors', label: 'Vendors', icon: <ShopOutlined /> },
  { to: '/activities', label: 'Activities', icon: <FileTextOutlined /> },
  { to: '/payments', label: 'Payments', icon: <CreditCardOutlined /> },
  { to: '/pending-approvals', label: 'Pending Approvals', icon: <AuditOutlined /> },
]

const superadminItems = [
  { to: '/branch-admins', label: 'Branch Admins', icon: <TeamOutlined /> },
  { to: '/credentials', label: 'Credentials', icon: <KeyOutlined /> },
]

const settingsItems = [
  { to: '/categories', label: 'Work Categories', icon: <TagsOutlined /> },
]

export default function Sidebar({ collapsed }) {
  const { user, logout } = useAuth()

  const initials = `${(user?.first_name || '')[0] || ''}${(user?.last_name || '')[0] || ''}`.toUpperCase()

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-[240px]'} bg-orchid flex flex-col fixed top-0 left-0 bottom-0 z-50 transition-all duration-200 ease-in-out`}
    >
      {/* Brand */}
      <div className="px-3 pt-6 pb-5 border-b border-white/[0.12]">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
          <div className="w-9 h-9 bg-white/20 rounded-[10px] flex items-center justify-center text-lg text-white flex-shrink-0">
            <BankOutlined />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-[15px] text-white leading-tight font-bold truncate">Orchids Schools</h1>
              <span className="text-[11px] text-white/60">Vendor Portal</span>
            </div>
          )}
        </div>
      </div>

      {/* Branch indicator */}
      {!collapsed && (
        <div className="mx-3 mt-4 bg-white/10 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#5dde9c] flex-shrink-0" />
          <span className="text-xs text-white/85 font-medium truncate">{user?.role === 'superadmin' ? 'All Branches' : (user?.branch_name || 'Branch')}</span>
        </div>
      )}
      {collapsed && (
        <div className="mx-auto mt-4">
          <div className="w-2 h-2 rounded-full bg-[#5dde9c]" title={user?.branch_name || 'Branch'} />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 pt-4 overflow-hidden">
        {!collapsed && (
          <div className="text-[10px] font-semibold tracking-[0.08em] text-white/40 uppercase px-2 pb-1.5 pt-3">
            Main Menu
          </div>
        )}
        {collapsed && <div className="pt-3" />}
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/[0.18] text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
            {!collapsed && item.label}
          </NavLink>
        ))}

        {!collapsed && (
          <div className="text-[10px] font-semibold tracking-[0.08em] text-white/40 uppercase px-2 pb-1.5 pt-5">
            Settings
          </div>
        )}
        {collapsed && <div className="pt-3" />}
        {settingsItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/[0.18] text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
            {!collapsed && item.label}
          </NavLink>
        ))}

        {user?.role === 'superadmin' && (
          <>
            {!collapsed && (
              <div className="text-[10px] font-semibold tracking-[0.08em] text-white/40 uppercase px-2 pb-1.5 pt-5">
                Super Admin
              </div>
            )}
            {collapsed && <div className="pt-3" />}
            {superadminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.18] text-white'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                {!collapsed && item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Back to Super Admin */}
      {localStorage.getItem('superadmin_session') && !collapsed && (
        <div className="px-2 pb-2">
          <button
            onClick={() => {
              const saved = JSON.parse(localStorage.getItem('superadmin_session'))
              localStorage.setItem('access_token', saved.access)
              localStorage.setItem('refresh_token', saved.refresh)
              localStorage.setItem('user', saved.user)
              localStorage.removeItem('superadmin_session')
              window.location.href = '/dashboard'
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold bg-[#fef3e0] text-[#7a5000] hover:bg-[#fde9c0] transition-colors"
          >
            <SwapOutlined /> Back to Super Admin
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-2 py-4 border-t border-white/[0.12]">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-[30px] h-[30px] rounded-full bg-white/30 flex items-center justify-center text-[13px] text-white font-semibold" title={`${user?.first_name} ${user?.last_name}`}>
              {initials}
            </div>
            <button onClick={logout} className="text-white/50 hover:text-white/80 transition-colors" title="Logout">
              <LogoutOutlined style={{ fontSize: 16 }} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.08]">
            <div className="w-[30px] h-[30px] rounded-full bg-white/30 flex items-center justify-center text-[13px] text-white font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{user?.first_name} {user?.last_name}</p>
              <span className="text-[10px] text-white/50">{user?.role === 'superadmin' ? 'Super Admin' : 'Branch Admin'}</span>
            </div>
            <button onClick={logout} className="text-white/50 hover:text-white/80 transition-colors" title="Logout">
              <LogoutOutlined style={{ fontSize: 16 }} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
