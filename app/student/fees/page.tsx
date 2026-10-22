'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast, { Toaster } from 'react-hot-toast'
import PaymentRequestModal from '@/components/PaymentRequestModal'
import { Download } from 'lucide-react'
import QRCode from 'qrcode'
import { generateVerificationToken } from '@/lib/documentVerification'

interface Student {
  id: string
  full_name: string
  admission_number: string
  class_id: string
  class_name?: string
}

interface FeeStatus {
  total_expected: number
  total_paid: number
  balance: number
}

interface FeeItem {
  name: string
  amount: number
  term: string | null
  session: string | null
}

interface Payment {
  receipt_number: string
  payment_date: string
  payment_method: string
  amount_paid: number
  reference_number?: string
  created_at: string
}

interface PendingRequest {
  id: string
  amount: number
  status: string
  payment_method: string
  reference_number: string
  notes: string | null
  created_at: string
}

export default function StudentFeesPage() {
  const { user, isLoaded } = useUser()
  const [student, setStudent] = useState<Student | null>(null)
  const [fees, setFees] = useState<FeeStatus | null>(null)
  const [feeItems, setFeeItems] = useState<FeeItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (isLoaded && !user) redirect('/sign-in')
    if (user) loadMyData()
  }, [user, isLoaded])

  const loadMyData = async () => {
    setLoading(true)
    try {
      const email = user?.emailAddresses?.[0]?.emailAddress
      if (!email) return

      // Find my student record
      const { data: userData } = await supabase
        .from('users').select('id').eq('email', email).eq('role', 'student').single()
      if (!userData) {
        toast.error('Student account not found. Contact admin.')
        setLoading(false)
        return
      }
      const { data: studentData } = await supabase
        .from('students').select('id, full_name, admission_number, class_id').eq('user_id', userData.id).single()
      if (!studentData) {
        toast.error('No student record found.')
        setLoading(false)
        return
      }
      const { data: cls } = await supabase.from('classes').select('class_name').eq('id', studentData.class_id).single()
      setStudent({ ...studentData, class_name: cls?.class_name || 'Unknown' })

      // Fetch fee structure for my class
      const { data: structures } = await supabase
        .from('fee_structures').select('name, amount, term, session').eq('class_id', studentData.class_id)
      const totalExpected = structures?.reduce((s, f) => s + f.amount, 0) || 0
      setFeeItems((structures || []) as FeeItem[])

      // Fetch confirmed payments
      const { data: paymentsData } = await supabase
        .from('fee_payments').select('amount_paid, receipt_number, payment_date, payment_method, reference_number, paid_by, created_at') // ✅ Added reference_number, paid_by
        .eq('student_id', studentData.id).order('created_at', { ascending: false })
      const totalPaid = paymentsData?.reduce((s, p) => s + p.amount_paid, 0) || 0
      setPayments((paymentsData || []) as Payment[])

      // Fetch pending requests
      const { data: reqs } = await supabase
        .from('payment_requests').select('id, amount, status, payment_method, reference_number, notes, created_at')
        .eq('student_id', studentData.id).order('created_at', { ascending: false })
      setPendingRequests((reqs || []) as PendingRequest[])

      const totalPending = reqs?.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0) || 0

      setFees({
        total_expected: totalExpected,
        total_paid: totalPaid,
        balance: totalExpected - totalPaid,
      })
    } catch (err: any) {
      toast.error('Failed to load fees: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="p-8">
        <p className="text-gray-700">No student record linked to your account.</p>
        <a href="/student" className="text-orange-600 hover:underline mt-4 inline-block font-medium">← Back to Dashboard</a>
      </div>
    )
  }

  const balance = fees?.balance || 0
  const pendingTotal = pendingRequests.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0)

  const handleDownloadReceipt = async (receipt: any) => {
    if (!student) return
    try {
      let qrDataUrl = ''
      const token = await generateVerificationToken({
        document_type: 'receipt',
        student_id: student.id,
        term: 'Payment',
        session: new Date().getFullYear().toString(),
        metadata: { receipt_number: receipt.receipt_number, amount_paid: receipt.amount_paid, payment_method: receipt.payment_method, reference_number: receipt.reference_number || 'N/A', payment_date: receipt.payment_date || receipt.created_at },
      })
      qrDataUrl = await QRCode.toDataURL(`https://my-school-management-system.vercel.app/verify/${token}`, { width: 300, margin: 1 })

      const printWindow = window.open('', '_blank', 'width=800,height=700')
      if (!printWindow) { alert('Please allow popups'); return }
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>@media print { @page { size: A4; margin: 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } } body { font-family: Arial, sans-serif; padding: 40px; } .row { display: flex; justify-content: space-between; margin: 12px 0; padding-bottom: 8px; border-bottom: 1px solid #ccc; } .label { color: #555; font-size: 13px; } .value { font-weight: bold; color: #000; font-size: 13px; } .amount { color: #22c55e; font-size: 16px; } .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 2px solid #22c55e; padding-top: 20px; } .signature-box { text-align: center; font-size: 11px; } .signature-line { border-top: 1px solid #000; padding-top: 5px; width: 150px; margin-top: 30px; } .qr-box { text-align: center; border: 2px solid #22c55e; padding: 6px; border-radius: 8px; } .qr-box img { width: 100px; height: 100px; display: block; margin: 0 auto; } .qr-label { font-size: 8px; margin-top: 4px; color: #22c55e; font-weight: bold; }</style></head><body><h3 style="text-align:center">Mannaplus Group of Schools</h3><p style="text-align:center;color:#666;margin-bottom:20px">Official Payment Receipt</p><div class="row"><span class="label">Receipt:</span><span class="value">${receipt.receipt_number}</span></div><div class="row"><span class="label">Student:</span><span class="value">${student.full_name}</span></div><div class="row"><span class="label">Admission:</span><span class="value">${student.admission_number}</span></div><div class="row"><span class="label">Amount:</span><span class="value amount">₦${receipt.amount_paid.toLocaleString()}</span></div><div class="row"><span class="label">Date:</span><span class="value">${new Date(receipt.payment_date || receipt.created_at).toLocaleDateString()}</span></div><div class="row"><span class="label">Method:</span><span class="value">${receipt.payment_method}</span></div><div class="row"><span class="label">Reference:</span><span class="value">${receipt.reference_number || 'N/A'}</span></div><div class="footer"><div class="signature-box"><div class="signature-line">Authorized Signature</div></div>${qrDataUrl ? `<div class="qr-box"><img src="${qrDataUrl}"/><div class="qr-label">SCAN TO VERIFY</div></div>` : ''}</div><script>window.onload = function() { setTimeout(() => window.print(), 250); }</script></body></html>`)
      printWindow.document.close()
    } catch (error) { toast.error('Failed to download receipt') }
  }

  const handleDownloadAllReceipts = async () => {
    if (!student || payments.length === 0) { toast.error('No payments to download'); return }
    try {
      let bodyContent = ''
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i]
        let qrDataUrl = ''
        const token = await generateVerificationToken({ document_type: 'receipt', student_id: student.id, term: 'Payment', session: new Date().getFullYear().toString(), metadata: { receipt_number: p.receipt_number, amount_paid: p.amount_paid, payment_method: p.payment_method, reference_number: p.reference_number || 'N/A', payment_date: p.payment_date || p.created_at } })
        qrDataUrl = await QRCode.toDataURL(`https://my-school-management-system.vercel.app/verify/${token}`, { width: 300, margin: 1 })
        
        bodyContent += `<div style="page-break-inside: avoid; margin-bottom: 40px; padding: 20px; border: 1px solid #eee; border-radius: 8px;"><h3 style="text-align:center;font-family:Arial">Mannaplus Group of Schools</h3><p style="text-align:center;color:#666;font-family:Arial">Official Payment Receipt</p><div class="row"><span class="label">Receipt:</span><span class="value">${p.receipt_number}</span></div><div class="row"><span class="label">Student:</span><span class="value">${student.full_name}</span></div><div class="row"><span class="label">Admission:</span><span class="value">${student.admission_number}</span></div><div class="row"><span class="label">Amount:</span><span class="value amount">₦${p.amount_paid.toLocaleString()}</span></div><div class="row"><span class="label">Date:</span><span class="value">${new Date(p.payment_date || p.created_at).toLocaleDateString()}</span></div><div class="row"><span class="label">Method:</span><span class="value">${p.payment_method}</span></div><div class="row"><span class="label">Reference:</span><span class="value">${p.reference_number || 'N/A'}</span></div><div class="footer"><div class="signature-box"><div class="signature-line">Authorized Signature</div></div>${qrDataUrl ? `<div class="qr-box"><img src="${qrDataUrl}"/><div class="qr-label">SCAN TO VERIFY</div></div>` : ''}</div></div>${i < payments.length - 1 ? '<div style="page-break-after: always;"></div>' : ''}`
      }
      const printWindow = window.open('', '_blank', 'width=800,height=900')
      if (!printWindow) { alert('Please allow popups'); return }
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Bulk Receipts</title><style>@media print { @page { size: A4; margin: 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } } body { background: #fff; padding: 20px; font-family: Arial, sans-serif; } .row { display: flex; justify-content: space-between; margin: 12px 0; padding-bottom: 8px; border-bottom: 1px solid #ccc; } .label { color: #555; font-size: 13px; } .value { font-weight: bold; color: #000; font-size: 13px; } .amount { color: #22c55e; font-size: 16px; } .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; border-top: 2px solid #22c55e; padding-top: 20px; } .signature-box { text-align: center; font-size: 11px; } .signature-line { border-top: 1px solid #000; padding-top: 5px; width: 150px; margin-top: 30px; } .qr-box { text-align: center; border: 2px solid #22c55e; padding: 6px; border-radius: 8px; } .qr-box img { width: 100px; height: 100px; display: block; margin: 0 auto; } .qr-label { font-size: 8px; margin-top: 4px; color: #22c55e; font-weight: bold; }</style></head><body>${bodyContent}<script>window.onload = function() { setTimeout(() => window.print(), 500); }</script></body></html>`)
      printWindow.document.close()
    } catch (error) { toast.error('Failed to download bulk receipts') }
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <a href="/student" className="text-orange-600 hover:underline mb-4 inline-block font-medium">← Back to Dashboard</a>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Fees</h1>
            <p className="text-gray-600">{student.full_name} — {student.admission_number} ({student.class_name})</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={balance <= 0}
            className="bg-green-600 text-white px-5 py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            💳 Make Payment
          </button>
        </div>

        {fees && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-5 rounded-lg text-center">
                <p className="text-sm text-blue-600 mb-1">Total Expected</p>
                <p className="text-2xl font-bold text-blue-900">₦{fees.total_expected.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-5 rounded-lg text-center">
                <p className="text-sm text-green-600 mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-green-900">₦{fees.total_paid.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-50 p-5 rounded-lg text-center">
                <p className="text-sm text-yellow-600 mb-1">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-900">₦{pendingTotal.toLocaleString()}</p>
              </div>
              <div className={`p-5 rounded-lg text-center ${balance <= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm mb-1 ${balance <= 0 ? 'text-green-600' : 'text-red-600'}`}>Balance</p>
                <p className={`text-2xl font-bold ${balance <= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  ₦{balance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">Fee Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-bold text-gray-900">Fee Item</th>
                      <th className="p-3 text-left font-bold text-gray-900">Term / Session</th>
                      <th className="p-3 text-right font-bold text-gray-900">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeItems.length === 0 ? (
                      <tr><td colSpan={3} className="p-6 text-center text-gray-600">No fee structure published for your class yet.</td></tr>
                    ) : (
                      feeItems.map((item, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{item.name}</td>
                          <td className="p-3 text-sm text-gray-600">{item.term || '-'} • {item.session || '-'}</td>
                          <td className="p-3 text-right font-bold text-gray-900">₦{item.amount.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-green-50">
                      <td colSpan={2} className="p-3 font-bold text-gray-900">Total Expected</td>
                      <td className="p-3 text-right font-bold text-green-800">₦{fees.total_expected.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment history + pending requests */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Payment History</h3>
                {payments.length > 0 && (
                  <button onClick={handleDownloadAllReceipts} className="flex items-center gap-2 text-sm bg-green-600 text-white px-3 py-1.5 rounded font-bold hover:bg-green-700">
                    <Download size={14} /> Download All Receipts
                  </button>
                )}
              </div>
              {payments.length === 0 && pendingRequests.length === 0 ? (
                <p className="p-6 text-center text-gray-600">No payments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="p-3 text-left font-bold text-gray-900">Receipt / Reference</th>
                        <th className="p-3 text-left font-bold text-gray-900">Date</th>
                        <th className="p-3 text-left font-bold text-gray-900">Method</th>
                        <th className="p-3 text-right font-bold text-gray-900">Amount</th>
                        <th className="p-3 text-center font-bold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.filter(r => r.status === 'pending').map((r) => (
                        <tr key={`req-${r.id}`} className="border-b border-gray-100 bg-yellow-50/40 hover:bg-yellow-50">
                          <td className="p-3 font-medium text-gray-900">{r.reference_number}</td>
                          <td className="p-3 text-sm text-gray-600">{new Date(r.created_at).toLocaleString()}</td>
                          <td className="p-3 text-sm text-gray-600 capitalize">{r.payment_method}</td>
                          <td className="p-3 text-right font-bold text-yellow-700">
                            ₦{r.amount.toLocaleString()}
                            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">PENDING</span>
                          </td>
                          <td className="p-3 text-center text-gray-400 text-sm">-</td>
                        </tr>
                      ))}
                      {payments.map((p, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{p.receipt_number}</td>
                          <td className="p-3 text-sm text-gray-600">{new Date(p.created_at || p.payment_date).toLocaleString()}</td>
                          <td className="p-3 text-sm text-gray-600 capitalize">{p.payment_method}</td>
                          <td className="p-3 text-right font-bold text-green-700">₦{p.amount_paid.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <button onClick={() => handleDownloadReceipt(p)} className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center justify-center gap-1 mx-auto">
                              <Download size={14} /> Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {fees && (
        <PaymentRequestModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          student={student}
          balance={Math.max(0, fees.balance)}
          onSuccess={loadMyData}
        />
      )}
    </div>
  )
}