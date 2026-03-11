import { useState, useEffect } from 'react'
import api from '../services/api'
import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 10

export default function BranchAdmins() {
  const [admins, setAdmins] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [form, setForm] = useState({ username: '', password: '', first_name: '', last_name: '', email: '', phone: '', branch: '' })
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchAdmins = () => {
    api.get('/branch-admins/').then(res => setAdmins(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAdmins()
    api.get('/branches/').then(res => setBranches(res.data.results || res.data)).catch(console.error)
  }, [])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (editingAdmin) {
        await api.patch(`/branch-admins/${editingAdmin.id}/`, payload)
      } else {
        await api.post('/branch-admins/', payload)
      }
      setShowModal(false)
      setEditingAdmin(null)
      setForm({ username: '', password: '', first_name: '', last_name: '', email: '', phone: '', branch: '' })
      fetchAdmins()
    } catch (err) {
      alert(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Error saving admin')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (admin) => {
    setEditingAdmin(admin)
    setForm({
      username: admin.username,
      password: '',
      first_name: admin.first_name,
      last_name: admin.last_name,
      email: admin.email || '',
      phone: admin.phone || '',
      branch: admin.branch || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this admin?')) return
    try {
      await api.delete(`/branch-admins/${id}/`)
      fetchAdmins()
    } catch (err) {
      alert('Error deleting admin')
    }
  }

  const toggleActive = async (admin) => {
    try {
      await api.patch(`/branch-admins/${admin.id}/`, { is_active: !admin.is_active })
      fetchAdmins()
    } catch (err) {
      alert('Error updating admin')
    }
  }

  const filtered = admins.filter(a => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (a.username || '').toLowerCase().includes(q) ||
      `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
      (a.branch_name || '').toLowerCase().includes(q)
  })

  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (loading) return <div className="flex items-center justify-center h-64 text-[#6b7280]">Loading...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold">Branch Admins</h3>
          <p className="text-[13px] text-[#6b7280] mt-0.5">{admins.length} admins configured</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder="Search admins..."
              className="border-[1.5px] border-[#e4e8ed] rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors w-[250px]"
            />
            <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
          </div>
          <button onClick={() => { setEditingAdmin(null); setForm({ username: '', password: '', first_name: '', last_name: '', email: '', phone: '', branch: '' }); setShowModal(true) }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid transition-colors">
            + Add Admin
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Admin</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Username</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Branch</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Phone</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Status</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((a) => (
              <tr key={a.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orchid-light flex items-center justify-center text-xs font-bold text-orchid">
                      {(a.first_name || '')[0]}{(a.last_name || '')[0]}
                    </div>
                    <div>
                      <span className="font-semibold text-[13px] block">{a.first_name} {a.last_name}</span>
                      <span className="text-[11px] text-[#6b7280]">{a.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[13px]">{a.username}</td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fc] text-[#2563a8]">
                    {a.branch_name || 'Unassigned'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[13px]">{a.phone}</td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => toggleActive(a)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${a.is_active ? 'bg-[#e8f5ee] text-[#1a6b4a]' : 'bg-[#fdecea] text-[#c0392b]'}`}
                  >
                    {a.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3.5 space-x-2">
                  <button onClick={() => handleEdit(a)} className="w-[30px] h-[30px] rounded-lg border border-[#e4e8ed] inline-flex items-center justify-center text-sm text-[#6b7280] hover:bg-[#f6f7f9] transition-colors"><EditOutlined /></button>
                  <button onClick={() => handleDelete(a.id)} className="w-[30px] h-[30px] rounded-lg border border-[#e4e8ed] inline-flex items-center justify-center text-sm text-[#6b7280] hover:bg-[#fdecea] hover:text-[#c0392b] transition-colors"><DeleteOutlined /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-[13px] text-[#6b7280]">No admins found</td></tr>
            )}
          </tbody>
        </table>
        <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[90vw] max-h-[90vh] flex flex-col">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">{editingAdmin ? 'Edit Admin' : 'Add Branch Admin'}</h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <form id="admin-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Username *</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required disabled={!!editingAdmin} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">{editingAdmin ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required={!editingAdmin} />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">First Name *</label>
                  <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Last Name *</label>
                  <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Branch *</label>
                <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required>
                  <option value="">Select branch</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button type="submit" form="admin-form" disabled={submitting} className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid disabled:opacity-50 transition-colors">
                {submitting ? 'Saving...' : editingAdmin ? 'Update Admin' : 'Create Admin →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
