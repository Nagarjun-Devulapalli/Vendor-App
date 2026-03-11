import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { SearchOutlined } from '@ant-design/icons'

const pageMeta = {
  '/dashboard': { title: 'Dashboard', sub: 'Overview of your branch activity' },
  '/vendors': { title: 'Vendors', sub: 'All registered vendors at your branch' },
  '/activities': { title: 'Activities', sub: 'All scheduled and ongoing work' },
  '/payments': { title: 'Payments', sub: 'Track and manage vendor payments' },
  '/pending-approvals': { title: 'Pending Approvals', sub: 'Review and approve employee work logs' },
  '/categories': { title: 'Work Categories', sub: 'Define types of work your vendors do' },
}

export default function Layout() {
  const location = useLocation()
  const basePath = '/' + (location.pathname.split('/')[1] || 'dashboard')
  const meta = pageMeta[basePath] || { title: 'Vendor Portal', sub: '' }

  return (
    <div className="flex min-h-screen bg-[#f6f7f9]">
      <Sidebar />
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-[#e4e8ed] px-7 h-[60px] flex items-center justify-between sticky top-0 z-40">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#1a1f2e]">{meta.title}</h2>
            <p className="text-xs text-[#6b7280] mt-0.5">{meta.sub}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#f6f7f9] border border-[#e4e8ed] rounded-lg text-[13px] text-[#6b7280] cursor-text w-[200px]">
              <SearchOutlined /> Search...
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
