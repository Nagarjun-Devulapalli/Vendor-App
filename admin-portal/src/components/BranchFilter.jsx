import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function BranchFilter({ value, onChange }) {
  const { user } = useAuth()
  const [branches, setBranches] = useState([])

  useEffect(() => {
    if (user?.role === 'superadmin') {
      api.get('/branches/').then(res => setBranches(res.data.results || res.data)).catch(console.error)
    }
  }, [user])

  if (user?.role !== 'superadmin') return null

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors min-w-[200px]"
    >
      <option value="">All Branches</option>
      {branches.map(b => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  )
}
