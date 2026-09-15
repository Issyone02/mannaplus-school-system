'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast, { Toaster } from 'react-hot-toast'
import PaymentRequestModal from '@/components/PaymentRequestModal'

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
        .from('fee_payments').select('amount_paid, receipt_number, payment_date, payment_method, created_at')
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
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">Payment History</h3>
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
                        </tr>
                      ))}
                      {payments.map((p, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{p.receipt_number}</td>
                          <td className="p-3 text-sm text-gray-600">{new Date(p.created_at || p.payment_date).toLocaleString()}</td>
                          <td className="p-3 text-sm text-gray-600 capitalize">{p.payment_method}</td>
                          <td className="p-3 text-right font-bold text-green-700">₦{p.amount_paid.toLocaleString()}</td>
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