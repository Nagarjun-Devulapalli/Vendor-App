import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast, parseApiError } from '../components/Toast'
import BranchFilter from '../components/BranchFilter'
import { ExclamationCircleOutlined, SearchOutlined } from '@ant-design/icons'
import Pagination from '../components/Pagination'

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

export default function Activities() {
  const { user } = useAuth()
  const toast = useToast()
  const [activities, setActivities] = useState([])
  const [vendors, setVendors] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState(null)
  const navigate = useNavigate()
  const searchRef = useRef(null)

  const [form, setForm] = useState({
    title: '', description: '', vendor: '', category: '', activity_type: 'one_time',
    start_date: '', end_date: '', recurrence_interval_days: '', expected_cost: '', payment_type: '',
  })

  const fetchActivities = () => {
    let url = '/activities/?'
    if (selectedBranch) url += `branch=${selectedBranch}&`
    if (filterStatus) url += `status=${filterStatus}&`
    if (filterType) url += `activity_type=${filterType}&`
    api.get(url).then((res) => setActivities(res.data.results || res.data)).catch(() => toast.error('Failed to load activities')).finally(() => setLoading(false))
  }

  useEffect(() => { fetchActivities(); setCurrentPage(1) }, [filterStatus, filterType, selectedBranch])
  useEffect(() => {
    api.get('/vendors/').then((res) => setVendors(res.data.results || res.data)).catch(() => toast.error('Failed to load vendors'))
    api.get('/categories/').then((res) => setCategories(res.data.results || res.data)).catch(() => toast.error('Failed to load categories'))
  }, [])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { ...form }
      if (!payload.end_date) delete payload.end_date
      if (!payload.recurrence_interval_days) delete payload.recurrence_interval_days
      await api.post('/activities/', payload)
      setShowModal(false)
      setForm({ title: '', description: '', vendor: '', category: '', activity_type: 'one_time', start_date: '', end_date: '', recurrence_interval_days: '', expected_cost: '', payment_type: '' })
      toast.success('Activity created successfully')
      fetchActivities()
    } catch (err) {
      toast.error(parseApiError(err, 'Error creating activity'))
    } finally {
      setSubmitting(false)
    }
  }

  // Search and filter logic
  const matchesSearch = (activity, query) => {
    if (!query) return true
    const q = query.toLowerCase()
    const activityTitle = (activity.title || '').toLowerCase()
    const vendorName = (activity.vendor_name || '').toLowerCase()
    const categoryName = (activity.category_name || '').toLowerCase()

    return activityTitle.includes(q) || vendorName.includes(q) || categoryName.includes(q)
  }

  const getSuggestions = () => {
    if (!searchQuery.trim()) return []
    return activities.filter(a => matchesSearch(a, searchQuery)).slice(0, 5)
  }

  const handleSearchChange = (value) => {
    setSearchQuery(value)
    setShowSuggestions(value.trim().length > 0)
    setSelectedActivityId(null)
    setCurrentPage(1)
  }

  const handleSuggestionClick = (activity) => {
    setSearchQuery('')
    setShowSuggestions(false)
    setSelectedActivityId(activity.id)
  }

  const clearFilter = () => {
    setSearchQuery('')
    setSelectedActivityId(null)
    setShowSuggestions(false)
  }

  const filteredActivities = selectedActivityId
    ? activities.filter(a => a.id === selectedActivityId)
    : activities.filter(a => matchesSearch(a, searchQuery))

  const pagedActivities = filteredActivities.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const suggestions = getSuggestions()


  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {user?.role === 'superadmin' && (
          <BranchFilter value={selectedBranch} onChange={(val) => { setSelectedBranch(val); setCurrentPage(1) }} />
        )}

        {/* Large Search Bar */}
        <div ref={searchRef} className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search activities..."
            className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors"
          />
          <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        </div>

        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border-[1.5px] border-[#e4e8ed] rounded-lg px-3 py-2 text-[13px] focus:border-orchid focus:outline-none whitespace-nowrap">
          <option value="">All Types</option>
          <option value="one_time">One-time</option>
          <option value="long_term">Long-term</option>
          <option value="recurring">Recurring</option>
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border-[1.5px] border-[#e4e8ed] rounded-lg px-3 py-2 text-[13px] focus:border-orchid focus:outline-none whitespace-nowrap">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid transition-colors whitespace-nowrap">
          + Create Activity
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Activity</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Vendor</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Type</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Schedule</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Budget</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#e4e8ed] animate-pulse">
                    <td className="px-4 py-3.5"><div className="space-y-1.5"><div className="h-3 bg-[#e4e8ed] rounded w-36" /><div className="h-2.5 bg-[#e4e8ed] rounded w-20" /></div></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-28" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 bg-[#e4e8ed] rounded-full w-16" /></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-24" /></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-16" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 bg-[#e4e8ed] rounded-full w-20" /></td>
                  </tr>
                ))
              : pagedActivities.map((a, i) => (
              <tr key={a.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] cursor-pointer animate-fade-in" style={{ animationDelay: `${i * 40}ms` }} onClick={() => navigate(`/activities/${a.id}`)}>
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
            {!loading && filteredActivities.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-[13px] text-[#6b7280]">
                {searchQuery || selectedActivityId ? 'No activities match your search' : 'No activities found'}
              </td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredActivities.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Create Activity Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[90vw] max-h-[90vh] overflow-auto">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Create Activity</h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <form id="activity-form" onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" rows="2" />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, vendor: '' })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required>
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Vendor *</label>
                  <select value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" disabled={!form.category} required>
                    <option value="">{form.category ? 'Select vendor' : 'Select category first'}</option>
                    {(form.category ? vendors.filter((v) => v.categories?.includes(Number(form.category))) : []).map((v) => <option key={v.id} value={v.id}>{v.display_name || v.company_name || `${v.user?.first_name} ${v.user?.last_name}`}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Activity Type *</label>
                <select
                  value={form.activity_type}
                  onChange={(e) => {
                    setForm({ ...form, activity_type: e.target.value, payment_type: '', expected_cost: '' })
                  }}
                  className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors">
                  <option value="one_time">One Time</option>
                  <option value="long_term">Long Term</option>
                  <option value="recurring">Recurring</option>
                </select>
              </div>
              {form.activity_type === 'recurring' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Recurrence Interval (days)</label>
                  <input type="number" value={form.recurrence_interval_days} onChange={(e) => setForm({ ...form, recurrence_interval_days: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" min="1" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
                </div>
                {form.activity_type !== 'one_time' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">End Date</label>
                    <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Payment Type *</label>
                  <select value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required>
                    <option value="">Select payment type</option>
                    {form.activity_type === 'recurring'
                      ? <>
                          <option value="per_occurrence">Per Occurrence</option>
                          <option value="daily">Daily Wage</option>
                        </>
                      : <>
                          <option value="contract">Contract</option>
                          <option value="daily">Daily Wage</option>
                        </>
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">
                    {form.payment_type === 'contract' ? 'Total Amount (₹) *' : form.payment_type === 'daily' ? 'Daily Rate (₹) *' : form.payment_type === 'per_occurrence' ? 'Rate Per Occurrence (₹) *' : 'Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    value={form.expected_cost}
                    onChange={(e) => setForm({ ...form, expected_cost: e.target.value })}
                    disabled={!form.payment_type}
                    className={`w-full border-[1.5px] rounded-lg px-3.5 py-2.5 text-sm transition-colors ${!form.payment_type ? 'border-[#e4e8ed] bg-[#f6f7f9] opacity-50 cursor-not-allowed' : 'border-[#e4e8ed] focus:border-orchid focus:outline-none'}`}
                    required
                  />
                </div>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button type="submit" form="activity-form" disabled={submitting} className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid disabled:opacity-50 transition-colors">
                {submitting ? 'Creating...' : 'Create Activity →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
