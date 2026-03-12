import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BankOutlined } from '@ant-design/icons'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const success = await login(username, password)
    if (success) navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orchid-dark to-orchid flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orchid rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl text-white">
            <BankOutlined />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1a1f2e]">Orchids Schools</h1>
          <p className="text-[#6b7280] mt-1 text-sm">Vendor Portal — Admin</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors"
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors"
              placeholder="Enter password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orchid text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-orchid-mid disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
