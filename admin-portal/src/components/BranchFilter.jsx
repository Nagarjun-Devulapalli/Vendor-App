import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { SearchOutlined } from '@ant-design/icons'

export default function BranchFilter({ value, onChange }) {
  const { user } = useAuth()
  const [branches, setBranches] = useState([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (user?.role === 'superadmin') {
      api.get('/branches/').then(res => setBranches(res.data.results || res.data)).catch(console.error)
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (user?.role !== 'superadmin') return null

  const selectedBranch = branches.find(b => String(b.id) === String(value))
  const filtered = branches.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} className="relative min-w-[200px]">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors bg-white text-left flex items-center justify-between gap-2"
      >
        <span className={selectedBranch ? 'text-[#1a1f2e]' : 'text-[#6b7280]'}>
          {selectedBranch ? selectedBranch.name : 'All Branches'}
        </span>
        <svg className={`w-4 h-4 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e4e8ed] rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-[#e4e8ed]">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search branches..."
                className="w-full border-[1.5px] border-[#e4e8ed] rounded-md pl-8 pr-3 py-1.5 text-sm focus:border-orchid focus:outline-none transition-colors"
                autoFocus
              />
              <SearchOutlined className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b7280] text-xs" />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false) }}
              className={`w-full px-3.5 py-2 text-left text-sm hover:bg-[#f6f7f9] transition-colors ${!value ? 'bg-orchid-light text-orchid font-medium' : 'text-[#1a1f2e]'}`}
            >
              All Branches
            </button>
            {filtered.map(b => (
              <button
                type="button"
                key={b.id}
                onClick={() => { onChange(String(b.id)); setOpen(false) }}
                className={`w-full px-3.5 py-2 text-left text-sm hover:bg-[#f6f7f9] transition-colors ${String(b.id) === String(value) ? 'bg-orchid-light text-orchid font-medium' : 'text-[#1a1f2e]'}`}
              >
                {b.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3.5 py-3 text-center text-[13px] text-[#6b7280]">No branches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
