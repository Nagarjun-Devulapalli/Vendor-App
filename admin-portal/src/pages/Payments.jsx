import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useToast, parseApiError } from '../components/Toast'
import { FileTextOutlined, UploadOutlined, CheckOutlined } from '@ant-design/icons'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 10

const statusStyles = {
  pending: 'bg-[#fdecea] text-[#c0392b]',
  partial: 'bg-[#fef3e0] text-[#b07200]',
  completed: 'bg-[#e8f5ee] text-[#1a6b4a]',
}

export default function Payments() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || '')
  const [currentPage, setCurrentPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ activity: '', expected_amount: '', actual_amount_paid: '', payment_status: 'pending', payment_date: '', notes: '' })
  const [payNowModal, setPayNowModal] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [receiptModal, setReceiptModal] = useState(null)
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptUploading, setReceiptUploading] = useState(false)

  const fetchPayments = () => {
    let url = '/payments/'
    if (activeTab) url += `?payment_status=${activeTab}`
    api.get(url).then((res) => setPayments(res.data.results || res.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchPayments(); setCurrentPage(1) }, [activeTab])
  useEffect(() => {
    api.get('/activities/').then((res) => setActivities(res.data.results || res.data)).catch(console.error)
  }, [])

  const handleActivitySelect = (actId) => {
    const act = activities.find((a) => a.id === Number(actId))
    setForm({ ...form, activity: actId, expected_amount: act?.expected_cost || '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const paid = Number(form.actual_amount_paid) || 0
      const expected = Number(form.expected_amount) || 0
      const autoStatus = paid <= 0 ? 'pending' : paid >= expected ? 'completed' : 'partial'
      await api.post('/payments/', { ...form, payment_status: autoStatus })
      setShowModal(false)
      setForm({ activity: '', expected_amount: '', actual_amount_paid: '', payment_status: 'pending', payment_date: '', notes: '' })
      fetchPayments()
    } catch (err) {
      toast.error(parseApiError(err, 'Error recording payment'))
    } finally {
      setSubmitting(false)
    }
  }

  const openPayNow = (payment) => {
    const remaining = Number(payment.expected_amount) - Number(payment.actual_amount_paid)
    setPayNowModal(payment)
    setPayAmount(String(remaining))
  }

  const handlePayNowSubmit = async () => {
    const amount = Number(payAmount)
    if (isNaN(amount) || amount <= 0) return
    setPaySubmitting(true)
    const newPaid = Number(payNowModal.actual_amount_paid) + amount
    const newStatus = newPaid >= Number(payNowModal.expected_amount) ? 'completed' : 'partial'
    try {
      await api.patch(`/payments/${payNowModal.id}/`, {
        actual_amount_paid: newPaid.toFixed(2),
        payment_status: newStatus,
        payment_date: new Date().toISOString().split('T')[0],
      })
      setPayNowModal(null)
      fetchPayments()
    } catch (err) {
      toast.error(parseApiError(err, 'Error updating payment'))
    } finally {
      setPaySubmitting(false)
    }
  }

  const handleReceiptUpload = async () => {
    if (!receiptFile) return
    setReceiptUploading(true)
    try {
      const formData = new FormData()
      formData.append('receipt', receiptFile)
      await api.post(`/payments/${receiptModal.id}/upload-receipt/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setReceiptModal(null)
      setReceiptFile(null)
      fetchPayments()
    } catch (err) {
      toast.error(parseApiError(err, 'Failed to upload receipt'))
    } finally {
      setReceiptUploading(false)
    }
  }

  const totalExpected = payments.reduce((s, p) => s + Number(p.expected_amount || 0), 0)
  const totalPaid = payments.reduce((s, p) => s + Number(p.actual_amount_paid || 0), 0)
  const totalPending = totalExpected - totalPaid

  const tabs = [
    { key: '', label: 'All Payments' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'partial', label: 'Partial' },
  ]

  const pagedPayments = payments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold">Payments</h3>
          <p className="text-[13px] text-[#6b7280] mt-0.5">Manage vendor payments for your branch</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid transition-colors">
          + Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="bg-white rounded-xl border border-[#e4e8ed] shadow-sm overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-[#e4e8ed]">
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Total Budget</label>
            <div className="font-serif text-[22px] font-bold text-[#1a1f2e] mt-1">₹{totalExpected.toLocaleString()}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">All activities · this branch</div>
          </div>
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Amount Paid</label>
            <div className="font-serif text-[22px] font-bold text-orchid mt-1">₹{totalPaid.toLocaleString()}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">{payments.filter(p => p.payment_status === 'completed').length} transactions completed</div>
          </div>
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Pending Payment</label>
            <div className="font-serif text-[22px] font-bold text-[#c0392b] mt-1">₹{totalPending.toLocaleString()}</div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">{payments.filter(p => p.payment_status === 'pending').length} invoices outstanding</div>
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
              onClick={() => {
                setActiveTab(tab.key)
                setSearchParams(tab.key ? { tab: tab.key } : {})
              }}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'text-orchid border-orchid font-semibold'
                  : 'text-[#6b7280] border-transparent hover:text-[#1a1f2e]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#e4e8ed]">
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Activity</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Vendor</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Total Amount</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Paid</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Payment Date</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Status</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Receipt</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Receipt</th>
              <th className="text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#e4e8ed] animate-pulse">
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-32" /></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-24" /></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-16" /></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-16" /></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-20" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 bg-[#e4e8ed] rounded-full w-14" /></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-12" /></td>
                    <td className="px-4 py-3.5"><div className="h-3 bg-[#e4e8ed] rounded w-12" /></td>
                    <td className="px-4 py-3.5"><div className="h-7 bg-[#e4e8ed] rounded w-16" /></td>
                  </tr>
                ))
              : pagedPayments.map((p, i) => (
              <tr key={p.id} className="border-b border-[#e4e8ed] last:border-0 hover:bg-[#f9fafb] animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <td className="px-4 py-3.5">
                  <span className="font-semibold text-[13px]">{p.activity_title || p.activity?.title}</span>
                </td>
                <td className="px-4 py-3.5 text-[13px]">{p.vendor_name || p.activity?.vendor_name}</td>
                <td className="px-4 py-3.5 font-semibold text-[13px] tabular-nums">₹{Number(p.expected_amount).toLocaleString()}</td>
                <td className={`px-4 py-3.5 font-semibold text-[13px] tabular-nums ${Number(p.actual_amount_paid) >= Number(p.expected_amount) ? 'text-orchid' : Number(p.actual_amount_paid) > 0 ? 'text-[#e8a020]' : 'text-[#c0392b]'}`}>
                  ₹{Number(p.actual_amount_paid).toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-xs text-[#6b7280]">{p.payment_date || '—'}</td>
                <td className="px-4 py-3.5">
                  <span className={`badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[p.payment_status] || 'bg-[#f0f1f3] text-[#555]'}`}>
                    {p.payment_status === 'completed' ? 'Paid' : p.payment_status}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {p.receipt ? (
                    <a href={p.receipt} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#e8f5ee] text-[#1a6b4a] rounded-lg text-[11px] font-semibold hover:bg-[#d0ebdb] transition-colors">
                      📄 View
                    </a>
                  ) : p.payment_status === 'completed' ? (
                    <button onClick={() => setReceiptModal(p)} className="inline-flex items-center gap-1 px-2.5 py-1 border-[1.5px] border-dashed border-[#e4e8ed] rounded-lg text-[11px] font-semibold text-[#6b7280] hover:bg-[#f6f7f9] transition-colors">
                      ⬆ Upload
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#6b7280]">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  {p.payment_status !== 'completed' ? (
                    <button
                      onClick={() => openPayNow(p)}
                      className="px-3 py-1 border-[1.5px] border-[#e4e8ed] rounded-lg text-xs font-semibold hover:bg-[#f6f7f9] transition-colors"
                    >
                      Pay Now
                    </button>
                  ) : (
                    <span className="text-[11px] text-orchid font-semibold">✓ Done</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && payments.length === 0 && <tr><td colSpan="8" className="px-4 py-8 text-center text-[13px] text-[#6b7280]">No payments found</td></tr>}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={payments.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Pay Now Modal */}
      {payNowModal && (() => {
        const expected = Number(payNowModal.expected_amount)
        const alreadyPaid = Number(payNowModal.actual_amount_paid)
        const remaining = expected - alreadyPaid
        const progress = expected > 0 ? (alreadyPaid / expected) * 100 : 0
        return (
          <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setPayNowModal(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-[420px] max-w-[90vw]">
              <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold">Record Payment</h3>
                <button onClick={() => setPayNowModal(null)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Activity</span>
                  <p className="font-semibold text-[15px] mt-0.5">{payNowModal.activity_title}</p>
                  <p className="text-xs text-[#6b7280]">{payNowModal.vendor_name}</p>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-[#6b7280] mb-1.5">
                    <span>Payment Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-[#f0f1f3] rounded-full overflow-hidden">
                    <div className="h-full bg-orchid rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                </div>

                {/* Amount breakdown */}
                <div className="bg-[#f6f7f9] rounded-lg p-3.5 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6b7280]">Expected Amount</span>
                    <span className="font-semibold">₹{expected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6b7280]">Already Paid</span>
                    <span className="font-semibold text-orchid">₹{alreadyPaid.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-[#e4e8ed] pt-2 flex justify-between text-[13px]">
                    <span className="text-[#6b7280] font-medium">Remaining</span>
                    <span className="font-bold text-[#c0392b]">₹{remaining.toLocaleString()}</span>
                  </div>
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Payment Amount (₹)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    autoFocus
                    className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm font-semibold focus:border-orchid focus:outline-none transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handlePayNowSubmit()}
                  />
                  {Number(payAmount) > remaining && remaining > 0 && (
                    <p className="text-[11px] text-[#b07200] mt-1 font-medium">Amount exceeds remaining balance</p>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
                <button type="button" onClick={() => setPayNowModal(null)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
                <button
                  onClick={handlePayNowSubmit}
                  disabled={paySubmitting || !payAmount || Number(payAmount) <= 0}
                  className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid disabled:opacity-50 transition-colors"
                >
                  {paySubmitting ? 'Processing...' : `Pay ₹${Number(payAmount || 0).toLocaleString()} →`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Record Payment Modal */}
      {/* Upload Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setReceiptModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-[420px] max-w-[90vw]">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Upload Receipt</h3>
              <button onClick={() => { setReceiptModal(null); setReceiptFile(null) }} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Activity</span>
                <p className="font-semibold text-[15px] mt-0.5">{receiptModal.activity_title}</p>
                <p className="text-xs text-[#6b7280]">{receiptModal.vendor_name} · ₹{Number(receiptModal.actual_amount_paid).toLocaleString()} paid</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-2">Receipt File (Image or PDF)</label>
                <div className="border-[1.5px] border-dashed border-[#e4e8ed] rounded-lg p-4 text-center hover:border-orchid transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files[0])}
                    className="w-full text-sm text-[#6b7280] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-orchid/10 file:text-orchid hover:file:bg-orchid/20 cursor-pointer"
                  />
                  {receiptFile && (
                    <p className="text-[12px] text-orchid font-medium mt-2">{receiptFile.name}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button type="button" onClick={() => { setReceiptModal(null); setReceiptFile(null) }} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button
                onClick={handleReceiptUpload}
                disabled={receiptUploading || !receiptFile}
                className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid disabled:opacity-50 transition-colors"
              >
                {receiptUploading ? 'Uploading...' : 'Upload Receipt →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 modal-backdrop flex items-center justify-center z-[1000] p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[90vw]">
            <div className="px-6 pt-5 pb-4 border-b border-[#e4e8ed] flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Record Payment</h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 bg-[#f6f7f9] rounded-md flex items-center justify-center text-sm text-[#6b7280] hover:text-[#1a1f2e]">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Activity *</label>
                <select value={form.activity} onChange={(e) => handleActivitySelect(e.target.value)} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required>
                  <option value="">Select activity</option>
                  {activities.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </div>
              {form.expected_amount && (
                <div className="bg-[#f6f7f9] rounded-lg px-3.5 py-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#6b7280]">Expected Cost (from activity)</span>
                  <span className="font-serif text-lg font-bold text-[#1a1f2e]">₹{Number(form.expected_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Amount Paid (₹) *</label>
                  <input type="number" value={form.actual_amount_paid} onChange={(e) => setForm({ ...form, actual_amount_paid: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Payment Date</label>
                  <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1a1f2e] mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border-[1.5px] border-[#e4e8ed] rounded-lg px-3.5 py-2.5 text-sm focus:border-orchid focus:outline-none transition-colors" rows="2" />
              </div>
            </form>
            <div className="px-6 py-4 border-t border-[#e4e8ed] flex justify-end gap-2.5">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border-[1.5px] border-[#e4e8ed] rounded-lg text-[13px] font-semibold hover:bg-[#f6f7f9] transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-orchid text-white rounded-lg text-[13px] font-semibold hover:bg-orchid-mid disabled:opacity-50 transition-colors">
                {submitting ? 'Saving...' : 'Record Payment →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
