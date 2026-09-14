'use client'

import { supabase } from '@/lib/supabase'
import SignatureUpload from './SignatureUpload'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TeacherSignatureModal({ teacher, onClose }: { teacher: any; onClose: () => void }) {
  const save = async (url: string) => {
    const { error } = await supabase.from('teachers').update({ signature_url: url }).eq('id', teacher.id)
    if (error) toast.error('Failed: ' + error.message)
    else toast.success(`Signature saved for ${teacher.full_name || teacher.email}!`)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Upload Signature — {teacher.full_name || teacher.email}
        </h3>
        <SignatureUpload
          currentUrl={teacher.signature_url}
          label="Teacher Signature"
          storagePath={`signatures/teacher_${teacher.id}`}
          onSaved={save}
        />
      </div>
    </div>
  )
}