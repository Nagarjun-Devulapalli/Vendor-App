import { useState, useEffect } from 'react'
import api from '../services/api'

const categoryIcons = {
  'Facility Maintenance': '🔧',
  'Cleaning & Housekeeping': '🧹',
  'Grounds & Landscaping': '🌿',
  'Pest Control': '🐛',
  'Safety & Security Systems': '🛡️',
  'HVAC & Climate Systems': '❄️',
  'IT & Technical Services': '💻',
  'Infrastructure Repair': '🏗️',
  'Power & Utilities': '⚡',
  'Waste & Sanitation Services': '♻️',
  'Event & Facility Setup': '🎪',
  'Transportation Services': '🚌',
  'Food & Cafeteria Services': '🍽️',
  'Equipment Maintenance': '🔩',
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchCategories = () => {
    api.get('/categories/').then((res) => setCategories(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchCategories() }, [])

  const openEdit = (cat) => {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description || '' })
    setShowModal(true)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', description: '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}/`, form)
      } else {
        await api.post('/categories/', form)
      }
      setShowModal(false)
      fetchCategories()
    } catch (err) {
      alert(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return
    try {
      await api.delete(`/categories/${id}/`)
      fetchCategories()
    } catch (err) {
      alert('Error deleting category')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#6b7280]">Loading...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold">Work Categories</h3>
          <p className="text-[13px] text-[#6b7280] mt-0.5">Define the types of work vendors can do</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid transition-colors">
          + Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="text-[28px] mb-2.5">{categoryIcons[c.name] || '📦'}</div>
            <h4 className="font-serif text-base font-bold mb-1">{c.name}</h4>
            <p className="text-[13px] text-[#6b7280] mb-3.5 line-clamp-2">{c.description || 'No description'}</p>
            <div className="flex justify-between items-center">
              <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fc] text-[#2563a8]">
                Category
              </span>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(c)} className="w-[30px] h-[30px] rounded-lg border border-[#e4e8ed] inline-flex items-center justify-center text-sm text-[#6b7280] hover:bg-[#f6f7f9] hover:text-[#1a1f2e] transition-colors">✏️</button>
                <button onClick={() => handleDelete(c.id)} className="w-[30px] h-[30px] rounded-lg border border-[#e4e8ed] inline-flex items-center justify-center text-sm text-[#6b7280] hover:bg-[#fdecea] hover:text-[#c0392b] transition-colors">🗑️</button>
              </div>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-3 text-center py-12 text-[#6b7280]">No categories</div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[90vw]">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">{editing ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" rows="3" />
              </div>
            </form>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid disabled:opacity-50 transition-colors">
                {submitting ? 'Saving...' : editing ? 'Update →' : 'Create →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
