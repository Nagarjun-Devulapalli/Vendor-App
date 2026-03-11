import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { ExclamationCircleOutlined } from '@ant-design/icons'

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

export default function CategoryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [category, setCategory] = useState(null)
  const [activities, setActivities] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/categories/${id}/`),
      api.get(`/vendors/by-category/?cat=${id}`),
      api.get('/activities/'),
    ])
      .then(([catRes, vendorRes, actRes]) => {
        setCategory(catRes.data)
        setVendors(vendorRes.data.results || vendorRes.data)
        const allActivities = actRes.data.results || actRes.data
        const filtered = allActivities.filter(a => String(a.category) === String(id))
        setActivities(filtered)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64 text-[#6b7280]">Loading...</div>
  if (!category) return <div className="text-center text-[#6b7280]">Category not found</div>

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/categories')} className="text-orchid hover:underline text-[13px] font-medium">&larr; Back to Categories</button>

      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm p-6">
        <h1 className="font-serif text-2xl font-bold">{category.name}</h1>
        {category.description && <p className="text-[13px] text-[#6b7280] mt-1">{category.description}</p>}
        <div className="mt-3 flex gap-6">
          <div><span className="text-[13px] text-[#6b7280]">Total Activities:</span> <span className="font-semibold text-[13px]">{activities.length}</span></div>
          <div><span className="text-[13px] text-[#6b7280]">Vendors:</span> <span className="font-semibold text-[13px]">{vendors.length}</span></div>
        </div>
        {vendors.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {vendors.map((v) => (
              <span key={v.id} className="inline-flex items-center px-2.5 py-1 bg-[#f6f7f9] border border-[#e4e8ed] rounded-lg text-[12px] font-medium">
                {v.display_name || v.company_name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e8ed]">
          <h3 className="font-serif text-base font-bold">Activities under {category.name}</h3>
        </div>
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
            {activities.map((a) => (
              <tr key={a.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] cursor-pointer transition-colors" onClick={() => navigate(`/activities/${a.id}`)}>
                <td className="px-4 py-3.5">
                  <span className="font-semibold text-[13px] block">{a.title}</span>
                </td>
                <td className="px-4 py-3.5 text-[13px]">{a.vendor_name}</td>
                <td className="px-4 py-3.5">
                  <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeStyles[a.activity_type] || 'bg-[#f0f1f3] text-[#555]'}`}>
                    {a.activity_type?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs text-[#6b7280]">
                  {a.start_date}{a.end_date ? ` – ${a.end_date}` : ''}
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
            {activities.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-[13px] text-[#6b7280]">No activities found for this category</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
