import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast, parseApiError } from '../components/Toast'
import BranchFilter from '../components/BranchFilter'
import { DeleteOutlined, CameraOutlined, CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 10

export default function Vendors() {
  const { user } = useAuth()
  const toast = useToast()
  const [vendors, setVendors] = useState([])
  const [branches, setBranches] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [employeeCountMap, setEmployeeCountMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [form, setForm] = useState({ company_name: '', first_name: '', last_name: '', phone: '', aadhar_number: '', branch: '', category_ids: [] })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const navigate = useNavigate()
  const searchRef = useRef(null)

  const fetchVendors = () => {
    setLoading(true)
    let url = '/vendors/'
    if (selectedBranch) url += `?branch=${selectedBranch}`
    api.get(url).then((res) => setVendors(res.data.results || res.data)).catch(() => toast.error('Failed to load vendors')).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchVendors()
  }, [selectedBranch])

  useEffect(() => {
    api.get('/branches/').then((res) => setBranches(res.data.results || res.data)).catch(() => toast.error('Failed to load branches'))
    api.get('/categories/').then((res) => setCategories(res.data.results || res.data)).catch(() => toast.error('Failed to load categories'))
    api.get('/employees/').then((res) => {
      const employees = res.data.results || res.data
      const countMap = {}
      employees.forEach((emp) => {
        const vid = emp.vendor_owner
        countMap[vid] = (countMap[vid] || 0) + 1
      })
      setEmployeeCountMap(countMap)
    }).catch(() => toast.error('Failed to load employee data'))
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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setSubmitting(true)
    try {
      const formData = new FormData()
      if (form.company_name) formData.append('company_name', form.company_name)
      formData.append('first_name', form.first_name)
      formData.append('last_name', form.last_name)
      formData.append('phone', form.phone)
      if (form.aadhar_number) formData.append('aadhar_number', form.aadhar_number)
      formData.append('branch', form.branch)
      form.category_ids.forEach(id => formData.append('category_ids', id))
      if (photo) formData.append('photo', photo)
      const res = await api.post('/vendors/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setCredentials(res.data.credentials || { username: res.data.user?.username, password: res.data.generated_password })
      setShowModal(false)
      setForm({ company_name: '', first_name: '', last_name: '', phone: '', aadhar_number: '', branch: '', category_ids: [] })
      setPhoto(null)
      setPhotoPreview(null)
      toast.success('Vendor created successfully')
      fetchVendors()
    } catch (err) {
      toast.error(parseApiError(err, 'Error creating vendor'))
    } finally {
      setSubmitting(false)
    }
  }

  const toggleCategory = (id) => {
    setForm((f) => ({
      ...f,
      category_ids: f.category_ids.includes(id) ? f.category_ids.filter((c) => c !== id) : [...f.category_ids, id],
    }))
  }

  const handleToggleActive = async (e, vendor) => {
    e.stopPropagation()
    setTogglingId(vendor.id)
    try {
      await api.patch(`/vendors/${vendor.id}/toggle-active/`, { is_active: !vendor.is_active })
      if (vendor.is_active) {
        toast.error('Vendor deactivated')
      } else {
        toast.success('Vendor activated')
      }
      fetchVendors()
    } catch (err) {
      toast.error(parseApiError(err, 'Failed to update vendor status'))
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this vendor?')) return
    try {
      await api.delete(`/vendors/${id}/`)
      toast.success('Vendor deleted successfully')
      fetchVendors()
    } catch (err) {
      toast.error('Error deleting vendor')
    }
  }

  // Search and filter logic
  const matchesSearch = (vendor, query) => {
    if (!query) return true
    const q = query.toLowerCase()
    const companyName = (vendor.display_name || vendor.company_name || '').toLowerCase()
    const firstName = (vendor.user?.first_name || '').toLowerCase()
    const lastName = (vendor.user?.last_name || '').toLowerCase()
    const fullName = `${firstName} ${lastName}`.trim()
    const phone = (vendor.user?.phone || '').toLowerCase()
    const categories = (vendor.category_names || []).map(c => c.toLowerCase()).join(' ')

    return companyName.includes(q) || fullName.includes(q) || phone.includes(q) || categories.includes(q)
  }

  const getSuggestions = () => {
    if (!searchQuery.trim()) return []
    return vendors.filter(v => matchesSearch(v, searchQuery)).slice(0, 5)
  }

  const handleSearchChange = (value) => {
    setSearchQuery(value)
    setShowSuggestions(value.trim().length > 0)
    setSelectedVendorId(null)
    setCurrentPage(1)
  }

  const handleSuggestionClick = (vendor) => {
    setSearchQuery('')
    setShowSuggestions(false)
    setSelectedVendorId(vendor.id)
  }

  const clearFilter = () => {
    setSearchQuery('')
    setSelectedVendorId(null)
    setShowSuggestions(false)
  }

  // Calculate filtered vendors
  let filteredVendors = vendors
  if (selectedVendorId) {
    filteredVendors = vendors.filter(v => v.id === selectedVendorId)
  } else if (searchQuery && searchQuery.trim().length > 0) {
    filteredVendors = vendors.filter(v => matchesSearch(v, searchQuery))
  }

  const pagedVendors = filteredVendors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const suggestions = getSuggestions()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-6">
        <div className="min-w-[160px]">
          <h3 className="font-serif text-lg font-bold">All Vendors</h3>
          <p className="text-[13px] text-[#6b7280] mt-0.5">{vendors.length} vendors registered</p>
        </div>
        {user?.role === 'superadmin' && (
          <BranchFilter value={selectedBranch} onChange={(val) => { setSelectedBranch(val); setCurrentPage(1) }} />
        )}

        {/* Search Bar with Suggestions */}
        <div ref={searchRef} className="relative">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
              placeholder="Search vendors..."
              className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg pl-10 pr-10 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors"
            />
            {(searchQuery || selectedVendorId) && (
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
              {suggestions.map((vendor) => (
                <button
                  key={vendor.id}
                  onClick={() => handleSuggestionClick(vendor)}
                  className="w-full px-4 py-3 text-left hover:bg-[#f6f7f9] transition-colors border-b border-[#e4e8ed] last:border-0"
                >
                  <div className="font-semibold text-[13px] text-[#1a1f2e]">
                    {vendor.display_name || vendor.company_name || `${vendor.user?.first_name} ${vendor.user?.last_name}`}
                  </div>
                  <div className="text-[11px] text-[#6b7280] mt-0.5">
                    {vendor.user?.first_name} {vendor.user?.last_name} · {vendor.user?.phone}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid transition-colors">
            + Add Vendor
          </button>
        </div>
      </div>

      {/* Active filter indicator */}
      {selectedVendorId && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#6b7280]">Showing:</span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-orchid-light text-orchid rounded-lg font-medium">
            {vendors.find(v => v.id === selectedVendorId)?.display_name || vendors.find(v => v.id === selectedVendorId)?.company_name}
            <button onClick={clearFilter} className="hover:text-orchid-dark">✕</button>
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Company / Owner</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Work Type</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Employees</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Phone</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Status</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#e4e8ed] animate-pulse">
                    <td className="px-4 py-3.5"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-[#e4e8ed]" /><div className="space-y-1.5"><div className="h-3 bg-[#e4e8ed] rounded w-32" /><div className="h-2.5 bg-[#e4e8ed] rounded w-24" /></div></div></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-20" /></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-6" /></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-24" /></td>
                    <td className="px-4 py-3.5"><div className="h-6 bg-[#e4e8ed] rounded w-16" /></td>
                    <td className="px-4 py-3.5"><div className="h-7 bg-[#e4e8ed] rounded w-7" /></td>
                  </tr>
                ))
              : pagedVendors.map((v, i) => (
              <tr key={v.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] cursor-pointer animate-fade-in" style={{ animationDelay: `${i * 40}ms` }} onClick={() => navigate(`/vendors/${v.id}`)}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {v.user?.photo ? (
                      <img
                        src={v.user.photo.startsWith('http') ? v.user.photo : `http://localhost:8000${v.user.photo}`}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border border-[#e4e8ed]"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                      />
                    ) : null}
                    <div className={`w-9 h-9 rounded-full bg-orchid-light items-center justify-center text-xs font-bold text-orchid ${v.user?.photo ? 'hidden' : 'flex'}`}>
                      {(v.user?.first_name || '')[0]}{(v.user?.last_name || '')[0]}
                    </div>
                    <div>
                      <span className="font-semibold text-[13px] block">{v.display_name || v.company_name || `${v.user?.first_name} ${v.user?.last_name}`}</span>
                      <span className="text-[11px] text-[#6b7280]">{v.user?.first_name} {v.user?.last_name} · {v.user?.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {(v.category_names || []).slice(0, 2).map((c, i) => (
                      <span key={i} className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fc] text-[#2563a8]">{c}</span>
                    ))}
                    {(v.category_names || []).length > 2 && (
                      <span className="text-[11px] text-[#6b7280]">+{v.category_names.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[13px]">{employeeCountMap[v.id] ?? 0}</td>
                <td className="px-4 py-3.5 text-[13px]">{v.user?.phone}</td>
                <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleToggleActive(e, v)}
                    disabled={togglingId === v.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                      v.is_active
                        ? 'bg-[#e8f5ee] text-[#1a6b4a] border-[#c3e6cb] hover:bg-[#d4edda]'
                        : 'bg-[#fdecea] text-[#c0392b] border-[#f5c6cb] hover:bg-[#f8d7da]'
                    } ${togglingId === v.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${v.is_active ? 'bg-[#1a6b4a]' : 'bg-[#c0392b]'}`} />
                    {togglingId === v.id ? '...' : v.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3.5 space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(v.id) }} className="w-[30px] h-[30px] rounded-lg border border-[#e4e8ed] inline-flex items-center justify-center text-sm text-[#6b7280] hover:bg-[#fdecea] hover:text-[#c0392b] transition-colors"><DeleteOutlined /></button>
                </td>
              </tr>
            ))}
            {!loading && filteredVendors.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-[13px] text-[#6b7280]">
                {searchQuery || selectedVendorId ? 'No vendors match your search' : 'No vendors found'}
              </td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredVendors.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add Vendor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[90vw] max-h-[90vh] flex flex-col">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Register New Vendor</h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <form id="vendor-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Photo *</label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-[#e4e8ed]" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#f6f7f9] border-2 border-dashed border-[#e4e8ed] flex items-center justify-center text-2xl text-[#6b7280]"><CameraOutlined /></div>
                  )}
                  <label className="px-3 py-1.5 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-medium cursor-pointer hover:bg-[#f6f7f9] transition-colors">
                    {photo ? 'Change Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Company Name <span className="text-[#6b7280] font-normal">(optional)</span></label>
                <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Leave blank for individual vendors" className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Owner First Name *</label>
                  <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Owner Last Name *</label>
                  <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Phone Number *</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Aadhar Number</label>
                  <input value={form.aadhar_number} onChange={(e) => setForm({ ...form, aadhar_number: e.target.value })} placeholder="XXXX XXXX XXXX" className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Branch *</label>
                <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required>
                  <option value="">Select branch</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Work Categories *</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <label key={c.id} className={`flex items-center gap-1.5 text-[13px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${form.category_ids.includes(c.id) ? 'bg-orchid-light border-orchid text-orchid font-medium' : 'border-[#e4e8ed] text-[#6b7280] hover:border-orchid/50'}`}>
                      <input type="checkbox" checked={form.category_ids.includes(c.id)} onChange={() => toggleCategory(c.id)} className="hidden" />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="bg-[#fef3e0] border border-[#f0c060] rounded-lg px-3.5 py-3">
                <p className="text-xs font-semibold text-[#7a5000]"><FileTextOutlined style={{ marginRight: 4 }} /> Login credentials will be auto-generated</p>
                <p className="text-xs text-[#7a5000] mt-1">Username and password will be shown once after saving.</p>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button type="submit" form="vendor-form" disabled={submitting} className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid disabled:opacity-50 transition-colors">
                {submitting ? 'Saving...' : 'Save Vendor →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {credentials && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full text-center">
            <div className="w-12 h-12 bg-orchid-light rounded-full flex items-center justify-center mx-auto mb-3 text-xl text-orchid"><CheckCircleOutlined /></div>
            <h2 className="font-serif text-xl font-bold mb-2">Vendor Created!</h2>
            <p className="text-[#c0392b] text-sm mb-4 font-medium">Save these credentials — they won't be shown again!</p>
            <div className="bg-[#f6f7f9] rounded-lg p-4 text-left space-y-2 text-[13px]">
              <p><span className="font-semibold">Username:</span> {credentials.username}</p>
              <p><span className="font-semibold">Password:</span> {credentials.password}</p>
            </div>
            <button onClick={() => setCredentials(null)} className="mt-4 px-6 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid transition-colors">Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
