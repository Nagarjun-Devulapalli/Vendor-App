import { useState } from 'react'
import { EyeOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 10

const statusStyles = {
  pending: 'bg-[#fef3e0] text-[#b07200]',
  approved: 'bg-[#e8f5ee] text-[#1a6b4a]',
  rejected: 'bg-[#fdecea] text-[#c0392b]',
}

const dummyWorkLogs = [
  {
    id: 1,
    employee_name: 'Ramesh Kumar',
    vendor_name: 'ABC Electricals',
    category: 'Electrical',
    date: '2026-03-10',
    check_in: '09:00 AM',
    check_out: '05:30 PM',
    hours_worked: 8.5,
    description: 'Replaced faulty wiring in Block C classrooms and installed new switchboards in staff room.',
    status: 'pending',
    photo: null,
  },
  {
    id: 2,
    employee_name: 'Suresh Yadav',
    vendor_name: 'ABC Electricals',
    category: 'Electrical',
    date: '2026-03-10',
    check_in: '09:15 AM',
    check_out: '04:00 PM',
    hours_worked: 6.75,
    description: 'Fixed lighting issues in the auditorium and checked UPS backup systems.',
    status: 'pending',
    photo: null,
  },
  {
    id: 3,
    employee_name: 'Anita Sharma',
    vendor_name: 'CleanPro Services',
    category: 'Housekeeping',
    date: '2026-03-09',
    check_in: '07:00 AM',
    check_out: '03:00 PM',
    hours_worked: 8,
    description: 'Deep cleaning of science lab, library, and principal office.',
    status: 'pending',
    photo: null,
  },
  {
    id: 4,
    employee_name: 'Vikram Singh',
    vendor_name: 'GreenScape Gardens',
    category: 'Gardening',
    date: '2026-03-09',
    check_in: '06:30 AM',
    check_out: '12:30 PM',
    hours_worked: 6,
    description: 'Trimmed hedges along the main entrance, watered all flower beds, and applied fertilizer to the football ground turf.',
    status: 'approved',
    photo: null,
  },
  {
    id: 5,
    employee_name: 'Pooja Mehra',
    vendor_name: 'CleanPro Services',
    category: 'Housekeeping',
    date: '2026-03-08',
    check_in: '07:30 AM',
    check_out: '02:00 PM',
    hours_worked: 6.5,
    description: 'Washroom deep cleaning across all floors. Restocked supplies.',
    status: 'rejected',
    rejected_reason: 'Incomplete work reported by floor supervisor.',
    photo: null,
  },
  {
    id: 6,
    employee_name: 'Manoj Tiwari',
    vendor_name: 'SecureGuard Agency',
    category: 'Security',
    date: '2026-03-08',
    check_in: '06:00 AM',
    check_out: '06:00 PM',
    hours_worked: 12,
    description: 'Full day security duty at main gate. Managed visitor log and coordinated parent pick-up.',
    status: 'approved',
    photo: null,
  },
]

export default function PendingApprovals() {
  const [workLogs, setWorkLogs] = useState(dummyWorkLogs)
  const [activeTab, setActiveTab] = useState('pending')
  const [currentPage, setCurrentPage] = useState(1)
  const [detailModal, setDetailModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const filtered = workLogs.filter((log) => activeTab === 'all' || log.status === activeTab)
  const pagedFiltered = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const counts = {
    pending: workLogs.filter((l) => l.status === 'pending').length,
    approved: workLogs.filter((l) => l.status === 'approved').length,
    rejected: workLogs.filter((l) => l.status === 'rejected').length,
  }

  const tabs = [
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
    { key: 'all', label: 'All Logs' },
  ]

  const handleApprove = (id) => {
    setWorkLogs((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'approved' } : l)))
    setDetailModal(null)
  }

  const handleReject = () => {
    if (!rejectReason.trim()) return
    setWorkLogs((prev) => prev.map((l) => (l.id === rejectModal.id ? { ...l, status: 'rejected', rejected_reason: rejectReason } : l)))
    setRejectModal(null)
    setRejectReason('')
    setDetailModal(null)
  }

  const openReject = (log) => {
    setRejectModal(log)
    setRejectReason('')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold">Pending Approvals</h3>
          <p className="text-[13px] text-[#6b7280] mt-0.5">Review and approve work logs submitted by employees</p>
        </div>
        {counts.pending > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#fef3e0] text-[#b07200] rounded-lg text-[13px] font-semibold">
            {counts.pending} awaiting review
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-[#e4e8ed]">
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Pending Review</label>
            <div className="font-serif text-[22px] font-bold text-[#b07200] mt-1">{counts.pending}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">Work logs awaiting approval</div>
          </div>
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Approved</label>
            <div className="font-serif text-[22px] font-bold text-[#1a6b4a] mt-1">{counts.approved}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">Work logs approved this period</div>
          </div>
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Rejected</label>
            <div className="font-serif text-[22px] font-bold text-[#c0392b] mt-1">{counts.rejected}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">Work logs rejected</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-0.5 px-5 border-b border-[#e4e8ed]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setCurrentPage(1) }}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'text-orchid border-orchid font-semibold'
                  : 'text-[#6b7280] border-transparent hover:text-[#1a1f2e]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.key ? 'bg-orchid/10 text-orchid' : 'bg-[#f0f1f3] text-[#6b7280]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Employee</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Vendor</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Category</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Date</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Hours</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Status</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedFiltered.map((log) => (
              <tr key={log.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-orchid-light flex items-center justify-center text-[11px] font-bold text-orchid">
                      {log.employee_name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <span className="font-semibold text-[13px]">{log.employee_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[13px]">{log.vendor_name}</td>
                <td className="px-4 py-3.5">
                  <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fc] text-[#2563a8]">
                    {log.category}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[13px] text-[#6b7280]">{log.date}</td>
                <td className="px-4 py-3.5 text-[13px] font-semibold tabular-nums">{log.hours_worked}h</td>
                <td className="px-4 py-3.5">
                  <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusStyles[log.status]}`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setDetailModal(log)}
                      className="w-[30px] h-[30px] rounded-lg border border-[#e4e8ed] inline-flex items-center justify-center text-sm text-[#6b7280] hover:bg-[#f6f7f9] transition-colors"
                      title="View Details"
                    >
                      <EyeOutlined />
                    </button>
                    {log.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(log.id)}
                          className="w-[30px] h-[30px] rounded-lg border border-[#e4e8ed] inline-flex items-center justify-center text-sm text-[#1a6b4a] hover:bg-[#e8f5ee] transition-colors"
                          title="Approve"
                        >
                          <CheckOutlined />
                        </button>
                        <button
                          onClick={() => openReject(log)}
                          className="w-[30px] h-[30px] rounded-lg border border-[#e4e8ed] inline-flex items-center justify-center text-sm text-[#c0392b] hover:bg-[#fdecea] transition-colors"
                          title="Reject"
                        >
                          <CloseOutlined />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-[13px] text-[#6b7280]">No work logs found</td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setDetailModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[90vw]">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Work Log Details</h3>
              <button onClick={() => setDetailModal(null)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orchid-light flex items-center justify-center text-sm font-bold text-orchid">
                  {detailModal.employee_name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-[15px]">{detailModal.employee_name}</p>
                  <p className="text-xs text-[#6b7280]">{detailModal.vendor_name} · {detailModal.category}</p>
                </div>
                <span className={`ml-auto badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusStyles[detailModal.status]}`}>
                  {detailModal.status}
                </span>
              </div>

              <div className="bg-[#f6f7f9] rounded-lg p-3.5 space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6b7280]">Date</span>
                  <span className="font-semibold">{detailModal.date}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6b7280]">Check In</span>
                  <span className="font-semibold">{detailModal.check_in}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6b7280]">Check Out</span>
                  <span className="font-semibold">{detailModal.check_out}</span>
                </div>
                <div className="border-t border-[#e4e8ed] pt-2 flex justify-between text-[13px]">
                  <span className="text-[#6b7280] font-medium">Total Hours</span>
                  <span className="font-bold text-orchid">{detailModal.hours_worked}h</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Work Description</span>
                <p className="text-[13px] mt-1.5 leading-relaxed">{detailModal.description}</p>
              </div>

              {detailModal.rejected_reason && (
                <div className="bg-[#fdecea] border border-[#f0c0c0] rounded-lg px-3.5 py-3">
                  <p className="text-xs font-semibold text-[#c0392b]">Rejection Reason</p>
                  <p className="text-xs text-[#c0392b] mt-1">{detailModal.rejected_reason}</p>
                </div>
              )}
            </div>

            {detailModal.status === 'pending' && (
              <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
                <button onClick={() => openReject(detailModal)} className="px-4 py-2 border-[1.5px] border-[#c0392b] text-[#c0392b] rounded-lg text-[13px] font-semibold hover:bg-[#fdecea] transition-colors">
                  Reject
                </button>
                <button onClick={() => handleApprove(detailModal.id)} className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid transition-colors">
                  Approve <CheckOutlined />
                </button>
              </div>
            )}

            {detailModal.status !== 'pending' && (
              <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end">
                <button onClick={() => setDetailModal(null)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-[420px] max-w-[90vw]">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Reject Work Log</h3>
              <button onClick={() => setRejectModal(null)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Employee</span>
                <p className="font-semibold text-[15px] mt-0.5">{rejectModal.employee_name}</p>
                <p className="text-xs text-[#6b7280]">{rejectModal.vendor_name} · {rejectModal.date}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Reason for Rejection *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide a reason for rejecting this work log..."
                  className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors"
                  rows="3"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button type="button" onClick={() => setRejectModal(null)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-[#c0392b] text-white rounded-lg text-[13px] font-semibold hover:bg-[#a93226] disabled:opacity-50 transition-colors"
              >
                Reject Work Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
