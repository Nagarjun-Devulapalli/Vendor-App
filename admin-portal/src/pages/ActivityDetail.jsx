import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ExclamationCircleOutlined } from '@ant-design/icons'

const statusStyles = {
  pending: 'bg-[#fef3e0] text-[#b07200]',
  in_progress: 'bg-[#e8f0fc] text-[#2563a8]',
  completed: 'bg-[#e8f5ee] text-[#1a6b4a]',
  missed: 'bg-[#fdecea] text-[#c0392b]',
  cancelled: 'bg-[#fdecea] text-[#c0392b]',
}

const approvalStyles = {
  pending: 'bg-[#fef3e0] text-[#b07200]',
  approved: 'bg-[#e8f5ee] text-[#1a6b4a]',
  rejected: 'bg-[#fdecea] text-[#c0392b]',
}

export default function ActivityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activity, setActivity] = useState(null)
  const [occurrences, setOccurrences] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectingLogId, setRejectingLogId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchData = () => {
    Promise.all([
      api.get(`/activities/${id}/`),
      api.get(`/activities/${id}/occurrences/`),
    ])
      .then(([actRes, occRes]) => {
        setActivity(actRes.data)
        setOccurrences(occRes.data.results || occRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleApprove = (logId) => {
    api.patch(`/work-logs/${logId}/review/`, { approval_status: 'approved' })
      .then(() => fetchData())
      .catch(console.error)
  }

  const handleReject = (logId, reason) => {
    api.patch(`/work-logs/${logId}/review/`, { approval_status: 'rejected', rejection_reason: reason })
      .then(() => {
        setRejectingLogId(null)
        setRejectReason('')
        fetchData()
      })
      .catch(console.error)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#6b7280]">Loading...</div>
  if (!activity) return <div className="text-center text-[#6b7280]">Activity not found</div>

  const isRecurring = activity.activity_type === 'recurring'
  const allWorkLogs = occurrences.flatMap((occ) => (occ.work_logs || []).map((log) => ({ ...log, _occ: occ })))
  const latestLog = allWorkLogs[allWorkLogs.length - 1]

  // For recurring: show progress
  const completed = occurrences.filter(o => o.status === 'completed').length
  const total = occurrences.length

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/activities')} className="text-orchid hover:underline text-[13px] font-medium">&larr; Back to Activities</button>

      {/* Activity Info */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="font-serif text-2xl font-bold">{activity.title}</h1>
            {activity.is_overdue && (
              <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fdecea] text-[#c0392b] mt-1"><ExclamationCircleOutlined /> Overdue</span>
            )}
          </div>
          <span className={`badge inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusStyles[activity.status] || 'bg-[#f0f1f3] text-[#555]'}`}>
            {activity.status?.replace('_', ' ')}
          </span>
        </div>
        {activity.description && <p className="text-[13px] text-[#6b7280] mb-4">{activity.description}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
          <div><span className="text-[#6b7280]">Vendor:</span> <span className="font-medium">{activity.vendor_name}</span></div>
          <div><span className="text-[#6b7280]">Category:</span> <span className="font-medium">{activity.category_name}</span></div>
          <div><span className="text-[#6b7280]">Type:</span> <span className="font-medium capitalize">{activity.activity_type?.replace('_', ' ')}</span></div>
          <div><span className="text-[#6b7280]">Cost:</span> <span className="font-semibold tabular-nums">₹{Number(activity.expected_cost).toLocaleString()}</span></div>
          <div><span className="text-[#6b7280]">Start:</span> <span className="font-medium">{activity.start_date}</span></div>
          <div><span className="text-[#6b7280]">End:</span> <span className="font-medium">{activity.end_date || 'N/A'}</span></div>
          <div><span className="text-[#6b7280]">Payment:</span> <span className="font-medium capitalize">{activity.payment_type}</span></div>
          {isRecurring && (
            <div><span className="text-[#6b7280]">Occurrences:</span> <span className="font-medium">{completed}/{total} completed</span></div>
          )}
          {!isRecurring && latestLog && (
            <div>
              <span className="text-[#6b7280]">Work Status:</span>{' '}
              <span className={`font-semibold ${latestLog.approval_status === 'approved' ? 'text-[#1a6b4a]' : latestLog.approval_status === 'rejected' ? 'text-[#c0392b]' : latestLog.status === 'completed' ? 'text-[#2563a8]' : 'text-[#b07200]'}`}>
                {latestLog.approval_status === 'approved' ? 'Approved' : latestLog.approval_status === 'rejected' ? 'Rejected — Resubmission Pending' : latestLog.status === 'completed' ? 'Awaiting Review' : 'Work In Progress'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Occurrences — only show table for recurring activities */}
      {isRecurring && (
        <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e4e8ed]">
            <h3 className="font-serif text-base font-bold">Occurrences ({occurrences.length})</h3>
          </div>
          <div className="overflow-auto max-h-96">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed] sticky top-0">
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Date</th>
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Status</th>
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Completed By</th>
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Work Logs</th>
                </tr>
              </thead>
              <tbody>
                {occurrences.map((occ) => (
                  <tr key={occ.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] transition-colors">
                    <td className="px-4 py-3 text-[13px]">{occ.scheduled_date}</td>
                    <td className="px-4 py-3">
                      <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[occ.status] || 'bg-[#f0f1f3] text-[#555]'}`}>
                        {occ.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px]">{occ.completed_by_name || occ.completed_by || '-'}</td>
                    <td className="px-4 py-3 text-[13px]">{occ.work_logs?.length || occ.work_log_count || 0}</td>
                  </tr>
                ))}
                {occurrences.length === 0 && <tr><td colSpan="4" className="px-4 py-6 text-center text-[13px] text-[#6b7280]">No occurrences</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Work Logs */}
      {occurrences.some((o) => o.work_logs?.length > 0) && (
        <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e4e8ed]">
            <h3 className="font-serif text-base font-bold">Work Logs</h3>
          </div>
          <div className="p-5 space-y-4">
            {occurrences.filter((o) => o.work_logs?.length > 0).flatMap((occ) =>
              occ.work_logs.map((log) => (
                <div key={log.id} className="border border-[#e4e8ed] rounded-xl p-4">
                  <div className="flex justify-between text-[13px] text-[#6b7280] mb-2">
                    <span>{isRecurring ? `Date: ${occ.scheduled_date}` : `Started: ${log.before_photo_taken_at ? new Date(log.before_photo_taken_at).toLocaleDateString() : occ.scheduled_date}`}</span>
                    <div className="flex items-center gap-2">
                      {log.status === 'in_progress' && (!log.approval_status || log.approval_status === 'pending') && (
                        <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fc] text-[#2563a8]">
                          Work In Progress
                        </span>
                      )}
                      {log.status === 'completed' && (!log.approval_status || log.approval_status === 'pending') && (
                        <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef3e0] text-[#b07200]">
                          Awaiting Review
                        </span>
                      )}
                      {log.approval_status === 'approved' && (
                        <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f5ee] text-[#1a6b4a]">
                          Approved
                        </span>
                      )}
                      {log.approval_status === 'rejected' && (
                        <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fdecea] text-[#c0392b]">
                          Rejected — Resubmission Pending
                        </span>
                      )}
                      <span>By: {log.user_name || log.user}</span>
                    </div>
                  </div>
                  {log.description && <p className="text-[13px] text-[#1a1f2e] mb-3">{log.description}</p>}
                  <div className="flex gap-4">
                    {log.before_photo && (
                      <div>
                        <p className="text-[11px] text-[#6b7280] mb-1 font-medium">Before</p>
                        <img src={log.before_photo.startsWith('http') ? log.before_photo : `http://localhost:8000${log.before_photo}`} alt="Before" className="w-40 h-32 object-cover rounded-lg border border-[#e4e8ed]" />
                        {log.before_photo_taken_at && (
                          <p className="text-[10px] text-[#6b7280] mt-1">{new Date(log.before_photo_taken_at).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                    {log.after_photo && (
                      <div>
                        <p className="text-[11px] text-[#6b7280] mb-1 font-medium">After</p>
                        <img src={log.after_photo.startsWith('http') ? log.after_photo : `http://localhost:8000${log.after_photo}`} alt="After" className="w-40 h-32 object-cover rounded-lg border border-[#e4e8ed]" />
                        {log.after_photo_taken_at && (
                          <p className="text-[10px] text-[#6b7280] mt-1">{new Date(log.after_photo_taken_at).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                    {!log.after_photo && log.status === 'in_progress' && (
                      <div className="flex items-center gap-2 text-[12px] text-[#6b7280] italic">
                        After photo not yet submitted
                      </div>
                    )}
                  </div>
                  {/* Approval Actions — only show when work log is completed (after photo submitted) and pending review */}
                  <div className="mt-3 pt-3 border-t border-[#e4e8ed]">
                    {log.status === 'completed' && (!log.approval_status || log.approval_status === 'pending') && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(log.id)}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#e8f5ee] text-[#1a6b4a] hover:bg-[#d0ebdd] transition-colors"
                        >
                          Approve
                        </button>
                        {rejectingLogId === log.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason for rejection..."
                              className="flex-1 px-3 py-1.5 rounded-lg text-[12px] border border-[#e4e8ed] focus:outline-none focus:border-orchid"
                            />
                            <button
                              onClick={() => handleReject(log.id, rejectReason)}
                              disabled={!rejectReason.trim()}
                              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#fdecea] text-[#c0392b] hover:bg-[#fad4d1] transition-colors disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => { setRejectingLogId(null); setRejectReason('') }}
                              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#6b7280] hover:bg-[#f0f1f3] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRejectingLogId(log.id)}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#fdecea] text-[#c0392b] hover:bg-[#fad4d1] transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    )}
                    {log.approval_status === 'rejected' && log.rejection_reason && (
                      <p className="text-[12px] text-[#c0392b] mt-1">Reason: {log.rejection_reason}</p>
                    )}
                    {(log.approval_status === 'approved' || log.approval_status === 'rejected') && log.reviewed_by_name && (
                      <p className="text-[11px] text-[#6b7280] mt-1">Reviewed by {log.reviewed_by_name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* No work logs yet */}
      {!isRecurring && allWorkLogs.length === 0 && activity.status !== 'completed' && (
        <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm p-6 text-center">
          <p className="text-[13px] text-[#6b7280]">No work log submitted yet. The vendor needs to start work from the mobile app.</p>
        </div>
      )}
    </div>
  )
}
