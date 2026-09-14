'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MailOpen, Trash2, RefreshCw, Phone, Tag } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEnquiries = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('contact_enquiries').select('*').order('created_at', { ascending: false })
    if (error) toast.error('Failed to load enquiries')
    else setEnquiries(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchEnquiries() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this enquiry?')) return
    const { error } = await supabase.from('contact_enquiries').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Enquiry deleted'); fetchEnquiries() }
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"><MailOpen size={28} /> Enquiries Inbox</h1>
          <p className="text-gray-700">Messages sent from the public Contact page</p>
        </div>
        <button onClick={fetchEnquiries} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-600 font-bold">Loading enquiries...</div>
      ) : enquiries.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-600">
          <MailOpen size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-bold">No enquiries yet</p>
          <p className="text-sm">Messages from the website contact form will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {enquiries.map(e => (
            <div key={e.id} className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{e.full_name}</h3>
                  <p className="text-sm text-gray-600">{e.email}</p>
                  {e.phone && <p className="text-sm text-gray-600 flex items-center gap-1 mt-1"><Phone size={12} /> {e.phone}</p>}
                </div>
                <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-800" title="Delete"><Trash2 size={16} /></button>
              </div>
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full mb-3">
                <Tag size={10} className="inline mr-1" />{e.enquiry_type || 'General'}
              </span>
              <p className="text-gray-700 bg-gray-50 rounded-lg p-4 border border-gray-100 whitespace-pre-wrap">{e.message}</p>
              <p className="text-xs text-gray-400 mt-3">{new Date(e.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}