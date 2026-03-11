import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useToast, parseApiError } from '../components/Toast'
import { CameraOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'

const statusStyles = {
  pending: 'bg-[#fef3e0] text-[#b07200]',
  in_progress: 'bg-[#e8f0fc] text-[#2563a8]',
  completed: 'bg-[#e8f5ee] text-[#1a6b4a]',
  cancelled: 'bg-[#fdecea] text-[#c0392b]',
}

export default function VendorDetail() {
  const toast = useToast()
  const { id } = useParams()
  const navigate = useNavigate()
  const [vendor, setVendor] = useState(null)
  const [employees, setEmployees] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEmpModal, setShowEmpModal] = useState(false)
  const [empForm, setEmpForm] = useState({ first_name: '', last_name: '', phone: '', aadhar_number: '' })
  const [empPhoto, setEmpPhoto] = useState(null)
  const [empPhotoPreview, setEmpPhotoPreview] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    try {
      const [vendorRes, empRes, actRes] = await Promise.all([
        api.get(`/vendors/${id}/`),
        api.get(`/employees/?vendor_owner=${id}`),
        api.get(`/activities/?vendor=${id}`),
      ])
      setVendor(vendorRes.data)
      setEmployees(empRes.data.results || empRes.data)
      setActivities(actRes.data.results || actRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  const handleEmpPhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEmpPhoto(file)
      setEmpPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleAddEmployee = async (e) => {
    if (e) e.preventDefault()
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('vendor_owner', id)
      formData.append('first_name', empForm.first_name)
      formData.append('last_name', empForm.last_name)
      formData.append('phone', empForm.phone)
      if (empForm.aadhar_number) formData.append('aadhar_number', empForm.aadhar_number)
      if (empPhoto) formData.append('photo', empPhoto)
      const res = await api.post('/employees/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setCredentials(res.data.credentials || { username: res.data.user?.username, password: res.data.generated_password })
      setShowEmpModal(false)
      setEmpForm({ first_name: '', last_name: '', phone: '', aadhar_number: '' })
      setEmpPhoto(null)
      setEmpPhotoPreview(null)
      fetchData()
    } catch (err) {
      toast.error(parseApiError(err, 'Error adding employee'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#6b7280]">Loading...</div>
  if (!vendor) return <div className="text-center text-[#6b7280]">Vendor not found</div>

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/vendors')} className="text-orchid hover:underline text-[13px] font-medium">&larr; Back to Vendors</button>

      {/* Vendor Info Card */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm p-6">
        <div className="flex items-center gap-4 mb-4">
          {vendor.user?.photo ? (
            <img
              src={vendor.user.photo.startsWith('http') ? vendor.user.photo : `http://localhost:8000${vendor.user.photo}`}
              alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-[#e4e8ed]"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
            />
          ) : null}
          <div className={`w-16 h-16 rounded-full bg-orchid-light items-center justify-center text-xl font-bold text-orchid ${vendor.user?.photo ? 'hidden' : 'flex'}`}>
            {(vendor.user?.first_name || '')[0]}{(vendor.user?.last_name || '')[0]}
          </div>
          <h1 className="font-serif text-2xl font-bold">
            {vendor.display_name || vendor.company_name || `${vendor.user?.first_name} ${vendor.user?.last_name}`}
          </h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
          <div><span className="text-[#6b7280]">Owner:</span> <span className="font-medium">{vendor.user?.first_name} {vendor.user?.last_name}</span></div>
          <div><span className="text-[#6b7280]">Phone:</span> <span className="font-medium">{vendor.user?.phone}</span></div>
          <div><span className="text-[#6b7280]">Branch:</span> <span className="font-medium">{vendor.branch_name || vendor.branch?.name}</span></div>
          <div><span className="text-[#6b7280]">Aadhar:</span> <span className="font-medium">{vendor.user?.aadhar_number}</span></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {(vendor.category_names || vendor.categories || []).map((c, i) => (
            <span key={i} className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fc] text-[#2563a8]">{typeof c === 'string' ? c : c.name}</span>
          ))}
        </div>
      </div>

      {/* Employees */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e8ed] flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold">Employees ({employees.length})</h3>
          </div>
          <button onClick={() => setShowEmpModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orchid text-white rounded-lg text-xs font-semibold hover:bg-orchid-mid transition-colors">+ Add Employee</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Name</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Phone</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Aadhar</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] transition-colors">
                <td className="px-4 py-3 text-[13px] font-medium">
                  <div className="flex items-center gap-2.5">
                    {emp.user?.photo ? (
                      <img
                        src={emp.user.photo.startsWith('http') ? emp.user.photo : `http://localhost:8000${emp.user.photo}`}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-[#e4e8ed]"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 rounded-full bg-orchid-light items-center justify-center text-[10px] font-bold text-orchid ${emp.user?.photo ? 'hidden' : 'flex'}`}>
                      {(emp.user?.first_name || '')[0]}{(emp.user?.last_name || '')[0]}
                    </div>
                    {emp.user?.first_name} {emp.user?.last_name}
                  </div>
                </td>
                <td className="px-4 py-3 text-[13px]">{emp.user?.phone}</td>
                <td className="px-4 py-3 text-[13px]">{emp.user?.aadhar_number}</td>
              </tr>
            ))}
            {employees.length === 0 && <tr><td colSpan="3" className="px-4 py-6 text-center text-[13px] text-[#6b7280]">No employees</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Activities */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e8ed]">
          <h3 className="font-serif text-base font-bold">Activities ({activities.length})</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Title</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Type</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Status</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Cost</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] cursor-pointer transition-colors" onClick={() => navigate(`/activities/${a.id}`)}>
                <td className="px-4 py-3 text-[13px] font-medium">{a.title}</td>
                <td className="px-4 py-3 text-[13px] capitalize">{a.activity_type?.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[a.status] || 'bg-[#f0f1f3] text-[#555]'}`}>{a.status?.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3 text-[13px] font-semibold tabular-nums">₹{Number(a.expected_cost).toLocaleString()}</td>
              </tr>
            ))}
            {activities.length === 0 && <tr><td colSpan="4" className="px-4 py-6 text-center text-[13px] text-[#6b7280]">No activities</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add Employee Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setShowEmpModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[90vw]">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Add Employee</h3>
              <button onClick={() => setShowEmpModal(false)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Photo *</label>
                <div className="flex items-center gap-4">
                  {empPhotoPreview ? (
                    <img src={empPhotoPreview} alt="Preview" className="w-14 h-14 rounded-full object-cover border-2 border-[#e4e8ed]" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#f6f7f9] border-2 border-dashed border-[#e4e8ed] flex items-center justify-center text-xl text-[#6b7280]"><CameraOutlined /></div>
                  )}
                  <label className="px-3 py-1.5 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-medium cursor-pointer hover:bg-[#f6f7f9] transition-colors">
                    {empPhoto ? 'Change Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" onChange={handleEmpPhotoChange} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">First Name *</label>
                  <input value={empForm.first_name} onChange={(e) => setEmpForm({ ...empForm, first_name: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Last Name *</label>
                  <input value={empForm.last_name} onChange={(e) => setEmpForm({ ...empForm, last_name: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Phone *</label>
                <input value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Aadhar Number</label>
                <input value={empForm.aadhar_number} onChange={(e) => setEmpForm({ ...empForm, aadhar_number: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" />
              </div>
              <div className="bg-[#fef3e0] border border-[#f0c060] rounded-lg px-3.5 py-3">
                <p className="text-xs font-semibold text-[#7a5000]"><FileTextOutlined style={{ marginRight: 4 }} /> Login credentials will be auto-generated</p>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button type="button" onClick={() => setShowEmpModal(false)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button onClick={handleAddEmployee} disabled={submitting} className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid disabled:opacity-50 transition-colors">
                {submitting ? 'Creating...' : 'Create Employee →'}
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
            <h2 className="font-serif text-xl font-bold mb-2">Employee Created!</h2>
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
