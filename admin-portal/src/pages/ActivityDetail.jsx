import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ExclamationCircleOutlined, UserOutlined, CheckCircleOutlined, ClockCircleOutlined, PictureOutlined } from '@ant-design/icons'

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
  const [previewImg, setPreviewImg] = useState(null)

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

  const completed = occurrences.filter(o => o.status === 'completed').length
  const total = occurrences.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  // Collect all work logs with their occurrence context
  const allLogs = occurrences
    .filter(o => o.work_logs?.length > 0)
    .flatMap(occ => occ.work_logs.map(log => ({ ...log, scheduled_date: occ.scheduled_date, assignments: occ.assignments })))

  // Split into pending (for approval) and past (approved/rejected)
  const pendingLogs = allLogs.filter(l => !l.approval_status || l.approval_status === 'pending')
  const pastLogs = allLogs.filter(l => l.approval_status === 'approved' || l.approval_status === 'rejected')

  // Collect unique employees from all occurrences
  const employeeMap = {}
  occurrences.forEach(occ => {
    occ.assignments?.forEach(a => { employeeMap[a.employee_id || a.id] = a.employee_name || a.name })
    occ.work_logs?.forEach(l => { if (l.user_name) employeeMap[l.user || l.id] = l.user_name })
  })
  const employees = Object.values(employeeMap)

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/activities')} className="text-orchid hover:underline text-[13px] font-medium">&larr; Back to Activities</button>

      {/* Activity Info Header */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
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
        {activity.description && <p className="text-[13px] text-[#6b7280] mb-5">{activity.description}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3.5 text-[13px]">
          <div><span className="text-[#6b7280]">Vendor:</span> <span className="font-medium">{activity.vendor_name}</span></div>
          <div><span className="text-[#6b7280]">Category:</span> <span className="font-medium">{activity.category_name}</span></div>
          <div><span className="text-[#6b7280]">Activity Type:</span> <span className="font-medium capitalize">{activity.activity_type?.replace('_', ' ')}</span></div>
          <div><span className="text-[#6b7280]">Cost:</span> <span className="font-semibold tabular-nums">₹{Number(activity.expected_cost).toLocaleString()}</span></div>
          <div><span className="text-[#6b7280]">Start Date:</span> <span className="font-medium">{activity.start_date}</span></div>
          <div><span className="text-[#6b7280]">Completion Date:</span> <span className="font-medium">{activity.end_date || 'N/A'}</span></div>
          <div><span className="text-[#6b7280]">Payment Basis:</span> <span className="font-medium capitalize">{activity.payment_type}</span></div>
          <div>
            <span className="text-[#6b7280]">Progress:</span> <span className="font-medium">{progress}% ({completed}/{total})</span>
            <div className="progress-bar mt-1">
              <div className="progress-fill" style={{ width: `${progress}%`, background: progress === 100 ? '#1a6b4a' : '#2563a8' }} />
            </div>
          </div>
        </div>

        {/* Employees */}
        {employees.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#e4e8ed]">
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Employees Worked</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {employees.map((name, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f6f7f9] border border-[#e4e8ed] rounded-lg text-[12px] font-medium">
                  <UserOutlined className="text-[#6b7280]" /> {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========== SUBMITTED LOGS FOR APPROVAL (Detailed) ========== */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e8ed] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockCircleOutlined className="text-[#b07200]" />
            <h3 className="font-serif text-base font-bold">Submitted for Approval</h3>
          </div>
          {pendingLogs.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#fef3e0] text-[#b07200]">{pendingLogs.length} pending</span>
          )}
        </div>

        {pendingLogs.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#6b7280]">No work logs awaiting approval</div>
        ) : (
          <div className="p-5 space-y-5">
            {pendingLogs.map((log) => (
              <div key={log.id} className="border border-[#e4e8ed] rounded-xl overflow-hidden">
                {/* Log Header */}
                <div className="bg-[#f6f7f9] px-5 py-3 flex items-center justify-between border-b border-[#e4e8ed]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orchid-light flex items-center justify-center text-[11px] font-bold text-orchid">
                      {(log.user_name || '?').split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-[13px]">{log.user_name || 'Employee'}</p>
                      <p className="text-[11px] text-[#6b7280]">{log.scheduled_date}</p>
                    </div>
                  </div>
                  <p className="text-[13px] text-[#1a1f2e] mb-3">{log.description}</p>
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
                  </div>
                  {/* Approval Actions */}
                  <div className="mt-3 pt-3 border-t border-[#e4e8ed]">
                    {(!log.approval_status || log.approval_status === 'pending') && (
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

                {/* Log Details */}
                <div className="px-5 py-4 space-y-4">
                  {/* Activity Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
                    <div className="bg-[#f6f7f9] rounded-lg px-3 py-2">
                      <span className="text-[#6b7280] block text-[10px] uppercase tracking-wider font-semibold">Vendor</span>
                      <span className="font-medium">{activity.vendor_name}</span>
                    </div>
                    <div className="bg-[#f6f7f9] rounded-lg px-3 py-2">
                      <span className="text-[#6b7280] block text-[10px] uppercase tracking-wider font-semibold">Category</span>
                      <span className="font-medium">{activity.category_name}</span>
                    </div>
                    <div className="bg-[#f6f7f9] rounded-lg px-3 py-2">
                      <span className="text-[#6b7280] block text-[10px] uppercase tracking-wider font-semibold">Activity Type</span>
                      <span className="font-medium capitalize">{activity.activity_type?.replace('_', ' ')}</span>
                    </div>
                    <div className="bg-[#f6f7f9] rounded-lg px-3 py-2">
                      <span className="text-[#6b7280] block text-[10px] uppercase tracking-wider font-semibold">Payment Basis</span>
                      <span className="font-medium capitalize">{activity.payment_type}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {log.description && (
                    <div>
                      <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Work Description</span>
                      <p className="text-[13px] text-[#1a1f2e] mt-1 leading-relaxed">{log.description}</p>
                    </div>
                  )}

                  {/* Employees on this log */}
                  {log.assignments?.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Assigned Employees</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {log.assignments.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f6f7f9] border border-[#e4e8ed] rounded-md text-[11px] font-medium">
                            <UserOutlined className="text-[#6b7280] text-[10px]" /> {a.employee_name || a.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photos Section */}
                  {(log.before_photo || log.after_photo) && (
                    <div className="space-y-3">
                      <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider flex items-center gap-1"><PictureOutlined /> Photos</span>

                      {/* Before Photos Row */}
                      {log.before_photo && (
                        <div>
                          <p className="text-[11px] font-semibold text-[#1a1f2e] mb-1.5">Before Starting Work</p>
                          <div className="flex gap-3 overflow-x-auto pb-1">
                            <div className="flex-shrink-0 group cursor-pointer" onClick={() => setPreviewImg(`http://localhost:8000${log.before_photo}`)}>
                              <img src={`http://localhost:8000${log.before_photo}`} alt="Before" className="w-44 h-32 object-cover rounded-lg border border-[#e4e8ed] group-hover:border-orchid transition-colors" />
                              {log.before_photo_taken_at && (
                                <p className="text-[10px] text-[#6b7280] mt-1 flex items-center gap-1">
                                  <ClockCircleOutlined className="text-[9px]" /> {new Date(log.before_photo_taken_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* After Photos Row */}
                      {log.after_photo && (
                        <div>
                          <p className="text-[11px] font-semibold text-[#1a1f2e] mb-1.5">After Completing Work</p>
                          <div className="flex gap-3 overflow-x-auto pb-1">
                            <div className="flex-shrink-0 group cursor-pointer" onClick={() => setPreviewImg(`http://localhost:8000${log.after_photo}`)}>
                              <img src={`http://localhost:8000${log.after_photo}`} alt="After" className="w-44 h-32 object-cover rounded-lg border border-[#e4e8ed] group-hover:border-orchid transition-colors" />
                              {log.after_photo_taken_at && (
                                <p className="text-[10px] text-[#6b7280] mt-1 flex items-center gap-1">
                                  <ClockCircleOutlined className="text-[9px]" /> {new Date(log.after_photo_taken_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Approval Actions */}
                <div className="px-5 py-3 border-t border-[#e4e8ed] bg-[#fafbfc]">
                  {rejectingLogId === log.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="flex-1 px-3 py-2 rounded-lg text-[12px] border border-[#e4e8ed] focus:outline-none focus:border-orchid"
                        autoFocus
                      />
                      <button
                        onClick={() => handleReject(log.id, rejectReason)}
                        disabled={!rejectReason.trim()}
                        className="px-3.5 py-2 rounded-lg text-[12px] font-semibold bg-[#c0392b] text-white hover:bg-[#a93226] transition-colors disabled:opacity-50"
                      >
                        Confirm Reject
                      </button>
                      <button
                        onClick={() => { setRejectingLogId(null); setRejectReason('') }}
                        className="px-3 py-2 rounded-lg text-[12px] font-semibold text-[#6b7280] hover:bg-[#f0f1f3] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(log.id)}
                        className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-[#e8f5ee] text-[#1a6b4a] hover:bg-[#d0ebdd] transition-colors"
                      >
                        <CheckCircleOutlined className="mr-1" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectingLogId(log.id)}
                        className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-[#fdecea] text-[#c0392b] hover:bg-[#fad4d1] transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== PAST COMPLETED LOGS (Brief) ========== */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e8ed] flex items-center gap-2">
          <CheckCircleOutlined className="text-[#1a6b4a]" />
          <h3 className="font-serif text-base font-bold">Past Completed Logs</h3>
          {pastLogs.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#e8f5ee] text-[#1a6b4a] ml-auto">{pastLogs.length} logs</span>
          )}
        </div>

        {pastLogs.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#6b7280]">No past completed logs</div>
        ) : (
          <div className="divide-y divide-[#e4e8ed]">
            {pastLogs.map((log) => (
              <div key={log.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-[#f9fafb] transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#f6f7f9] flex items-center justify-center text-[11px] font-bold text-[#6b7280]">
                  {(log.user_name || '?').split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[13px]">{log.user_name || 'Employee'}</span>
                    <span className="text-[11px] text-[#6b7280]">{log.scheduled_date}</span>
                  </div>
                  <p className="text-[12px] text-[#6b7280] truncate mt-0.5">{log.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(log.before_photo || log.after_photo) && (
                    <span className="text-[10px] text-[#6b7280]"><PictureOutlined /></span>
                  )}
                  <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${approvalStyles[log.approval_status] || approvalStyles.pending}`}>
                    {log.approval_status}
                  </span>
                </div>
                {log.reviewed_by_name && (
                  <span className="text-[10px] text-[#6b7280] flex-shrink-0">by {log.reviewed_by_name}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImg && (
        <div className="fixed inset-0 bg-black/60 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={() => setPreviewImg(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button onClick={() => setPreviewImg(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e] z-10">✕</button>
            <img src={previewImg} alt="Preview" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  )
}
