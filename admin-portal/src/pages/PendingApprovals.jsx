import { useState, useEffect } from 'react'
import { EyeOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast, parseApiError } from '../components/Toast'
import BranchFilter from '../components/BranchFilter'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 10
const statusStyles = {
  pending: 'bg-[#fef3e0] text-[#b07200]',
  approved: 'bg-[#e8f5ee] text-[#1a6b4a]',
  rejected: 'bg-[#fdecea] text-[#c0392b]',
}

export default function PendingApprovals() {
  const { user } = useAuth()
  const toast = useToast()
  const [workLogs, setWorkLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [detailModal, setDetailModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchWorkLogs = () => {
    setLoading(true)
    let url = '/occurrences/'
    if (selectedBranch) url += `?branch=${selectedBranch}`
    api.get(url)
      .then((res) => {
        const occs = res.data.results || res.data
        const logs = []
        for (const occ of occs) {
          if (occ.work_logs) {
            for (const log of occ.work_logs) {
              logs.push({
                ...log,
                activity_title: occ.activity_title,
                category_name: occ.category_name,
                scheduled_date: occ.scheduled_date,
              })
            }
          }
        }
        setWorkLogs(logs)
      })
      .catch(() => toast.error('Failed to load pending approvals'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchWorkLogs() }, [selectedBranch])

  // Only show completed work logs (after photo submitted) that need review, plus already reviewed ones
  const getApprovalStatus = (log) => {
    if (log.approval_status === 'approved') return 'approved'
    if (log.approval_status === 'rejected') return 'rejected'
    if (log.status === 'completed') return 'pending' // completed work log awaiting review
    return 'in_progress' // still working, not ready for review
  }

  const reviewableLogs = workLogs.filter((log) => getApprovalStatus(log) !== 'in_progress')
  const filtered = reviewableLogs.filter((log) => activeTab === 'all' || getApprovalStatus(log) === activeTab)

  const counts = {
    pending: reviewableLogs.filter((l) => getApprovalStatus(l) === 'pending').length,
    approved: reviewableLogs.filter((l) => getApprovalStatus(l) === 'approved').length,
    rejected: reviewableLogs.filter((l) => getApprovalStatus(l) === 'rejected').length,
  }

  const tabs = [
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
    { key: 'all', label: 'All Logs' },
  ]

  const handleApprove = (id) => {
    api.patch(`/work-logs/${id}/review/`, { approval_status: 'approved' })
      .then(() => {
        toast.success('Work log approved successfully')
        fetchWorkLogs()
        setDetailModal(null)
      })
      .catch((err) => toast.error(parseApiError(err)))
  }

  const handleReject = () => {
    if (!rejectReason.trim()) return
    api.patch(`/work-logs/${rejectModal.id}/review/`, {
      approval_status: 'rejected',
      rejection_reason: rejectReason,
    })
      .then(() => {
        toast.success('Work log rejected')
        setRejectModal(null)
        setRejectReason('')
        setDetailModal(null)
        fetchWorkLogs()
      })
      .catch((err) => toast.error(parseApiError(err)))
  }

  const openReject = (log) => {
    setRejectModal(log)
    setRejectReason('')
  }

  const resolvePhoto = (url) => {
    if (!url) return null
    return url.startsWith('http') ? url : `http://localhost:8000${url}`
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#6b7280]">Loading...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h3 className="font-serif text-lg font-bold">Pending Approvals</h3>
            <p className="text-[13px] text-[#6b7280] mt-0.5">Review and approve work logs submitted by vendors</p>
          </div>
          {user?.role === 'superadmin' && (
            <BranchFilter value={selectedBranch} onChange={(val) => { setSelectedBranch(val); setCurrentPage(1) }} />
          )}
        </div>
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
            <div className="text-[11px] text-[#6b7280] mt-0.5">Work logs approved</div>
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
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Activity</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Category</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Date</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Status</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => {
              const status = getApprovalStatus(log)
              return (
                <tr key={log.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-orchid-light flex items-center justify-center text-[11px] font-bold text-orchid">
                        {(log.user_name || 'U').split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span className="font-semibold text-[13px]">{log.user_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[13px]">{log.activity_title || '-'}</td>
                  <td className="px-4 py-3.5">
                    {log.category_name && (
                      <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fc] text-[#2563a8]">
                        {log.category_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-[#6b7280]">{log.after_photo_taken_at ? new Date(log.after_photo_taken_at).toLocaleDateString() : log.scheduled_date}</td>
                  <td className="px-4 py-3.5">
                    <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusStyles[status]}`}>
                      {status}
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
                      {status === 'pending' && (
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
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-[13px] text-[#6b7280]">No work logs found</td></tr>
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
          <div className="bg-white rounded-2xl shadow-xl w-[520px] max-w-[90vw] max-h-[90vh] overflow-auto">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Work Log Details</h3>
              <button onClick={() => setDetailModal(null)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orchid-light flex items-center justify-center text-sm font-bold text-orchid">
                  {(detailModal.user_name || 'U').split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-[15px]">{detailModal.user_name || 'Unknown'}</p>
                  <p className="text-xs text-[#6b7280]">{detailModal.activity_title} · {detailModal.category_name || ''}</p>
                </div>
                <span className={`ml-auto badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusStyles[getApprovalStatus(detailModal)]}`}>
                  {getApprovalStatus(detailModal)}
                </span>
              </div>

              {detailModal.description && (
                <div>
                  <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Work Description</span>
                  <p className="text-[13px] mt-1.5 leading-relaxed">{detailModal.description}</p>
                </div>
              )}

              {/* Photos */}
              <div className="flex gap-4">
                {detailModal.before_photo && (
                  <div className="flex-1">
                    <p className="text-[11px] text-[#6b7280] mb-1 font-medium">Before</p>
                    <img src={resolvePhoto(detailModal.before_photo)} alt="Before" className="w-full h-40 object-cover rounded-lg border border-[#e4e8ed]" />
                    {detailModal.before_photo_taken_at && (
                      <p className="text-[10px] text-[#6b7280] mt-1">{new Date(detailModal.before_photo_taken_at).toLocaleString()}</p>
                    )}
                  </div>
                )}
                {detailModal.after_photo && (
                  <div className="flex-1">
                    <p className="text-[11px] text-[#6b7280] mb-1 font-medium">After</p>
                    <img src={resolvePhoto(detailModal.after_photo)} alt="After" className="w-full h-40 object-cover rounded-lg border border-[#e4e8ed]" />
                    {detailModal.after_photo_taken_at && (
                      <p className="text-[10px] text-[#6b7280] mt-1">{new Date(detailModal.after_photo_taken_at).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>

              {detailModal.rejection_reason && (
                <div className="bg-[#fdecea] border border-[#f0c0c0] rounded-lg px-3.5 py-3">
                  <p className="text-xs font-semibold text-[#c0392b]">Rejection Reason</p>
                  <p className="text-xs text-[#c0392b] mt-1">{detailModal.rejection_reason}</p>
                </div>
              )}

              {detailModal.reviewed_by_name && (
                <p className="text-[11px] text-[#6b7280]">Reviewed by {detailModal.reviewed_by_name}</p>
              )}
            </div>

            {getApprovalStatus(detailModal) === 'pending' && (
              <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
                <button onClick={() => openReject(detailModal)} className="px-4 py-2 border-[1.5px] border-[#c0392b] text-[#c0392b] rounded-lg text-[13px] font-semibold hover:bg-[#fdecea] transition-colors">
                  Reject
                </button>
                <button onClick={() => handleApprove(detailModal.id)} className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid transition-colors">
                  Approve <CheckOutlined />
                </button>
              </div>
            )}

            {getApprovalStatus(detailModal) !== 'pending' && (
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
                <p className="font-semibold text-[15px] mt-0.5">{rejectModal.user_name || 'Unknown'}</p>
                <p className="text-xs text-[#6b7280]">{rejectModal.activity_title}</p>
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
