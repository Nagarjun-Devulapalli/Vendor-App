import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast, parseApiError } from '../components/Toast'
import BranchFilter from '../components/BranchFilter'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 10

const statusStyles = {
  pending: 'bg-[#fdecea] text-[#c0392b]',
  partial: 'bg-[#fef3e0] text-[#b07200]',
  completed: 'bg-[#e8f5ee] text-[#1a6b4a]',
}

const typeStyles = {
  contract: 'bg-[#e8f0fc] text-[#2563a8]',
  daily: 'bg-[#fef3e0] text-[#b07200]',
  per_occurrence: 'bg-[#f0f1f3] text-[#555]',
}

function formatRate(p) {
  const r = Number(p.rate)
  if (p.payment_type === 'daily') return `₹${r.toLocaleString()}/day`
  if (p.payment_type === 'per_occurrence') return `₹${r.toLocaleString()}/occ`
  return `₹${r.toLocaleString()}`
}

export default function Payments() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || '')
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Pay modal
  const [payModal, setPayModal] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [payReceiptFile, setPayReceiptFile] = useState(null)
  const [paySubmitting, setPaySubmitting] = useState(false)

  // Entries history modal
  const [entriesModal, setEntriesModal] = useState(null)
  const [deleteEntryConfirm, setDeleteEntryConfirm] = useState(null)

  const fetchPayments = () => {
    setLoading(true)
    let url = '/payments/?'
    if (selectedBranch) url += `branch=${selectedBranch}&`
    if (activeTab) url += `payment_status=${activeTab}&`
    api.get(url)
      .then((res) => setPayments(res.data.results || res.data))
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPayments(); setCurrentPage(1) }, [activeTab, selectedBranch])

  const openPayModal = (payment) => {
    setPayModal(payment)
    setPayAmount(String(Number(payment.balance_remaining) > 0 ? Number(payment.balance_remaining) : ''))
    setPayDate(new Date().toISOString().split('T')[0])
    setPayNotes('')
    setPayReceiptFile(null)
  }

  const handlePaySubmit = async () => {
    const amount = Number(payAmount)
    if (isNaN(amount) || amount <= 0) return
    setPaySubmitting(true)
    try {
      const formData = new FormData()
      formData.append('amount', amount)
      if (payDate) formData.append('payment_date', payDate)
      if (payNotes) formData.append('notes', payNotes)
      if (payReceiptFile) formData.append('receipt', payReceiptFile)
      await api.post(`/payments/${payModal.id}/pay/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Payment recorded successfully')
      setPayModal(null)
      fetchPayments()
    } catch (err) {
      toast.error(parseApiError(err, 'Error recording payment'))
    } finally {
      setPaySubmitting(false)
    }
  }

  const handleDeleteEntry = async (entryId) => {
    try {
      await api.delete(`/payment-entries/${entryId}/`)
      setDeleteEntryConfirm(null)
      toast.success('Entry deleted')
      const res = await api.get('/payments/')
      const updated = res.data.results || res.data
      setPayments(updated)
      if (entriesModal) {
        setEntriesModal(updated.find((p) => p.id === entriesModal.id) || null)
      }
    } catch (err) {
      toast.error(parseApiError(err, 'Failed to delete entry'))
    }
  }

  const totalDue = payments.reduce((s, p) => s + Number(p.total_due || 0), 0)
  const totalPaid = payments.reduce((s, p) => s + Number(p.total_paid || 0), 0)
  const totalBalance = payments.reduce((s, p) => s + Number(p.balance_remaining || 0), 0)

  const tabs = [
    { key: '', label: 'All Payments' },
    { key: 'pending', label: 'Pending' },
    { key: 'partial', label: 'Partial' },
    { key: 'completed', label: 'Completed' },
  ]

  const pagedPayments = payments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-5">
      {user?.role === 'superadmin' && (
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-medium text-[#6b7280]">Filter by Branch:</span>
          <BranchFilter value={selectedBranch} onChange={(val) => { setSelectedBranch(val); setCurrentPage(1) }} />
        </div>
      )}

      {/* Summary Cards */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-[#e4e8ed]">
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Total Due</label>
            <div className="font-serif text-[22px] font-bold text-[#1a1f2e] mt-1">₹{totalDue.toLocaleString()}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">{payments.length} payments · this branch</div>
          </div>
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Total Paid</label>
            <div className="font-serif text-[22px] font-bold text-orchid mt-1">₹{totalPaid.toLocaleString()}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">{payments.filter((p) => p.payment_status === 'completed').length} fully settled</div>
          </div>
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Balance Remaining</label>
            <div className="font-serif text-[22px] font-bold text-[#c0392b] mt-1">₹{totalBalance.toLocaleString()}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">{payments.filter((p) => p.payment_status !== 'completed').length} outstanding</div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-0.5 px-5 border-b border-[#e4e8ed]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchParams(tab.key ? { tab: tab.key } : {}) }}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key ? 'text-orchid border-orchid font-semibold' : 'text-[#6b7280] border-transparent hover:text-[#1a1f2e]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Activity</th>
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Vendor</th>
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Type</th>
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Rate</th>
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Total Due</th>
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Paid</th>
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Balance</th>
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Status</th>
                <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#e4e8ed] animate-pulse">
                      <td className="px-4 py-3.5"><div className="space-y-1.5"><div className="h-3 bg-[#e4e8ed] rounded w-32" /><div className="h-2.5 bg-[#e4e8ed] rounded w-20" /></div></td>
                      <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-24" /></td>
                      <td className="px-4 py-3.5"><div className="h-5 bg-[#e4e8ed] rounded-full w-16" /></td>
                      <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-20" /></td>
                      <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-16" /></td>
                      <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-16" /></td>
                      <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-16" /></td>
                      <td className="px-4 py-3.5"><div className="h-5 bg-[#e4e8ed] rounded-full w-14" /></td>
                      <td className="px-4 py-3.5"><div className="flex gap-1.5"><div className="h-7 bg-[#e4e8ed] rounded w-10" /><div className="h-7 bg-[#e4e8ed] rounded w-20" /></div></td>
                    </tr>
                  ))
                : pagedPayments.map((p, i) => (
                    <tr key={p.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-[13px] block">{p.activity_title}</span>
                        <span className="text-[11px] text-[#6b7280] capitalize">{p.activity_status?.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px]">{p.vendor_name}</td>
                      <td className="px-4 py-3.5">
                        <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeStyles[p.payment_type] || 'bg-[#f0f1f3] text-[#555]'}`}>
                          {p.payment_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] tabular-nums font-medium">{formatRate(p)}</td>
                      <td className="px-4 py-3.5 font-semibold text-[13px] tabular-nums">₹{Number(p.total_due).toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-semibold text-[13px] tabular-nums text-orchid">₹{Number(p.total_paid).toLocaleString()}</td>
                      <td className="px-4 py-3.5">
                        <span className={`font-bold text-[13px] tabular-nums ${Number(p.balance_remaining) > 0 ? 'text-[#c0392b]' : 'text-[#1a6b4a]'}`}>
                          ₹{Number(p.balance_remaining).toLocaleString()}
                        </span>
                        {Number(p.extra_paid) > 0 && (
                          <span className="block text-[11px] text-[#1a6b4a] font-medium">+₹{Number(p.extra_paid).toLocaleString()} extra</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[p.payment_status] || 'bg-[#f0f1f3] text-[#555]'}`}>
                          {p.payment_status === 'completed' ? 'Paid' : p.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {p.payment_status !== 'completed' && (
                            <button
                              onClick={() => openPayModal(p)}
                              className="px-2.5 py-1 bg-orchid text-white rounded-lg text-[11px] font-semibold hover:bg-orchid-mid transition-colors"
                            >
                              Pay
                            </button>
                          )}
                          <button
                            onClick={() => setEntriesModal(p)}
                            className="px-2.5 py-1 border-[1.5px] border-[#e4e8ed] rounded-lg text-[11px] font-semibold text-[#6b7280] hover:bg-[#f6f7f9] transition-colors"
                          >
                            History ({(p.entries || []).length})
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
              {!loading && payments.length === 0 && (
                <tr><td colSpan="9" className="px-4 py-8 text-center text-[13px] text-[#6b7280]">No payments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalItems={payments.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
      </div>

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setPayModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-[440px] max-w-[90vw] max-h-[90vh] overflow-auto">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Record Payment</h3>
              <button onClick={() => setPayModal(null)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="font-semibold text-[15px]">{payModal.activity_title}</p>
                <p className="text-xs text-[#6b7280]">{payModal.vendor_name} · <span className="capitalize">{payModal.payment_type?.replace('_', ' ')}</span> · {formatRate(payModal)}</p>
              </div>

              {/* Summary */}
              <div className="bg-[#f6f7f9] rounded-lg p-3.5 space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6b7280]">Total Due</span>
                  <span className="font-semibold">₹{Number(payModal.total_due).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6b7280]">Already Paid</span>
                  <span className="font-semibold text-orchid">₹{Number(payModal.total_paid).toLocaleString()}</span>
                </div>
                <div className="border-t border-[#e4e8ed] pt-2 flex justify-between text-[13px]">
                  <span className="text-[#6b7280] font-medium">Balance Remaining</span>
                  <span className="font-bold text-[#c0392b]">₹{Number(payModal.balance_remaining).toLocaleString()}</span>
                </div>
              </div>

              {/* Progress bar */}
              {Number(payModal.total_due) > 0 && (
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-[#6b7280] mb-1.5">
                    <span>Payment Progress</span>
                    <span>{Math.min(Math.round((Number(payModal.total_paid) / Number(payModal.total_due)) * 100), 100)}%</span>
                  </div>
                  <div className="h-2 bg-[#f0f1f3] rounded-full overflow-hidden">
                    <div className="h-full bg-orchid rounded-full transition-all" style={{ width: `${Math.min((Number(payModal.total_paid) / Number(payModal.total_due)) * 100, 100)}%` }} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Amount (₹) *</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  autoFocus
                  className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm font-semibold focus:border-orchid focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Payment Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Notes</label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  rows="2"
                  placeholder="e.g. March installment"
                  className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Receipt (optional)</label>
                <div className="border-[1.5px] border-dashed border-[#e4e8ed] rounded-lg p-3 hover:border-orchid transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setPayReceiptFile(e.target.files[0])}
                    className="w-full text-sm text-[#6b7280] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-orchid/10 file:text-orchid hover:file:bg-orchid/20 cursor-pointer"
                  />
                  {payReceiptFile && <p className="text-[12px] text-orchid font-medium mt-1.5">{payReceiptFile.name}</p>}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button type="button" onClick={() => setPayModal(null)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button
                onClick={handlePaySubmit}
                disabled={paySubmitting || !payAmount || Number(payAmount) <= 0}
                className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid disabled:opacity-50 transition-colors"
              >
                {paySubmitting ? 'Processing...' : `Pay ₹${Number(payAmount || 0).toLocaleString()} →`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {entriesModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setEntriesModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-[600px] max-w-[95vw] max-h-[90vh] flex flex-col">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold">Payment History</h3>
                <p className="text-xs text-[#6b7280] mt-0.5">{entriesModal.activity_title} · {entriesModal.vendor_name}</p>
              </div>
              <button onClick={() => setEntriesModal(null)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>

            {/* Summary row */}
            <div className="px-6 py-3 bg-[#f6f7f9] border-b border-[#e4e8ed] flex gap-6 flex-wrap">
              <div>
                <span className="text-[11px] text-[#6b7280] font-semibold uppercase tracking-wider">Total Due</span>
                <div className="font-bold text-[13px] mt-0.5">₹{Number(entriesModal.total_due).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-[11px] text-[#6b7280] font-semibold uppercase tracking-wider">Total Paid</span>
                <div className="font-bold text-[13px] text-orchid mt-0.5">₹{Number(entriesModal.total_paid).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-[11px] text-[#6b7280] font-semibold uppercase tracking-wider">Balance</span>
                <div className={`font-bold text-[13px] mt-0.5 ${Number(entriesModal.balance_remaining) > 0 ? 'text-[#c0392b]' : 'text-[#1a6b4a]'}`}>
                  ₹{Number(entriesModal.balance_remaining).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-[#6b7280] font-semibold uppercase tracking-wider">Status</span>
                <div className="mt-0.5">
                  <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[entriesModal.payment_status] || 'bg-[#f0f1f3] text-[#555]'}`}>
                    {entriesModal.payment_status === 'completed' ? 'Paid' : entriesModal.payment_status}
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-auto flex-1">
              {(entriesModal.entries || []).length === 0 ? (
                <div className="px-6 py-10 text-center text-[13px] text-[#6b7280]">No payment entries yet</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
                      <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Date</th>
                      <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Amount</th>
                      <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Paid By</th>
                      <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Notes</th>
                      <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Receipt</th>
                      <th className="px-4 py-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(entriesModal.entries || []).map((entry) => (
                      <tr key={entry.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb]">
                        <td className="px-4 py-3 text-[13px] text-[#6b7280]">{entry.payment_date}</td>
                        <td className="px-4 py-3 font-bold text-[13px] text-orchid tabular-nums">₹{Number(entry.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-[13px]">{entry.paid_by_name || '—'}</td>
                        <td className="px-4 py-3 text-[12px] text-[#6b7280] max-w-[140px] truncate">{entry.notes || '—'}</td>
                        <td className="px-4 py-3">
                          {entry.receipt ? (
                            <a href={entry.receipt} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e8f5ee] text-[#1a6b4a] rounded text-[11px] font-semibold hover:bg-[#d0ebdb] transition-colors">
                              📄 View
                            </a>
                          ) : (
                            <span className="text-[11px] text-[#6b7280]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDeleteEntryConfirm(entry)}
                            className="w-6 h-6 flex items-center justify-center rounded text-[#6b7280] hover:bg-[#fdecea] hover:text-[#c0392b] transition-colors text-xs"
                            title="Delete entry"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteEntryConfirm && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-[#fdecea] rounded-full flex items-center justify-center mx-auto mb-3 text-xl text-[#c0392b]"><ExclamationCircleOutlined /></div>
            <h2 className="font-serif text-lg font-bold mb-1">Delete Payment Entry</h2>
            <p className="text-sm text-[#6b7280] mb-5">Are you sure you want to delete this payment entry of <span className="font-semibold text-[#1a1f2e]">₹{Number(deleteEntryConfirm.amount).toLocaleString()}</span>? This action cannot be undone.</p>
            <div className="flex gap-2.5 justify-center">
              <button onClick={() => setDeleteEntryConfirm(null)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button onClick={() => handleDeleteEntry(deleteEntryConfirm.id)} className="px-4 py-2 bg-[#c0392b] text-white rounded-lg text-[13px] font-semibold hover:bg-[#a93226] transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
