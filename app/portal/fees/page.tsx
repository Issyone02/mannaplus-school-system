'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { CreditCard, Upload, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface FeeSummary {
  student_id: string
  full_name: string
  admission_number: string
  class_id: string
  fee_id: string
  fee_name: string
  fee_amount: number
  due_date: string
  amount_paid: number
  balance_due: number
  status: 'Paid' | 'Overdue' | 'Pending'
}

interface PaymentRequest {
  id: string
  student_id: string
  fee_name: string
  amount: number
  payment_method: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  created_at: string
  proof_image_url?: string
}

export default function ParentFeesPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [fees, setFees] = useState<FeeSummary[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedFee, setSelectedFee] = useState<FeeSummary | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    method: 'transfer' as 'transfer' | 'cheque' | 'cash',
    reference: '',
    notes: '',
    proof: null as File | null
  })

  useEffect(() => {
    if (isLoaded && user) {
      fetchFeesAndHistory()
    }
  }, [user, isLoaded])

 
useEffect(() => {
  // Read student ID from URL param
  const urlParams = new URLSearchParams(window.location.search)
  const studentParam = urlParams.get('student')
  
  if (studentParam && fees.length > 0) {
    // Optional: Scroll to first fee for this student
    const firstFeeElement = document.querySelector(`[data-student-id="${studentParam}"]`)
    if (firstFeeElement) {
      firstFeeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Add highlight effect
      firstFeeElement.classList.add('ring-2', 'ring-blue-500')
      setTimeout(() => {
        firstFeeElement.classList.remove('ring-2', 'ring-blue-500')
      }, 2000)
    }
  }
}, [fees])

 const fetchFeesAndHistory = async () => {
  setLoading(true)
  try {
    const email = user?.emailAddresses[0]?.emailAddress
    console.log('🔍 Looking for parent with email:', email)
    
    if (!email) {
      toast('No email found in Clerk account')
      setLoading(false)
      return
    }

    // SIMPLE QUERY: Find parent by email (case-insensitive)
    const { data: parents, error: parentError } = await supabase
      .from('parents')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())  // Ensure lowercase match
    
    console.log('📊 Parent query result:', { parents, parentError })
    
    if (parentError) {
      console.error('❌ Parent query error:', parentError)
      toast('Error finding parent: ' + parentError.message)
      setLoading(false)
      return
    }
    
    if (!parents || parents.length === 0) {
      // Try without lowercase in case email is stored differently
      const { data: parents2 } = await supabase
        .from('parents')
        .select('id, email, full_name')
        .eq('email', email)
      
      console.log('📊 Second attempt:', parents2)
      
      if (!parents2 || parents2.length === 0) {
        toast('Parent account not found. Please contact admin to link your account.')
        setLoading(false)
        return
      }
      var parent = parents2[0]
    } else {
      var parent = parents[0]
    }
    
    console.log('✅ Found parent:', parent)

    // Get linked students
    const { data: links, error: linksError } = await supabase
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', parent.id)
    
    console.log('📚 Linked students:', links)
    
    if (linksError || !links || links.length === 0) {
      toast('No students linked to your account')
      setFees([])
      setLoading(false)
      return
    }
    
    const studentIds = links.map(l => l.student_id)
    
    // Get student details
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, full_name, admission_number, class_id')
      .in('id', studentIds)
    
    console.log('👨‍🎓 Students:', studentsData)
    
    // Get fee structures for these classes
    const classIds = [...new Set(studentsData?.map(s => s.class_id) || [])]
    const { data: feeStructures } = await supabase
      .from('fee_structures')
      .select('*')
      .in('class_id', classIds)
      .eq('term', 'First Term')
      .eq('session', '2024/2025')
      .eq('active', true)
    
    console.log('💰 Fee structures:', feeStructures)
    
    // Calculate balances
    const feesWithBalance: FeeSummary[] = []
    
    for (const student of studentsData || []) {
      for (const fee of feeStructures || []) {
        if (fee.class_id !== student.class_id) continue
        
        const { data: payments } = await supabase
          .from('fee_payments')
          .select('amount_paid')
          .eq('student_id', student.id)
          .eq('fee_structure_id', fee.id)
        
        const amount_paid = payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0
        const balance_due = fee.amount - amount_paid
        
        feesWithBalance.push({
          student_id: student.id,
          full_name: student.full_name,
          admission_number: student.admission_number,
          class_id: student.class_id,
          fee_id: fee.id,
          fee_name: fee.name,
          fee_amount: fee.amount,
          due_date: fee.due_date || '',
          amount_paid,
          balance_due,
          status: balance_due <= 0 ? 'Paid' : (fee.due_date && new Date(fee.due_date) < new Date() ? 'Overdue' : 'Pending')
        })
      }
    }
    
    console.log('📋 Final fees:', feesWithBalance)
    setFees(feesWithBalance)
    
    // Payment history
    const { data: historyData } = await supabase
      .from('payment_requests')
      .select('*, fee_structures(name)')
      .eq('parent_id', parent.id)
      .order('created_at', { ascending: false })
    
    setPaymentHistory(historyData?.map(h => ({
      ...h,
      fee_name: (h as any).fee_structures?.name || 'Unknown'
    })) || [])
    
  } catch (error: any) {
    console.error('💥 Fetch error:', error)
    toast('Failed: ' + error.message)
  } finally {
    setLoading(false)
  }
}

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFee || !user) return

    try {
      const email = user.emailAddresses[0]?.emailAddress
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('email', email)
        .single()

      if (!parent) throw new Error('Parent not found')

      // Upload proof image if provided
      let proofUrl = null
      if (paymentForm.proof && paymentForm.method !== 'cash') {
        const fileExt = paymentForm.proof.name.split('.').pop()
        const fileName = `proof_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, paymentForm.proof)
        
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName)
        
        proofUrl = publicUrl
      }

      // Create payment request
      const { error } = await supabase.from('payment_requests').insert({
        student_id: selectedFee.student_id,
        parent_id: parent.id,
        fee_structure_id: selectedFee.fee_id,
        amount: selectedFee.balance_due,
        payment_method: paymentForm.method,
        reference_number: paymentForm.reference || null,
        proof_image_url: proofUrl,
        notes: paymentForm.notes || null,
        status: paymentForm.method === 'cash' ? 'completed' : 'pending'
      })

      if (error) throw error

      toast('Payment request submitted!')
      setShowPaymentModal(false)
      setPaymentForm({ method: 'transfer', reference: '', notes: '', proof: null })
      fetchFeesAndHistory()

    } catch (error: any) {
      toast('Failed: ' + error.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800'
      case 'Overdue': return 'bg-red-100 text-red-800'
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isLoaded || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Fee Management</h1>

        {/* Outstanding Fees */}
<div className="mb-8">
  <h2 className="text-xl font-bold text-gray-900 mb-4">Outstanding Fees</h2>
  
  {fees
    .filter(f => f.status !== 'Paid')
    .filter(f => {
      const urlParams = new URLSearchParams(window.location.search)
      const studentParam = urlParams.get('student')
      return studentParam ? f.student_id === studentParam : true
    })
    .length === 0 ? (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
      <CheckCircle className="mx-auto text-green-600 mb-2" size={48}/>
      <p className="text-green-800 font-bold">
        {new URLSearchParams(window.location.search).get('student') 
          ? 'No outstanding fees for this student! 🎉' 
          : 'All fees paid! 🎉'}
      </p>
      <p className="text-green-600 text-sm">No outstanding balances</p>
    </div>
  ) : (
    <div className="grid gap-4">
      {fees
        .filter(f => f.status !== 'Paid')
        .filter(f => {
          const urlParams = new URLSearchParams(window.location.search)
          const studentParam = urlParams.get('student')
          return studentParam ? f.student_id === studentParam : true
        })
        .map(fee => (
          <div 
            key={fee.fee_id} 
            className="bg-white rounded-lg shadow p-6"
            data-student-id={fee.student_id}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-gray-900">{fee.fee_name}</h3>
                <p className="text-sm text-gray-600">{fee.full_name} • {fee.admission_number} • {fee.class_id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(fee.status)}`}>
                {fee.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Total Fee</p>
                <p className="font-bold text-gray-900">₦{fee.fee_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="font-bold text-green-600">₦{fee.amount_paid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Balance Due</p>
                <p className="font-bold text-red-600">₦{fee.balance_due.toLocaleString()}</p>
              </div>
            </div>
            
            {fee.due_date && fee.status === 'Overdue' && (
              <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
                <AlertCircle size={16}/>
                <span>Due date passed: {new Date(fee.due_date).toLocaleDateString()}</span>
              </div>
            )}
            
            <button
              onClick={() => { setSelectedFee(fee); setShowPaymentModal(true) }}
              className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <CreditCard size={16}/> Pay Now - ₦{fee.balance_due.toLocaleString()}
            </button>
          </div>
        ))}
    </div>
  )}
