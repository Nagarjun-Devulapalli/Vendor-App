import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
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
  const [activities, setActivities] = useState([])
  const [vendors, setVendors] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState(null)
  const navigate = useNavigate()
  const searchRef = useRef(null)

  const [form, setForm] = useState({
    title: '', description: '', vendor: '', category: '', activity_type: 'one_time',
    start_date: '', end_date: '', recurrence_interval_days: '', expected_cost: '', payment_type: 'contract',
  })

  const fetchActivities = () => {
    let url = '/activities/?'
    if (filterStatus) url += `status=${filterStatus}&`
    if (filterType) url += `activity_type=${filterType}&`
    api.get(url).then((res) => setActivities(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchActivities(); setCurrentPage(1) }, [filterStatus, filterType])
  useEffect(() => {
    api.get('/vendors/').then((res) => setVendors(res.data.results || res.data)).catch(console.error)
    api.get('/categories/').then((res) => setCategories(res.data.results || res.data)).catch(console.error)
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
      setForm({ title: '', description: '', vendor: '', category: '', activity_type: 'one_time', start_date: '', end_date: '', recurrence_interval_days: '', expected_cost: '', payment_type: 'contract' })
      fetchActivities()
    } catch (err) {
      alert(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Error')
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

  if (loading) return <div className="flex items-center justify-center h-64 text-[#6b7280]">Loading...</div>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[200px_1fr_auto] items-center gap-6">
        <div>
          <h3 className="font-serif text-lg font-bold">All Activities</h3>
          <p className="text-[13px] text-[#6b7280] mt-0.5">{activities.length} activities across all vendors</p>
        </div>

        {/* Search Bar with Suggestions */}
        <div ref={searchRef} className="relative">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
              placeholder="Search activities..."
              className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg pl-10 pr-10 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors"
            />
            <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            {(searchQuery || selectedActivityId) && (
              <button
                onClick={clearFilter}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#1a1f2e] text-lg font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e4e8ed] rounded-lg shadow-lg z-50 overflow-hidden">
              {suggestions.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => handleSuggestionClick(activity)}
                  className="w-full px-4 py-3 text-left hover:bg-[#f6f7f9] transition-colors border-b border-[#e4e8ed] last:border-0"
                >
                  <div className="font-semibold text-[13px] text-[#1a1f2e]">
                    {activity.title}
                  </div>
                  <div className="text-[11px] text-[#6b7280] mt-0.5">
                    {activity.vendor_name} · {activity.category_name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2.5">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border-[1.5px] border-[#e4e8ed] rounded-lg px-3 py-2 text-[13px] focus:border-orchid focus:outline-none">
            <option value="">All Types</option>
            <option value="one_time">One-time</option>
            <option value="long_term">Long-term</option>
            <option value="recurring">Recurring</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border-[1.5px] border-[#e4e8ed] rounded-lg px-3 py-2 text-[13px] focus:border-orchid focus:outline-none">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid transition-colors">
            + Create Activity
          </button>
        </div>
      </div>

      {/* Active filter indicator */}
      {selectedActivityId && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#6b7280]">Showing:</span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-orchid-light text-orchid rounded-lg font-medium">
            {activities.find(a => a.id === selectedActivityId)?.title}
            <button onClick={clearFilter} className="hover:text-orchid-dark">✕</button>
          </span>
        </div>
      )}

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
            {pagedActivities.map((a) => (
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
            {filteredActivities.length === 0 && (
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                <select value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors">
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
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Expected Cost (₹) *</label>
                  <input type="number" value={form.expected_cost} onChange={(e) => setForm({ ...form, expected_cost: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Payment Type *</label>
                  <select value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors">
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid disabled:opacity-50 transition-colors">
                {submitting ? 'Creating...' : 'Create Activity →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
