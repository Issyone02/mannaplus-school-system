'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, DollarSign, FileText, Download, Eye, Edit, Trash2, X, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface FeeStructure {
  id: string
  name: string
  class_id: string
  term: string
  session: string
  amount: number
  description?: string
  due_date?: string
  active: boolean
}

interface PaymentRecord {
  id: string
  student_id: string
  student_name: string
  admission_number: string
  amount_paid: number
  payment_date: string
  payment_method: string
  reference_number: string
  receipt_number: string
  paid_by: string
  notes?: string
  created_at?: string
}

interface Student {
  id: string
  full_name: string
  admission_number: string
  class_id: string
}

interface ClassItem {
  id: string
  class_name: string
  arm: string | null
  department: string | null
}

export default function FeeManagementPage() {
  const [activeTab, setActiveTab] = useState<'structures' | 'payments' | 'reports' | 'requests'>('structures')
  const [structureView, setStructureView] = useState<'class' | 'list'>('class')
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [paymentsTotal, setPaymentsTotal] = useState(0)
  const [totalCollected, setTotalCollected] = useState(0)
  const paymentsPageSize = 50
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([]) // ✅ NEW: Dynamic classes
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'structure' | 'payment' | 'view'>('structure')
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // ✅ Live search with a tiny debounce (smooth typing, no lag)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 250)
    return () => clearTimeout(t)
  }, [searchTerm])
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null)
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [viewingRequest, setViewingRequest] = useState<any>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  const termOptions = ['First Term', 'Second Term', 'Third Term']
  const sessionOptions = ['2023/2024', '2024/2025', '2025/2026', '2026/2027']
  const paymentMethodOptions = ['Cash', 'Transfer', 'Card', 'Cheque']

  const [structureForm, setStructureForm] = useState({ 
    name: '', 
    class_ids: [] as string[], // ✅ Changed from single class_id to array
    term: 'First Term', 
    session: '2024/2025', 
    amount: '', 
    description: '', 
    due_date: '', 
    active: true 
  })
  
  const [paymentForm, setPaymentForm] = useState({ 
    student_id: '', 
    amount_paid: '', 
    payment_date: new Date().toISOString().split('T')[0], 
    payment_method: 'Transfer', 
    reference_number: '', 
    receipt_number: '', 
    paid_by: '', 
    notes: '' 
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    await Promise.all([
      fetchFeeStructures(), 
      fetchStudents(), 
      fetchPaymentRequests(),
      fetchClasses() // ✅ Fetch classes
    ])
    const { data: collected } = await supabase.rpc('total_collected')
    setTotalCollected(Number(collected || 0))
    setLoading(false)
  }

  // ✅ Refetch payments when page or search changes
  useEffect(() => { setPaymentsPage(1) }, [debouncedSearch])
  useEffect(() => { fetchPayments(paymentsPage, debouncedSearch) }, [paymentsPage, debouncedSearch])

  // ✅ NEW: Fetch classes dynamically
  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, class_name, arm, department')
      .order('class_name')
    
    if (error) console.error('Failed to load classes', error)
    else setClasses(data || [])
  }

  const fetchFeeStructures = async () => {
    const { data, error } = await supabase.from('fee_structures').select('*').order('created_at', { ascending: false })
    if (error) toast.error('Failed to load fee structures')
    else setFeeStructures(data || [])
  }

  const fetchPayments = async (page: number = 1, search: string = '') => {
    const from = (page - 1) * paymentsPageSize
    const to = from + paymentsPageSize - 1
    let q = supabase
      .from('fee_payments')
      .select(`*, student:students(full_name, admission_number)`, { count: 'exact' })
      .order('payment_date', { ascending: false })
      .range(from, to)

    const s = search.trim()
    if (s) {
      const { data: matchStudents } = await supabase
        .from('students')
        .select('id')
        .or(`full_name.ilike.%${s}%,admission_number.ilike.%${s}%`)
      const ids = (matchStudents || []).map((x: any) => x.id)
      const orParts = [`receipt_number.ilike.%${s}%`, `paid_by.ilike.%${s}%`]
      if (ids.length > 0) orParts.push(`student_id.in.(${ids.join(',')})`)
      q = q.or(orParts.join(','))
    }

    const { data, error, count } = await q
    if (error) toast.error('Failed to load payments')
    else {
      setPayments((data || []).map((p: any) => ({ ...p, student_name: p.student?.full_name || 'Unknown', admission_number: p.student?.admission_number || 'N/A' })))
      setPaymentsTotal(count || 0)
    }
  }

  const fetchPaymentRequests = async () => {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(`
        *,
        student:students(full_name, admission_number, class_id),
        fee_structures(name, amount)
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching payment requests:', error)
      return
    }
    
    const enriched = (data || []).map((r: any) => ({
      ...r,
      student_name: r.student?.full_name || 'Unknown',
      admission_number: r.student?.admission_number || 'N/A',
      class_id: r.student?.class_id || 'N/A',
      fee_name: r.fee_structures?.name || 'Unknown',
      fee_amount: r.fee_structures?.amount || 0
    }))
    
    setPaymentRequests(enriched)
    setPendingRequestsCount(enriched.filter(r => r.status === 'pending').length)
  }

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('id, full_name, admission_number, class_id').order('full_name')
    setStudents(data || [])
  }

  // Helper to format class name nicely
  const formatClassName = (cls: ClassItem) => {
    return `${cls.class_name} ${cls.arm ? `(${cls.arm})` : ''} ${cls.department ? `- ${cls.department}` : ''}`
  }

  const handleAddStructure = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingItem) {
        // Editing: update single record
        await supabase.from('fee_structures').update({ 
          name: structureForm.name, 
          class_id: structureForm.class_ids[0], 
          term: structureForm.term, 
          session: structureForm.session, 
          amount: parseFloat(structureForm.amount), 
          description: structureForm.description || null, 
          due_date: structureForm.due_date || null, 
          active: structureForm.active 
        }).eq('id', editingItem.id)
        toast.success('Fee structure updated!')
      } else {
        // Adding: create multiple records (one per selected class)
        if (structureForm.class_ids.length === 0) {
          toast.error('Please select at least one class')
          return
        }

        const records = structureForm.class_ids.map(classId => ({ 
          name: structureForm.name, 
          class_id: classId, 
          term: structureForm.term, 
          session: structureForm.session, 
          amount: parseFloat(structureForm.amount), 
          description: structureForm.description || null, 
          due_date: structureForm.due_date || null, 
          active: structureForm.active 
        }))

        const { error } = await supabase.from('fee_structures').insert(records)
        if (error) throw error
        
        toast.success(`✅ Fee structure added to ${records.length} class(es)!`)
      }
      setShowModal(false)
      setStructureForm({ name: '', class_ids: [], term: 'First Term', session: '2024/2025', amount: '', description: '', due_date: '', active: true })
      setEditingItem(null)
      fetchFeeStructures()
    } catch (error: any) { 
      toast.error('Failed: ' + error.message) 
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const receiptNumber = `REC/${new Date().getFullYear()}/${String(payments.length + 1).padStart(4, '0')}`
      const { error } = await supabase.from('fee_payments').insert([{ 
        student_id: paymentForm.student_id, 
        amount_paid: parseFloat(paymentForm.amount_paid), 
        payment_date: paymentForm.payment_date, 
        payment_method: paymentForm.payment_method, 
        reference_number: paymentForm.reference_number || null, 
        receipt_number: receiptNumber, 
        paid_by: paymentForm.paid_by, 
        notes: paymentForm.notes || null 
      }])
      if (error) throw error
      toast.success(`Payment recorded! Receipt: ${receiptNumber}`)
      setShowModal(false)
      setPaymentForm({ student_id: '', amount_paid: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'Transfer', reference_number: '', receipt_number: '', paid_by: '', notes: '' })
      fetchPayments()
    } catch (error: any) { 
      toast.error('Failed: ' + error.message) 
    }
  }

  const handleDeleteStructure = async (id: string) => { 
    if (!confirm('Delete?')) return
    try { 
      await supabase.from('fee_structures').delete().eq('id', id)
      toast.success('Deleted!')
      fetchFeeStructures() 
    } catch (error: any) { 
      toast.error('Failed: ' + error.message) 
    } 
  }

  const handleDeletePayment = async (id: string) => { 
    if (!confirm('Delete?')) return
    try { 
      await supabase.from('fee_payments').delete().eq('id', id)
      toast.success('Deleted!')
      fetchPayments() 
    } catch (error: any) { 
      toast.error('Failed: ' + error.message) 
    } 
  }

  const handleApproveRequest = async (request: any) => {
    if (!confirm(`Approve payment of ₦${request.amount.toLocaleString()} for ${request.student_name}?`)) return
    
    try {
      const receiptNumber = `REC/${new Date().getFullYear()}/${String(payments.length + 1).padStart(4, '0')}`
      
      const { error: paymentError } = await supabase.from('fee_payments').insert([{
        student_id: request.student_id,
        fee_structure_id: request.fee_structure_id,
        amount_paid: request.amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: request.payment_method,
        reference_number: request.reference_number || receiptNumber,
        receipt_number: receiptNumber,
        paid_by: request.student_name,
        notes: adminNotes || request.notes || null
      }])
      
      if (paymentError) throw paymentError
      
      const { error: requestError } = await supabase
        .from('payment_requests')
        .update({ 
          status: 'approved',
          admin_notes: adminNotes || 'Approved by admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id)
      
      if (requestError) throw requestError
      
      toast.success(`Payment approved! Receipt: ${receiptNumber}`)
      setShowRequestModal(false)
      setAdminNotes('')
      fetchPaymentRequests()
      fetchPayments()
    } catch (error: any) {
      toast.error('Failed to approve: ' + error.message)
    }
  }

  const handleRejectRequest = async (request: any) => {
    const reason = prompt('Enter rejection reason (required):')
    if (!reason) return
    
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ 
          status: 'rejected',
          admin_notes: `Rejected: ${reason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id)
      
      if (error) throw error
      
      toast.success('Payment request rejected')
      setShowRequestModal(false)
      setAdminNotes('')
      fetchPaymentRequests()
    } catch (error: any) {
      toast.error('Failed to reject: ' + error.message)
    }
  }

  const exportToExcel = () => {
    const headers = ['Receipt', 'Student', 'Admission', 'Amount', 'Date', 'Method', 'PaidBy']
    const rows = payments.map(p => [p.receipt_number, p.student_name, p.admission_number, p.amount_paid, p.payment_date, p.payment_method, p.paid_by])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `fees_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Exported to CSV!')
  }

  const saveAsJPG = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default
      const element = document.getElementById('receipt-content')
      if (element) {
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
        const link = document.createElement('a')
        link.download = `receipt_${selectedReceipt?.receipt_number}.jpg`
        link.href = canvas.toDataURL('image/jpeg', 0.9)
        link.click()
        toast.success('Receipt saved as JPG!')
      }
    } catch (error: any) { toast.error('Failed: ' + error.message) }
  }

  const handlePrint = () => {
    const content = document.getElementById('receipt-content')
    if (!content) return
    
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      window.print()
      return
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${selectedReceipt?.receipt_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #000; background: #fff; }
          h3 { text-align: center; margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; margin: 12px 0; padding-bottom: 8px; border-bottom: 1px solid #ccc; }
          .label { color: #555; }
          .value { font-weight: bold; color: #000; }
          .amount { color: #22c55e; }
        </style>
      </head>
      <body>
        <h3>Mannaplus Group of Schools</h3>
        <p style="text-align:center;color:#666">Payment Receipt</p>
        <div class="row"><span class="label">Receipt:</span><span class="value">${selectedReceipt?.receipt_number}</span></div>
        <div class="row"><span class="label">Student:</span><span class="value">${selectedReceipt?.student_name}</span></div>
        <div class="row"><span class="label">Admission:</span><span class="value">${selectedReceipt?.admission_number}</span></div>
        <div class="row"><span class="label">Amount:</span><span class="value amount">₦${selectedReceipt?.amount_paid.toLocaleString()}</span></div>
        <div class="row"><span class="label">Date & Time:</span><span class="value">${new Date(selectedReceipt?.created_at || selectedReceipt?.payment_date || '').toLocaleString()}</span></div>
        <div class="row"><span class="label">Method:</span><span class="value">${selectedReceipt?.payment_method}</span></div>
        <div class="row"><span class="label">Paid By:</span><span class="value">${selectedReceipt?.paid_by}</span></div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }


  const totalStructures = feeStructures.reduce((s, f) => s + f.amount, 0)
  // ✅ Smart search: matches fee name, class name, term, session, or amount
  const query = debouncedSearch.trim().toLowerCase()
  const filteredStructures = feeStructures.filter(f => {
    if (!query) return true
    const cls = classes.find(c => c.id === f.class_id)
    const className = cls ? formatClassName(cls).toLowerCase() : ''
    return (
      f.name.toLowerCase().includes(query) ||
      className.includes(query) ||
      (f.term || '').toLowerCase().includes(query) ||
      (f.session || '').toLowerCase().includes(query) ||
      String(f.amount).includes(query) ||
      f.amount.toLocaleString().includes(query)
    )
  })

  // ✅ Group fees into per-class cards (tidy view)
  const classCards = classes
    .map(cls => {
      const items = filteredStructures.filter(f => f.class_id === cls.id)
      return {
        classId: cls.id,
        className: formatClassName(cls),
        items,
        total: items.reduce((s, f) => s + f.amount, 0),
      }
    })
    .filter(c => c.items.length > 0)

  if (loading) return <div className="p-8 text-gray-900 font-bold">Loading...</div>

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 mb-6 text-center md:text-left">
        <div><h1 className="text-3xl font-bold text-gray-900">Fee Management</h1><p className="text-gray-700">Manage fees and payments</p></div>
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={() => { setModalType('structure'); setEditingItem(null); setShowModal(true) }} className="bg-blue-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-blue-700"><Plus size={18}/>Add Structure</button>
          <button onClick={() => { setModalType('payment'); setEditingItem(null); setShowModal(true) }} className="bg-green-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-green-700"><DollarSign size={18}/>Record Payment</button>
        </div>
      </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6">
        <div className="center-mobile bg-white rounded-xl shadow-md p-4 md:p-6 border border-gray-200">
          <div className="flex items-center justify-center mb-3 md:mb-4">
            <div className="p-2 md:p-3 rounded-lg bg-green-500"><TrendingUp className="text-white" size={24} /></div>
          </div>
          <h3 className="text-lg md:text-2xl font-bold text-green-600 break-words">₦{totalCollected.toLocaleString()}</h3>
          <p className="text-gray-600 text-xs md:text-sm font-medium text-center">Collected</p>
        </div>
        <div className="center-mobile bg-white rounded-xl shadow-md p-4 md:p-6 border border-gray-200">
          <div className="flex items-center justify-center mb-3 md:mb-4">
            <div className="p-2 md:p-3 rounded-lg bg-blue-500"><FileText className="text-white" size={24} /></div>
          </div>
          <h3 className="text-lg md:text-2xl font-bold text-blue-600 break-words">₦{totalStructures.toLocaleString()}</h3>
          <p className="text-gray-600 text-xs md:text-sm font-medium text-center">Structures</p>
        </div>
        <div className="center-mobile bg-white rounded-xl shadow-md p-4 md:p-6 border border-gray-200">
          <div className="flex items-center justify-center mb-3 md:mb-4">
            <div className="p-2 md:p-3 rounded-lg bg-orange-500"><TrendingDown className="text-white" size={24} /></div>
          </div>
          <h3 className="text-lg md:text-2xl font-bold text-orange-600 break-words">₦{Math.max(0, totalStructures - totalCollected).toLocaleString()}</h3>
          <p className="text-gray-600 text-xs md:text-sm font-medium text-center">Pending</p>
        </div>
      </div>

      <div className="bg-white rounded shadow">
        <div className="flex border-b overflow-x-auto">
          <button onClick={() => setActiveTab('structures')} className={`px-4 py-3 font-bold text-gray-900 whitespace-nowrap ${activeTab === 'structures' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-700'}`}>Structures</button>
          <button onClick={() => setActiveTab('payments')} className={`px-4 py-3 font-bold text-gray-900 whitespace-nowrap ${activeTab === 'payments' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-700'}`}>Payments</button>
          <button onClick={() => setActiveTab('requests')} className={`px-4 py-3 font-bold text-gray-900 whitespace-nowrap ${activeTab === 'requests' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-700'}`}>
            Payment Requests
            {pendingRequestsCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingRequestsCount}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('reports')} className={`px-4 py-3 font-bold text-gray-900 whitespace-nowrap ${activeTab === 'reports' ? 'text-blue-600 border-b-2 border-blue-600' : 'hover:text-gray-700'}`}>Reports</button>
        </div>

        <div className="p-4">
          <input type="text" placeholder="Search fee, class, term, session, amount, student, receipt..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 border rounded mb-4 text-gray-900 placeholder-gray-500" />
          
                    {activeTab === 'structures' && (
            <div>
              {/* ✅ View toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setStructureView('class')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${structureView === 'class' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  By Class (Tidy)
                </button>
                <button
                  onClick={() => setStructureView('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${structureView === 'list' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Flat List
                </button>
              </div>

              {structureView === 'class' ? (
                classCards.length === 0 ? (
                  <div className="p-12 text-center text-gray-600">
                    <DollarSign size={48} className="mx-auto text-gray-300 mb-2" />
                    <p className="font-bold">No fee structures found</p>
                    <p className="text-sm">Use "Add Structure" to create a fee for one or many classes at once.</p>
                  </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                    {classCards.map(card => (
                                            <div key={card.classId} className="bg-white border border-gray-200 rounded-lg shadow p-3 md:p-4">
                                                <div className="flex justify-between items-center gap-2 mb-3 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-sm md:text-base break-words">{card.className}</h3>
                          <span className="text-xs bg-green-100 text-green-800 font-bold px-2 py-1 rounded-full whitespace-nowrap">{card.items.length} fee(s)</span>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {card.items.map(f => (
                              <div key={f.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 md:gap-0 bg-gray-50 border border-gray-100 rounded p-2">
                              <div>
                                <p className="text-xs md:text-sm font-medium text-gray-900 break-words">{f.name}</p>
                                <p className="text-xs text-gray-500">{f.term} • {f.session}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs md:text-sm font-bold text-gray-900">₦{f.amount.toLocaleString()}</span>
                                <button onClick={() => { setEditingItem(f); setStructureForm({ name: f.name, class_ids: [f.class_id], term: f.term, session: f.session, amount: f.amount.toString(), description: f.description || '', due_date: f.due_date || '', active: f.active }); setModalType('structure'); setShowModal(true) }} className="text-blue-600 hover:text-blue-800">
                                  <Edit size={14}/>
                                </button>
                                <button onClick={() => handleDeleteStructure(f.id)} className="text-red-600 hover:text-red-800">
                                  <Trash2 size={14}/>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center gap-2">
                          <span className="text-xs md:text-sm font-bold text-gray-700">Total Listed</span>
                          <span className="text-sm md:text-lg font-bold text-green-700 break-words">₦{card.total.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr>
                          <th className="p-2 text-left text-gray-900 font-bold">Name</th>
                          <th className="text-gray-900 font-bold">Class</th>
                          <th className="text-gray-900 font-bold">Term</th>
                          <th className="text-gray-900 font-bold">Session</th>
                          <th className="text-gray-900 font-bold">Amount</th>
                          <th className="text-gray-900 font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStructures.map(f => {
                          const cls = classes.find(c => c.id === f.class_id)
                          const displayClassName = cls ? formatClassName(cls) : f.class_id
                          return (
                            <tr key={f.id} className="border-t hover:bg-gray-50">
                              <td className="p-2 text-gray-900 font-medium">{f.name}</td>
                              <td className="text-gray-900">{displayClassName}</td>
                              <td className="text-gray-900">{f.term}</td>
                              <td className="text-gray-900">{f.session}</td>
                              <td className="text-gray-900 font-bold">₦{f.amount.toLocaleString()}</td>
                              <td>
                                <button onClick={() => { setEditingItem(f); setStructureForm({ name: f.name, class_ids: [f.class_id], term: f.term, session: f.session, amount: f.amount.toString(), description: f.description || '', due_date: f.due_date || '', active: f.active }); setModalType('structure'); setShowModal(true) }} className="text-blue-600 hover:text-blue-800 mr-2">
                                  <Edit size={16}/>
                                </button>
                                <button onClick={() => handleDeleteStructure(f.id)} className="text-red-600 hover:text-red-800">
                                  <Trash2 size={16}/>
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="md:hidden mt-2 text-xs text-gray-500 text-center">← Swipe the table sideways to see Actions →</p>
                </>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-gray-900 font-bold">Receipt</th>
                      <th className="text-gray-900 font-bold">Student</th>
                      <th className="text-gray-900 font-bold">Amount</th>
                      <th className="text-gray-900 font-bold">Date & Time</th>
                      <th className="text-gray-900 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-t hover:bg-gray-50">
                        <td className="p-2 text-gray-900 font-medium">{p.receipt_number}</td>
                        <td className="text-gray-900 font-medium">{p.student_name}</td>
                        <td className="text-gray-900 font-bold">₦{p.amount_paid.toLocaleString()}</td>
                        <td className="text-gray-900">{new Date(p.created_at || p.payment_date).toLocaleDateString()}</td>
                        <td>
                          <button onClick={() => { setSelectedReceipt(p); setModalType('view'); setShowModal(true) }} className="text-purple-600 hover:text-purple-800" title="View receipt">
                            <Eye size={16}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="md:hidden mt-2 text-xs text-gray-500 text-center">← Swipe the table sideways to see Date & Actions →</p>
              {/* ✅ Payments pagination */}
              <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-bold">{payments.length === 0 ? 0 : (paymentsPage - 1) * paymentsPageSize + 1}</span>–<span className="font-bold">{(paymentsPage - 1) * paymentsPageSize + payments.length}</span> of <span className="font-bold">{paymentsTotal}</span> payments
                </p>
                <div className="flex gap-2 items-center">
                  <button onClick={() => setPaymentsPage(p => Math.max(1, p - 1))} disabled={paymentsPage === 1} className="px-3 py-1 border rounded font-bold text-gray-700 disabled:opacity-50">Previous</button>
                  <span className="px-3 py-1 text-sm font-bold text-gray-700">Page {paymentsPage} of {Math.max(1, Math.ceil(paymentsTotal / paymentsPageSize))}</span>
                  <button onClick={() => setPaymentsPage(p => p + 1)} disabled={paymentsPage * paymentsPageSize >= paymentsTotal} className="px-3 py-1 border rounded font-bold text-gray-700 disabled:opacity-50">Next</button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'requests' && (
            <div>
              <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 font-bold">
                <Download size={16}/>Export CSV
              </button>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
                <div className="center-mobile bg-yellow-50 rounded-xl shadow-md p-4 md:p-6 border-2 border-yellow-200">
                  <h3 className="text-xl md:text-2xl font-bold text-yellow-900">{paymentRequests.filter(r => r.status === 'pending').length}</h3>
                  <p className="text-yellow-700 text-xs md:text-sm font-medium text-center">Pending</p>
                </div>
                <div className="center-mobile bg-green-50 rounded-xl shadow-md p-4 md:p-6 border-2 border-green-200">
                  <h3 className="text-xl md:text-2xl font-bold text-green-900">{paymentRequests.filter(r => r.status === 'approved').length}</h3>
                  <p className="text-green-700 text-xs md:text-sm font-medium text-center">Approved</p>
                </div>
                <div className="center-mobile bg-red-50 rounded-xl shadow-md p-4 md:p-6 border-2 border-red-200">
                  <h3 className="text-xl md:text-2xl font-bold text-red-900">{paymentRequests.filter(r => r.status === 'rejected').length}</h3>
                  <p className="text-red-700 text-xs md:text-sm font-medium text-center">Rejected</p>
                </div>
                <div className="center-mobile bg-blue-50 rounded-xl shadow-md p-4 md:p-6 border-2 border-blue-200">
                  <h3 className="text-lg md:text-2xl font-bold text-blue-900 break-words">₦{paymentRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</h3>
                  <p className="text-blue-700 text-xs md:text-sm font-medium text-center">Total Amount</p>
                </div>
              </div>

              <div className="bg-white rounded shadow overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-gray-900 font-bold">Student</th>
                      <th className="text-gray-900 font-bold">Fee</th>
                      <th className="text-gray-900 font-bold">Amount</th>
                      <th className="text-gray-900 font-bold">Method</th>
                      <th className="text-gray-900 font-bold">Reference</th>
                      <th className="text-gray-900 font-bold">Status</th>
                      <th className="text-gray-900 font-bold">Date</th>
                      <th className="text-gray-900 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-600">
                          <FileText size={48} className="mx-auto text-gray-300 mb-2"/>
                          <p className="font-bold">No payment requests yet</p>
                        </td>
                      </tr>
                    ) : (
                      paymentRequests.map(request => (
                        <tr key={request.id} className="border-t hover:bg-gray-50">
                          <td className="p-3">
                            <p className="font-bold text-gray-900">{request.student_name}</p>
                            <p className="text-sm text-gray-600">{request.admission_number}</p>
                          </td>
                          <td className="text-gray-900">{request.fee_name}</td>
                          <td className="font-bold text-gray-900">₦{request.amount.toLocaleString()}</td>
                          <td className="text-gray-900 capitalize">{request.payment_method}</td>
                          <td className="text-gray-900 text-sm">{request.reference_number || '-'}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              request.status === 'approved' ? 'bg-green-100 text-green-800' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="text-gray-900 text-sm">{new Date(request.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setViewingRequest(request); setShowRequestModal(true) }}
                                className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                              >
                                {request.status === 'pending' ? 'Review' : 'View'}
                              </button>
                              {request.proof_image_url && (
                                <a href={request.proof_image_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 text-sm">Proof</a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="md:hidden mt-2 text-xs text-gray-500 text-center">← Swipe the table sideways to see Status, Date & Actions →</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Fee Structure Modal */}
      {showModal && modalType === 'structure' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Edit Fee Structure' : 'Add Fee Structure'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-700 hover:text-gray-900"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddStructure} className="space-y-3">
              <input placeholder="Name (e.g., Tuition Fee, Transportation, Books)" value={structureForm.name} onChange={(e) => setStructureForm({...structureForm, name: e.target.value})} required className="w-full p-2 border rounded text-gray-900"/>
              
              {/* ✅ MULTI-SELECT: Choose multiple classes */}
              {editingItem ? (
                <select value={structureForm.class_ids[0] || ''} onChange={(e) => setStructureForm({...structureForm, class_ids: [e.target.value]})} required className="w-full p-2 border rounded text-gray-900">
                  <option value="">Select Class...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{formatClassName(c)}</option>
                  ))}
                </select>
              ) : (
                <div className="border rounded p-3 bg-gray-50">
                  <label className="block text-sm font-bold text-gray-900 mb-2">Apply to Classes:</label>
                  
                  {/* Quick-select buttons */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <button type="button" onClick={() => setStructureForm({...structureForm, class_ids: classes.map(c => c.id)})} className="px-3 py-1 bg-blue-600 text-white text-xs rounded font-bold hover:bg-blue-700">All Classes</button>
                    <button type="button" onClick={() => setStructureForm({...structureForm, class_ids: classes.filter(c => c.class_name.includes('Primary')).map(c => c.id)})} className="px-3 py-1 bg-green-600 text-white text-xs rounded font-bold hover:bg-green-700">All Primary</button>
                    <button type="button" onClick={() => setStructureForm({...structureForm, class_ids: classes.filter(c => c.class_name.includes('JSS') || c.class_name.includes('SS')).map(c => c.id)})} className="px-3 py-1 bg-purple-600 text-white text-xs rounded font-bold hover:bg-purple-700">All Secondary</button>
                    <button type="button" onClick={() => setStructureForm({...structureForm, class_ids: []})} className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded font-bold hover:bg-gray-400">Clear</button>
                  </div>
                  
                  {/* Individual checkboxes */}
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {classes.map(c => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded">
                        <input 
                          type="checkbox" 
                          checked={structureForm.class_ids.includes(c.id)} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStructureForm({...structureForm, class_ids: [...structureForm.class_ids, c.id]})
                            } else {
                              setStructureForm({...structureForm, class_ids: structureForm.class_ids.filter(id => id !== c.id)})
                            }
                          }} 
                          className="w-4 h-4" 
                        />
                        <span className="text-sm text-gray-900">{formatClassName(c)}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2 font-medium">{structureForm.class_ids.length} class(es) selected</p>
                </div>
              )}
              
              <select value={structureForm.term} onChange={(e) => setStructureForm({...structureForm, term: e.target.value})} className="w-full p-2 border rounded text-gray-900">
                {termOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={structureForm.session} onChange={(e) => setStructureForm({...structureForm, session: e.target.value})} className="w-full p-2 border rounded text-gray-900">
                {sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="number" placeholder="Amount" value={structureForm.amount} onChange={(e) => setStructureForm({...structureForm, amount: e.target.value})} required className="w-full p-2 border rounded text-gray-900"/>
              <input type="date" value={structureForm.due_date} onChange={(e) => setStructureForm({...structureForm, due_date: e.target.value})} className="w-full p-2 border rounded text-gray-900"/>
              <textarea placeholder="Description" value={structureForm.description} onChange={(e) => setStructureForm({...structureForm, description: e.target.value})} className="w-full p-2 border rounded text-gray-900" rows={2}/>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={structureForm.active} onChange={(e) => setStructureForm({...structureForm, active: e.target.checked})} className="w-4 h-4"/>
                <label htmlFor="active" className="text-gray-900 font-medium">Active</label>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">{editingItem ? 'Update' : 'Save'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showModal && modalType === 'payment' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-700 hover:text-gray-900"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddPayment} className="space-y-3">
              <select value={paymentForm.student_id} onChange={(e) => setPaymentForm({...paymentForm, student_id: e.target.value})} required className="w-full p-2 border rounded text-gray-900">
                <option value="">Select Student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}
              </select>
              <input type="number" placeholder="Amount" value={paymentForm.amount_paid} onChange={(e) => setPaymentForm({...paymentForm, amount_paid: e.target.value})} required className="w-full p-2 border rounded text-gray-900"/>
              <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})} className="w-full p-2 border rounded text-gray-900">
                {paymentMethodOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input placeholder="Paid By" value={paymentForm.paid_by} onChange={(e) => setPaymentForm({...paymentForm, paid_by: e.target.value})} required className="w-full p-2 border rounded text-gray-900"/>
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Save</button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Request Review Modal */}
      {showRequestModal && viewingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {viewingRequest.status === 'pending' ? 'Review Payment Request' : 'Payment Details'}
              </h2>
              <button onClick={() => { setShowRequestModal(false); setViewingRequest(null); setAdminNotes('') }} className="text-gray-700 hover:text-gray-900">
                <X size={24}/>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Student</p>
                  <p className="font-bold text-gray-900">{viewingRequest.student_name}</p>
                  <p className="text-sm text-gray-600">{viewingRequest.admission_number}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Fee</p>
                  <p className="font-bold text-gray-900">{viewingRequest.fee_name}</p>
                  <p className="text-sm text-gray-600">₦{viewingRequest.fee_amount.toLocaleString()}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-bold text-blue-900 mb-3">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-sm">
                  <div>
                    <span className="text-blue-700">Amount:</span>
                    <span className="font-bold text-blue-900 ml-2">₦{viewingRequest.amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Method:</span>
                    <span className="font-bold text-blue-900 ml-2 capitalize">{viewingRequest.payment_method}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Reference:</span>
                    <span className="font-bold text-blue-900 ml-2">{viewingRequest.reference_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Date:</span>
                    <span className="font-bold text-blue-900 ml-2">{new Date(viewingRequest.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {viewingRequest.proof_image_url && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Payment Proof</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <img src={viewingRequest.proof_image_url} alt="Payment proof" className="w-full h-auto max-h-96 object-contain bg-gray-100" />
                  </div>
                  <a href={viewingRequest.proof_image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">Open in new tab →</a>
                </div>
              )}

              {viewingRequest.notes && (
                <div className="p-4 bg-gray-50 rounded">
                  <h3 className="font-bold text-gray-900 mb-2">Parent Notes</h3>
                  <p className="text-gray-700">{viewingRequest.notes}</p>
                </div>
              )}

              {viewingRequest.admin_notes && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <h3 className="font-bold text-yellow-900 mb-2">Admin Notes</h3>
                  <p className="text-yellow-800">{viewingRequest.admin_notes}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-bold">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  viewingRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  viewingRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {viewingRequest.status}
                </span>
              </div>

              {viewingRequest.status === 'pending' && (
                <div className="border-t pt-4">
                  <h3 className="font-bold text-gray-900 mb-3">Admin Actions</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes (Optional)</label>
                    <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="w-full p-2 border rounded text-gray-900" rows={2} placeholder="Add notes about this payment..." />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleApproveRequest(viewingRequest)} className="flex-1 bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                      <CheckCircle size={18}/> Approve Payment
                    </button>
                    <button onClick={() => handleRejectRequest(viewingRequest)} className="flex-1 bg-red-600 text-white py-3 rounded font-bold hover:bg-red-700 flex items-center justify-center gap-2">
                      <X size={18}/> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {showModal && modalType === 'view' && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" id="receipt-modal">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b flex justify-between items-center no-print">
              <h2 className="text-lg font-bold text-gray-900">Receipt</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-700 hover:text-gray-900"><X size={20}/></button>
            </div>
            <div className="p-4" id="receipt-content" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold" style={{ color: '#000000' }}>Mannaplus Group of Schools</h3>
                <p style={{ color: '#333333' }}>Payment Receipt</p>
              </div>
              <div className="space-y-2 text-sm">
                <div style={{ color: '#000000' }}><strong style={{ color: '#555555' }}>Receipt:</strong> {selectedReceipt.receipt_number}</div>
                <div style={{ color: '#000000' }}><strong style={{ color: '#555555' }}>Student:</strong> {selectedReceipt.student_name}</div>
                <div style={{ color: '#000000' }}><strong style={{ color: '#555555' }}>Admission:</strong> {selectedReceipt.admission_number}</div>
                <div style={{ color: '#000000' }}><strong style={{ color: '#555555' }}>Amount:</strong> <span style={{ color: '#22c55e' }}>₦{selectedReceipt.amount_paid.toLocaleString()}</span></div>
                <div style={{ color: '#000000' }}><strong style={{ color: '#555555' }}>Date & Time:</strong> {new Date(selectedReceipt.created_at || selectedReceipt.payment_date).toLocaleString()}</div>
                <div style={{ color: '#000000' }}><strong style={{ color: '#555555' }}>Method:</strong> {selectedReceipt.payment_method}</div>
                <div style={{ color: '#000000' }}><strong style={{ color: '#555555' }}>Paid By:</strong> {selectedReceipt.paid_by}</div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 no-print">
              <div className="flex justify-center gap-2 flex-wrap">
                <button onClick={handlePrint} className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold">Print</button>
                <button onClick={handlePrint} className="bg-purple-600 text-white px-3 py-2 rounded text-sm font-bold">Save PDF</button>
                <button onClick={saveAsJPG} className="bg-green-600 text-white px-3 py-2 rounded text-sm font-bold">Save JPG</button>
                <button onClick={() => setShowModal(false)} className="px-3 py-2 border rounded text-sm font-bold text-gray-900">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}