</div>

        {/* Payment History */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>
          
          {paymentHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
              No payment history yet
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-gray-900 font-bold">Fee</th>
                    <th className="text-gray-900 font-bold">Amount</th>
                    <th className="text-gray-900 font-bold">Method</th>
                    <th className="text-gray-900 font-bold">Status</th>
                    <th className="text-gray-900 font-bold">Date</th>
                    <th className="text-gray-900 font-bold">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map(payment => (
                    <tr key={payment.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 text-gray-900">{payment.fee_name}</td>
                      <td className="text-gray-900 font-bold">₦{payment.amount.toLocaleString()}</td>
                      <td className="text-gray-900 capitalize">{payment.payment_method}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="text-gray-900">{new Date(payment.created_at).toLocaleDateString()}</td>
                      <td>
                        {payment.status === 'completed' || payment.status === 'approved' ? (
                          <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            <FileText size={14}/> Receipt
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Payment Modal */}
{showPaymentModal && selectedFee && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
    <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto my-8">
      <div className="flex justify-between mb-4 sticky top-0 bg-white pb-2 border-b">
        <h2 className="text-xl font-bold text-gray-900">Pay Fee</h2>
        <button onClick={() => setShowPaymentModal(false)} className="text-gray-700 hover:text-gray-900">✕</button>
      </div>
      
      <div className="mb-4 p-4 bg-gray-50 rounded">
        <p className="font-bold text-gray-900">{selectedFee.fee_name}</p>
        <p className="text-sm text-gray-600">{selectedFee.full_name} • {selectedFee.class_id}</p>
        <p className="text-lg font-bold text-red-600 mt-2">Amount Due: ₦{selectedFee.balance_due.toLocaleString()}</p>
      </div>
      
      <form onSubmit={handlePaymentSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <select
            value={paymentForm.method}
            onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value as 'transfer' | 'cheque' | 'cash'})}
            className="w-full p-2 border rounded text-gray-900"
          >
            <option value="transfer">Bank Transfer</option>
            <option value="cash">Cash (at School)</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card Payment (Stripe)</option>
          </select>
        </div>
        
        {paymentForm.method === 'transfer' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm overflow-x-auto">
            <p className="font-bold text-blue-900 mb-2">Bank Details:</p>
            <p className="text-blue-800">Account: Mannaplus Group of Schools</p>
            <p className="text-blue-800">Bank: First Bank</p>
            <p className="text-blue-800">Account No: 1234567890</p>
            <p className="text-blue-800 mt-2">Use admission number as reference</p>
          </div>
        )}
        
        {(paymentForm.method === 'transfer' || paymentForm.method === 'cheque') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference/Transaction ID {paymentForm.method === 'cheque' && '(Cheque No)'}
            </label>
            <input
              type="text"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
              className="w-full p-2 border rounded text-gray-900"
              placeholder={paymentForm.method === 'cheque' ? 'Cheque number' : 'Transaction reference'}
              required
            />
          </div>
        )}
        
        {(paymentForm.method === 'transfer' || paymentForm.method === 'cheque') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Proof</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setPaymentForm({...paymentForm, proof: e.target.files?.[0] || null})}
              className="w-full p-2 border rounded text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">Screenshot of transfer or photo of cheque</p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
          <textarea
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
            className="w-full p-2 border rounded text-gray-900"
            rows={2}
            placeholder="Any additional information..."
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <CreditCard size={18}/> Submit Payment
        </button>
      </form>
      
      {paymentForm.method === 'cash' && (
        <p className="text-sm text-gray-600 mt-4 text-center">
          💡 For cash payments: Visit the school bursary with this reference. 
          Your payment will be confirmed instantly.
        </p>
      )}
    </div>
  </div>
)}
    </div>
  )
}