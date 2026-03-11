import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { SearchOutlined, CopyOutlined, CheckOutlined, EditOutlined, SwapOutlined } from '@ant-design/icons'
import Pagination from '../components/Pagination'
import BranchFilter from '../components/BranchFilter'

const PAGE_SIZE = 15

const roleTabs = [
  { key: '', label: 'All' },
  { key: 'admin', label: 'Admins' },
  { key: 'vendor_owner', label: 'Vendors' },
  { key: 'vendor_employee', label: 'Employees' },
]

const roleStyles = {
  admin: 'bg-[#e8f0fc] text-[#2563a8]',
  vendor_owner: 'bg-[#e8f5ee] text-[#1a6b4a]',
  vendor_employee: 'bg-[#fef3e0] text-[#b07200]',
}

export default function Credentials() {
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [copiedId, setCopiedId] = useState(null)
  const [resetModal, setResetModal] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [switching, setSwitching] = useState(null)
  const navigate = useNavigate()

  const fetchCredentials = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (roleFilter) params.append('role', roleFilter)
    if (branchFilter) params.append('branch', branchFilter)
    if (searchQuery.trim()) params.append('search', searchQuery.trim())
    const qs = params.toString() ? `?${params.toString()}` : ''
    api.get(`/credentials/${qs}`)
      .then(res => setCredentials(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCredentials()
  }, [roleFilter, branchFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchCredentials()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleResetPassword = async () => {
    if (!newPassword.trim()) return
    setResetting(true)
    try {
      await api.patch(`/credentials/${resetModal.id}/reset-password/`, { new_password: newPassword })
      setResetModal(null)
      setNewPassword('')
      fetchCredentials()
    } catch (err) {
      alert(err.response?.data?.error || 'Error resetting password')
    } finally {
      setResetting(false)
    }
  }

  const handleSwitchUser = async (cred) => {
    if (isUntracked(cred.password_plain)) {
      alert('Password not tracked. Please reset the password first, then switch.')
      return
    }
    if (!confirm(`Switch to ${cred.first_name} ${cred.last_name} (${cred.username})?\n\nYou will be logged out of superadmin.`)) return
    setSwitching(cred.id)
    try {
      // Save superadmin session so we can switch back
      const superadminData = {
        access: localStorage.getItem('access_token'),
        refresh: localStorage.getItem('refresh_token'),
        user: localStorage.getItem('user'),
      }
      localStorage.setItem('superadmin_session', JSON.stringify(superadminData))

      // Login as target user
      const res = await api.post('/auth/login/', { username: cred.username, password: cred.password_plain })
      const { access, refresh, user: userData } = res.data
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      localStorage.setItem('user', JSON.stringify(userData))
      window.location.href = '/dashboard'
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Login failed. Try resetting the password first.')
      localStorage.removeItem('superadmin_session')
    } finally {
      setSwitching(null)
    }
  }

  const paged = credentials.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const roleLabel = (role) => {
    if (role === 'admin') return 'Admin'
    if (role === 'vendor_owner') return 'Vendor'
    if (role === 'vendor_employee') return 'Employee'
    return role
  }

  const isUntracked = (password) => password === '(created before tracking)'

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif text-lg font-bold">Login Credentials</h3>
        <p className="text-[13px] text-[#6b7280] mt-0.5">{credentials.length} credentials stored</p>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Role Tabs */}
        <div className="flex bg-[#f6f7f9] rounded-lg p-0.5">
          {roleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setRoleFilter(tab.key); setCurrentPage(1) }}
              className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                roleFilter === tab.key ? 'bg-white text-orchid shadow-sm' : 'text-[#6b7280] hover:text-[#1a1f2e]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Branch Filter */}
        <BranchFilter value={branchFilter} onChange={(v) => { setBranchFilter(v || ''); setCurrentPage(1) }} />

        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, username, or phone..."
            className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg pl-10 pr-4 py-2 text-sm focus:border-orchid focus:outline-none transition-colors"
          />
          <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[#6b7280]">Loading...</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Name</th>
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Username</th>
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Password</th>
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Role</th>
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Branch</th>
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Phone</th>
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Status</th>
                  <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr key={c.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orchid-light flex items-center justify-center text-[11px] font-bold text-orchid">
                          {(c.first_name || '')[0]}{(c.last_name || '')[0]}
                        </div>
                        <span className="font-semibold text-[13px]">{c.first_name} {c.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="text-[13px] bg-[#f6f7f9] px-2 py-0.5 rounded font-mono">{c.username}</code>
                        <button
                          onClick={() => handleCopy(c.username, `u-${c.id}`)}
                          className="text-[#6b7280] hover:text-orchid transition-colors"
                          title="Copy username"
                        >
                          {copiedId === `u-${c.id}` ? <CheckOutlined className="text-green-600" /> : <CopyOutlined />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isUntracked(c.password_plain) ? (
                          <>
                            <span className="text-[12px] text-[#c0392b] italic">Not tracked</span>
                            <button
                              onClick={() => { setResetModal(c); setNewPassword('') }}
                              className="ml-1 px-2 py-0.5 text-[11px] font-semibold bg-orchid text-white rounded hover:bg-orchid-mid transition-colors"
                              title="Reset password"
                            >
                              Reset
                            </button>
                          </>
                        ) : (
                          <>
                            <code className="text-[13px] bg-[#f6f7f9] px-2 py-0.5 rounded font-mono">{c.password_plain}</code>
                            <button
                              onClick={() => handleCopy(c.password_plain, `p-${c.id}`)}
                              className="text-[#6b7280] hover:text-orchid transition-colors"
                              title="Copy password"
                            >
                              {copiedId === `p-${c.id}` ? <CheckOutlined className="text-green-600" /> : <CopyOutlined />}
                            </button>
                            <button
                              onClick={() => { setResetModal(c); setNewPassword('') }}
                              className="text-[#6b7280] hover:text-orchid transition-colors"
                              title="Reset password"
                            >
                              <EditOutlined />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${roleStyles[c.role] || 'bg-[#f6f7f9] text-[#6b7280]'}`}>
                        {roleLabel(c.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#6b7280]">{c.branch_name || '\u2014'}</td>
                    <td className="px-4 py-3 text-[13px]">{c.phone || '\u2014'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.is_active ? 'bg-[#e8f5ee] text-[#1a6b4a]' : 'bg-[#fdecea] text-[#c0392b]'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.role === 'admin' ? (
                        <button
                          onClick={() => handleSwitchUser(c)}
                          disabled={switching === c.id || !c.is_active}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                            !c.is_active
                              ? 'bg-[#f6f7f9] text-[#6b7280] cursor-not-allowed'
                              : isUntracked(c.password_plain)
                              ? 'border border-[#e4e8ed] text-[#6b7280] hover:bg-[#f6f7f9] cursor-not-allowed opacity-50'
                              : 'bg-[#e8f0fc] text-[#2563a8] hover:bg-[#d0e0f8]'
                          }`}
                          title={!c.is_active ? 'User is inactive' : isUntracked(c.password_plain) ? 'Reset password first' : `Login as ${c.username}`}
                        >
                          <SwapOutlined />
                          {switching === c.id ? 'Switching...' : 'Switch'}
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#f6f7f9] text-[#6b7280] cursor-not-allowed opacity-50"
                          title="Switch is only available for admins"
                        >
                          <SwapOutlined />
                          Switch
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {credentials.length === 0 && (
                  <tr><td colSpan="8" className="px-4 py-8 text-center text-[13px] text-[#6b7280]">No credentials found</td></tr>
                )}
              </tbody>
            </table>
            <Pagination currentPage={currentPage} totalItems={credentials.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
          </>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setResetModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-[400px] max-w-[90vw]">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Reset Password</h3>
              <button onClick={() => setResetModal(null)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">&#10005;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[#f6f7f9] rounded-lg p-3 text-[13px]">
                <p><span className="font-semibold">User:</span> {resetModal.first_name} {resetModal.last_name}</p>
                <p><span className="font-semibold">Username:</span> {resetModal.username}</p>
                <p><span className="font-semibold">Role:</span> {roleLabel(resetModal.role)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">New Password *</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm font-mono focus:border-orchid focus:outline-none transition-colors"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button onClick={() => setResetModal(null)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button
                onClick={handleResetPassword}
                disabled={resetting || !newPassword.trim()}
                className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid disabled:opacity-50 transition-colors"
              >
                {resetting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
