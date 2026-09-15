'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  student: { id: string; full_name: string; admission_number: string }
  balance: number
  onSuccess: () => void
}

export default function PaymentRequestModal({ isOpen, onClose, student, balance, onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Transfer')
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const numAmount = parseFloat(amount)
  const isValidAmount = !isNaN(numAmount) && numAmount > 0 && numAmount <= balance

  const errorMessage =
    amount === '' ? null :
    isNaN(numAmount) ? 'Enter a valid number' :
    numAmount <= 0 ? 'Amount must be greater than zero' :
    numAmount > balance ? `Cannot exceed balance (₦${balance.toLocaleString()})` :
    null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidAmount || balance === 0) return
    setSubmitting(true)
    try {
      const { count } = await supabase
        .from('payment_requests')
        .select('id', { count: 'exact', head: true })
      const nextNum = (count || 0) + 1
      const defaultRef = `REQ/${new Date().getFullYear()}/${String(nextNum).padStart(4, '0')}`

      const { error } = await supabase.from('payment_requests').insert([{
        student_id: student.id,
        amount: numAmount,
        payment_method: method,
        reference_number: reference.trim() || defaultRef,
        notes: description.trim() || null,
        status: 'pending',
      }])

      if (error) throw error

      toast.success('✅ Payment request submitted — admin will review.')
      setAmount(''); setMethod('Transfer'); setReference(''); setDescription('')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error('Failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const noBalance = balance === 0

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      {/* ✅ Card capped at 90% of screen height, laid out as a column */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">

        {/* ✅ Header: never scrolls */}
        <div className="flex justify-between items-center p-6 border-b shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Make Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* ✅ Middle: the ONLY part that scrolls */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Student</label>
              <div className="p-3 bg-gray-50 rounded border text-gray-900 font-medium">
                {student.full_name} <span className="text-gray-500">({student.admission_number})</span>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">Outstanding Balance</p>
              <p className="text-2xl font-bold text-blue-900">₦{balance.toLocaleString()}</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Amount (₦)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={balance}
                min={0}
                step="0.01"
                disabled={noBalance}
                className={`w-full p-3 border rounded text-gray-900 ${errorMessage ? 'border-red-400' : 'border-gray-300'}`}
                placeholder={`e.g. ${balance.toLocaleString()}`}
              />
              {errorMessage && <p className="text-red-600 text-xs mt-1 font-medium">{errorMessage}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                disabled={noBalance}
                className="w-full p-3 border border-gray-300 rounded text-gray-900"
              >
                <option>Transfer</option>
                <option>Cash</option>
                <option>Card</option>
                <option>Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Reference / Transaction ID <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={noBalance}
                className="w-full p-3 border border-gray-300 rounded text-gray-900"
                placeholder="Bank ref, cheque number..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={noBalance}
                className="w-full p-3 border border-gray-300 rounded text-gray-900"
                rows={2}
                placeholder="e.g. First term tuition"
              />
            </div>

            {noBalance && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm text-center font-medium">
                ✅ Your balance is zero — no outstanding fees to pay.
              </div>
            )}
          </div>

          {/* ✅ Buttons: pinned footer, ALWAYS visible on any screen size */}
          <div className="flex gap-3 p-6 pt-4 border-t bg-gray-50 shrink-0 rounded-b-2xl">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValidAmount || submitting || noBalance}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}