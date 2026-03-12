import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'

const pageMeta = {
  '/dashboard': { title: 'Dashboard', sub: 'Overview of your branch activity' },
  '/vendors': { title: 'Vendors', sub: 'All registered vendors at your branch' },
  '/activities': { title: 'Activities', sub: 'All scheduled and ongoing work' },
  '/payments': { title: 'Payments', sub: 'Track and manage vendor payments' },
  '/pending-approvals': { title: 'Pending Approvals', sub: 'Review and approve employee work logs' },
  '/categories': { title: 'Work Categories', sub: 'Define types of work your vendors do' },
  '/branch-admins': { title: 'Branch Admins', sub: 'Manage admin accounts for each branch' },
  '/credentials': { title: 'Credentials', sub: 'View and manage login credentials' },
}

export default function Layout() {
  const location = useLocation()
  const basePath = '/' + (location.pathname.split('/')[1] || 'dashboard')
  const meta = pageMeta[basePath] || { title: 'Vendor Portal', sub: '' }
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#f6f7f9]">
      <Sidebar collapsed={collapsed} />
      <div
        className={`${collapsed ? 'ml-16' : 'ml-[240px]'} flex-1 flex flex-col min-h-screen transition-all duration-200 ease-in-out`}
      >
        {/* Top bar */}
        <header className="bg-white border-b border-[#e4e8ed] px-5 h-[60px] flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="text-[#6b7280] hover:text-[#1a1f2e] transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <MenuUnfoldOutlined style={{ fontSize: 18 }} /> : <MenuFoldOutlined style={{ fontSize: 18 }} />}
            </button>
            <div>
              <h2 className="font-serif text-xl font-bold text-[#1a1f2e]">{meta.title}</h2>
              <p className="text-xs text-[#6b7280] mt-0.5">{meta.sub}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
