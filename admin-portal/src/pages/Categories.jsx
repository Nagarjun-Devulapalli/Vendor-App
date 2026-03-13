import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useToast, parseApiError } from '../components/Toast'
import {
  ToolOutlined,
  ClearOutlined,
  EnvironmentOutlined,
  BugOutlined,
  SafetyCertificateOutlined,
  CloudOutlined,
  LaptopOutlined,
  BuildOutlined,
  ThunderboltOutlined,
  ReconciliationOutlined,
  GiftOutlined,
  CarOutlined,
  CoffeeOutlined,
  SettingOutlined,
  InboxOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'

const categoryIcons = {
  'Facility Maintenance': <ToolOutlined />,
  'Cleaning & Housekeeping': <ClearOutlined />,
  'Grounds & Landscaping': <EnvironmentOutlined />,
  'Pest Control': <BugOutlined />,
  'Safety & Security Systems': <SafetyCertificateOutlined />,
  'HVAC & Climate Systems': <CloudOutlined />,
  'IT & Technical Services': <LaptopOutlined />,
  'Infrastructure Repair': <BuildOutlined />,
  'Power & Utilities': <ThunderboltOutlined />,
  'Waste & Sanitation Services': <ReconciliationOutlined />,
  'Event & Facility Setup': <GiftOutlined />,
  'Transportation Services': <CarOutlined />,
  'Food & Cafeteria Services': <CoffeeOutlined />,
  'Equipment Maintenance': <SettingOutlined />,
}

export default function Categories() {
  const toast = useToast()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const navigate = useNavigate()

  const fetchCategories = () => {
    api.get('/categories/').then((res) => setCategories(res.data.results || res.data)).catch(() => toast.error('Failed to load categories')).finally(() => setLoading(false))
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
        toast.success('Category updated successfully')
      } else {
        await api.post('/categories/', form)
        toast.success('Category created successfully')
      }
      setShowModal(false)
      fetchCategories()
    } catch (err) {
      toast.error(parseApiError(err, 'Error saving category'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/categories/${deleteTarget.id}/`)
      toast.success('Category deleted successfully')
      setDeleteTarget(null)
      fetchCategories()
    } catch (err) {
      toast.error('Error deleting category')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#6b7280]">Loading...</div>

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid transition-colors">
          + Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => (
          <div key={c.id} onClick={() => navigate(`/categories/${c.id}`)} className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-[28px] mb-2.5">{categoryIcons[c.name] || <InboxOutlined />}</div>
            <h4 className="font-serif text-base font-bold mb-1">{c.name}</h4>
            <p className="text-[13px] text-[#6b7280] mb-3.5 line-clamp-2">{c.description || 'No description'}</p>
            <div className="flex justify-between items-center">
              <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fc] text-[#2563a8]">
                Category
              </span>
              <div className="flex gap-1.5">
                <button onClick={(e) => { e.stopPropagation(); openEdit(c) }} className="w-[30px] h-[30px] rounded-lg border border-[#e4e8ed] inline-flex items-center justify-center text-sm text-[#6b7280] hover:bg-[#f6f7f9] hover:text-[#1a1f2e] transition-colors"><EditOutlined /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(c) }} className="w-[30px] h-[30px] rounded-lg border border-[#e4e8ed] inline-flex items-center justify-center text-sm text-[#6b7280] hover:bg-[#fdecea] hover:text-[#c0392b] transition-colors"><DeleteOutlined /></button>
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-[400px] max-w-[90vw]">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Delete Category</h3>
              <button onClick={() => setDeleteTarget(null)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <div className="p-6">
              <p className="text-[13px] text-[#1a1f2e]">Are you sure you want to delete <span className="font-semibold">{deleteTarget.name}</span>? This action cannot be undone.</p>
            </div>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-[#c0392b] text-white rounded-lg text-[13px] font-semibold hover:bg-[#a93226] transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
