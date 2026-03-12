import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import BranchFilter from '../components/BranchFilter'
import { ShopOutlined, FileTextOutlined, ExclamationCircleOutlined, CreditCardOutlined, EyeOutlined } from '@ant-design/icons'
import { useToast } from '../components/Toast'

const PIE_COLORS = { pending: '#e8a020', in_progress: '#2563a8', completed: '#1a6b4a', cancelled: '#c0392b' }

export default function Dashboard() {
  const { user } = useAuth()
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [spending, setSpending] = useState([])
  const [completion, setCompletion] = useState([])
  const [vendors, setVendors] = useState([])
  const [activities, setActivities] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    const branchParam = selectedBranch ? `?branch=${selectedBranch}` : ''
    const branchAmp = selectedBranch ? `branch=${selectedBranch}&` : ''
    Promise.all([
      api.get(`/dashboard/stats/${branchParam}`),
      api.get(`/dashboard/spending-trends/${branchParam}`),
      api.get(`/dashboard/completion-rates/${branchParam}`),
      api.get(`/vendors/${branchParam}`),
      api.get(`/activities/${branchParam}`),
      api.get(`/payments/${branchParam}`),
    ])
      .then(([statsRes, spendingRes, completionRes, vendorsRes, actRes, paymentsRes]) => {
        setStats(statsRes.data)
        setSpending(spendingRes.data)
        setCompletion(completionRes.data)
        setVendors((vendorsRes.data.results || vendorsRes.data).slice(0, 5))
        setActivities((actRes.data.results || actRes.data))
        setPayments((paymentsRes.data.results || paymentsRes.data))
      })
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [selectedBranch])

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm p-5 animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2"><div className="h-3 bg-[#e4e8ed] rounded w-24" /><div className="h-7 bg-[#e4e8ed] rounded w-16 mt-2" /></div>
              <div className="w-10 h-10 bg-[#e4e8ed] rounded-xl" />
            </div>
            <div className="h-2.5 bg-[#e4e8ed] rounded w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-[#e4e8ed] shadow-sm p-5 h-64 animate-pulse">
          <div className="h-4 bg-[#e4e8ed] rounded w-32 mb-4" />
          <div className="h-40 bg-[#e4e8ed] rounded" />
        </div>
        <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm p-5 h-64 animate-pulse">
          <div className="h-4 bg-[#e4e8ed] rounded w-24 mb-4" />
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-[#e4e8ed] rounded" />)}</div>
        </div>
      </div>
    </div>
  )

  const partialPayments = payments.filter(p => p.payment_status === 'partial')
  const partialBalance = partialPayments.reduce((sum, p) => sum + parseFloat(p.balance_remaining || 0), 0)

  const statCards = [
    { label: 'Total Vendors', value: stats?.total_vendors || 0, sub: `${vendors.length} registered`, color: 'green', icon: <ShopOutlined />, onClick: () => navigate('/vendors') },
    { label: 'Open Activities', value: stats?.total_activities || 0, sub: `${activities.filter(a => a.status === 'in_progress').length} in progress`, color: 'amber', icon: <FileTextOutlined />, onClick: () => navigate('/activities') },
    { label: 'Partial Payments', value: `₹${(partialBalance / 1000).toFixed(0)}K`, sub: `${partialPayments.length} invoices`, color: 'amber', icon: <ExclamationCircleOutlined />, onClick: () => navigate('/payments?tab=partial') },
    { label: 'Balance Remaining', value: `₹${((stats?.balance_remaining_amount || 0) / 1000).toFixed(0)}K`, sub: `${stats?.balance_remaining_count || 0} outstanding`, color: 'blue', icon: <CreditCardOutlined />, onClick: () => navigate('/payments') },
  ]

  const colorMap = { green: { border: 'border-t-orchid', iconBg: 'bg-orchid-light', valueColor: 'text-orchid' }, amber: { border: 'border-t-[#e8a020]', iconBg: 'bg-[#fef3e0]', valueColor: 'text-[#e8a020]' }, red: { border: 'border-t-[#c0392b]', iconBg: 'bg-[#fdecea]', valueColor: 'text-[#c0392b]' }, blue: { border: 'border-t-[#2563a8]', iconBg: 'bg-[#e8f0fc]', valueColor: 'text-[#2563a8]' } }

  const statusData = stats?.activities_by_status
    ? Object.entries(stats.activities_by_status).map(([name, value]) => ({ name, value }))
    : []

  const overdueActivities = activities.filter(a => a.is_overdue)
  const pendingActivities = activities.filter(a => a.status === 'pending').slice(0, 3)
  const alerts = [
    ...overdueActivities.map(a => ({ type: 'red', text: `${a.title} is overdue`, sub: `${a.vendor_name} · Due ${a.end_date}` })),
    ...pendingActivities.map(a => ({ type: 'amber', text: `${a.title} is pending`, sub: `${a.vendor_name} · Starts ${a.start_date}` })),
  ].slice(0, 5)

  // Current month spending
  const currentMonth = spending.length > 0 ? spending[spending.length - 1] : null
  const prevMonth = spending.length > 1 ? spending[spending.length - 2] : null
  const spendDiff = currentMonth && prevMonth && prevMonth.amount > 0
    ? Math.round(((currentMonth.amount - prevMonth.amount) / prevMonth.amount) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Branch Filter for superadmin */}
      {user?.role === 'superadmin' && (
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-medium text-[#6b7280]">Filter by Branch:</span>
          <BranchFilter value={selectedBranch} onChange={setSelectedBranch} />
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const c = colorMap[card.color]
          const CardWrapper = card.onClick ? 'button' : 'div'
          return (
            <CardWrapper
              key={card.label}
              onClick={card.onClick}
              className={`bg-white rounded-xl border border-[#e4e8ed] shadow-sm p-5 border-t-[3px] ${c.border} animate-fade-up ${card.onClick ? 'cursor-pointer hover:shadow-md transition-shadow text-left w-full' : ''}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-xl mb-3.5 ${c.iconBg}`}>
                {card.icon}
              </div>
              <div className={`font-serif text-[32px] font-bold leading-none mb-1 ${c.valueColor}`}>
                {card.value}
              </div>
              <div className="text-[13px] text-[#6b7280] font-medium">{card.label}</div>
              <div className="text-[11px] text-[#6b7280] mt-2 pt-2 border-t border-[#e4e8ed]">{card.sub}</div>
            </CardWrapper>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Spending Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e4e8ed] shadow-sm animate-fade-up" style={{ animationDelay: '0.25s' }}>
          <div className="px-5 py-4 border-b border-[#e4e8ed] flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-bold">Monthly Spending</h3>
              <p className="text-xs text-[#6b7280] mt-0.5">Last {spending.length} months</p>
            </div>
            <button onClick={() => navigate('/payments')} className="text-xs text-orchid font-semibold hover:underline">View Report</button>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={spending}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e8ed" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} contentStyle={{ borderRadius: 8, border: '1px solid #e4e8ed', fontSize: 13 }} />
                <Bar dataKey="amount" fill="#e8eefb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {currentMonth && (
              <div className="mt-4 pt-3 border-t border-[#e4e8ed] flex justify-between items-center">
                <div>
                  <div className="text-[11px] text-[#6b7280] font-semibold uppercase tracking-wider">This Month</div>
                  <div className="font-serif text-[22px] font-bold text-orchid">₹{currentMonth.amount?.toLocaleString()}</div>
                </div>
                {spendDiff !== 0 && (
                  <div className="text-right">
                    <div className="text-[11px] text-[#6b7280] font-semibold uppercase tracking-wider">vs Last Month</div>
                    <div className={`text-sm font-semibold ${spendDiff > 0 ? 'text-[#c0392b]' : 'text-orchid'}`}>
                      {spendDiff > 0 ? '↑' : '↓'} {Math.abs(spendDiff)}%
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Activity Status Donut */}
        <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="px-5 py-4 border-b border-[#e4e8ed]">
            <h3 className="font-serif text-base font-bold">Activity Status</h3>
            <p className="text-xs text-[#6b7280] mt-0.5">All activities · This branch</p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-5">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#d1d5db'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-[13px]">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[item.name] || '#d1d5db' }} />
                    <span className="text-[#6b7280] flex-1 capitalize">{item.name.replace('_', ' ')}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Vendors */}
        <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm animate-fade-up" style={{ animationDelay: '0.35s' }}>
          <div className="px-5 py-4 border-b border-[#e4e8ed] flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-bold">Active Vendors</h3>
              <p className="text-xs text-[#6b7280] mt-0.5">Working at your branch</p>
            </div>
            <button onClick={() => navigate('/vendors')} className="text-xs text-orchid font-semibold hover:underline">View All →</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Vendor</th>
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Categories</th>
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-[13px] block">{v.display_name || v.company_name || `${v.user?.first_name} ${v.user?.last_name}`}</span>
                    <span className="text-[11px] text-[#6b7280]">{v.user?.first_name} {v.user?.last_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(v.category_names || []).slice(0, 2).map((c, i) => (
                        <span key={i} className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fc] text-[#2563a8]">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/vendors/${v.id}`)} className="w-[30px] h-[30px] rounded-lg border border-[#e4e8ed] inline-flex items-center justify-center text-sm text-[#6b7280] hover:bg-[#f6f7f9] hover:text-[#1a1f2e] transition-colors">
                      <EyeOutlined />
                    </button>
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr><td colSpan="3" className="px-4 py-8 text-center text-[13px] text-[#6b7280]">No vendors</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <div className="px-5 py-4 border-b border-[#e4e8ed] flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-bold">Needs Attention</h3>
              <p className="text-xs text-[#6b7280] mt-0.5">Recent alerts for your branch</p>
            </div>
            {overdueActivities.length > 0 && (
              <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fdecea] text-[#c0392b]">
                {overdueActivities.length} urgent
              </span>
            )}
          </div>
          <div>
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 border-b border-[#e4e8ed] last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alert.type === 'red' ? 'bg-[#c0392b]' : 'bg-[#e8a020]'}`} />
                <div>
                  <p className="text-[13px] font-medium leading-snug">{alert.text}</p>
                  <span className="text-[11px] text-[#6b7280]">{alert.sub}</span>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="px-5 py-8 text-center text-[13px] text-[#6b7280]">No alerts</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
