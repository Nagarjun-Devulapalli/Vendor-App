import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { ExclamationCircleOutlined } from '@ant-design/icons'

const PAGE_SIZE = 10
const statusStyles = {
  pending: 'bg-[#fef3e0] text-[#b07200]',
  in_progress: 'bg-[#e8f0fc] text-[#2563a8]',
  completed: 'bg-[#e8f5ee] text-[#1a6b4a]',
  cancelled: 'bg-[#fdecea] text-[#c0392b]',
}

const typeStyles = {
  one_time: 'bg-[#f0f1f3] text-[#555]',
  long_term: 'bg-[#fef3e0] text-[#b07200]',
  recurring: 'bg-[#e8f0fc] text-[#2563a8]',
}

const logBadgeStyles = {
  pending: 'bg-[#fef3e0] text-[#b07200]',
  approved: 'bg-[#e8f5ee] text-[#1a6b4a]',
  rejected: 'bg-[#fdecea] text-[#c0392b]',
}

export default function PendingApprovals() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pending')
  const [allGrouped, setAllGrouped] = useState({ pending: [], approved: [], rejected: [] })
  const [loading, setLoading] = useState(true)

  const tabs = [
    { key: 'pending', label: 'Pending', count: allGrouped.pending.length },
    { key: 'approved', label: 'Approved', count: allGrouped.approved.length },
    { key: 'rejected', label: 'Rejected', count: allGrouped.rejected.length },
  ]

  const currentActivities = allGrouped[activeTab] || []

  if (loading) return <div className="flex items-center justify-center h-64 text-[#6b7280]">Loading...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold">Pending Approvals</h3>
          <p className="text-[13px] text-[#6b7280] mt-0.5">Activities with work logs awaiting admin approval</p>
        </div>
        {allGrouped.pending.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#fef3e0] text-[#b07200] rounded-lg text-[13px] font-semibold">
            {allGrouped.pending.length} activities pending review
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-[#e4e8ed]">
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Pending Review</label>
            <div className="font-serif text-[22px] font-bold text-[#b07200] mt-1">{allGrouped.pending.length}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">Activities with pending logs</div>
          </div>
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Approved</label>
            <div className="font-serif text-[22px] font-bold text-[#1a6b4a] mt-1">{allGrouped.approved.length}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">Activities with approved logs</div>
          </div>
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Rejected</label>
            <div className="font-serif text-[22px] font-bold text-[#c0392b] mt-1">{allGrouped.rejected.length}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">Activities with rejected logs</div>
          </div>
        </div>
      </div>

      {/* Table with Tabs */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <div className="flex gap-0.5 px-5 border-b border-[#e4e8ed]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                setSearchParams(tab.key !== 'pending' ? { tab: tab.key } : {})
              }}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'text-orchid border-orchid font-semibold'
                  : 'text-[#6b7280] border-transparent hover:text-[#1a1f2e]'
              }`}
            >
              {tab.label}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.key ? 'bg-orchid/10 text-orchid' : 'bg-[#f0f1f3] text-[#6b7280]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Activity</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Vendor</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Type</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Schedule</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Budget</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Logs</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {currentActivities.map((a) => (
              <tr key={a.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] cursor-pointer transition-colors" onClick={() => navigate(`/activities/${a.id}`)}>
                <td className="px-4 py-3.5">
                  <span className="font-semibold text-[13px] block">{a.title}</span>
                  <span className="text-[11px] text-[#6b7280]">{a.category_name || ''}</span>
                </td>
                <td className="px-4 py-3.5 text-[13px]">{a.vendor_name}</td>
                <td className="px-4 py-3.5">
                  <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeStyles[a.activity_type] || 'bg-[#f0f1f3] text-[#555]'}`}>
                    {a.activity_type?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs text-[#6b7280]">
                  {a.start_date}{a.end_date ? ` – ${a.end_date}` : ''}
                  {a.recurrence_interval_days ? ` (every ${a.recurrence_interval_days}d)` : ''}
                </td>
                <td className="px-4 py-3.5 font-semibold text-[13px] tabular-nums">₹{Number(a.expected_cost).toLocaleString()}</td>
                <td className="px-4 py-3.5">
                  <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${logBadgeStyles[activeTab]}`}>
                    {a.log_count} {activeTab}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {a.is_overdue ? (
                    <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fdecea] text-[#c0392b]"><ExclamationCircleOutlined /> Overdue</span>
                  ) : (
                    <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[a.status] || 'bg-[#f0f1f3] text-[#555]'}`}>
                      {a.status?.replace('_', ' ')}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {currentActivities.length === 0 && <tr><td colSpan="7" className="px-4 py-8 text-center text-[13px] text-[#6b7280]">No {activeTab} activities found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
