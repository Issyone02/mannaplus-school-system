'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SignatureUpload from '@/components/SignatureUpload'
import { ArrowLeft } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function TeacherSignaturePage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [teacher, setTeacher] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!isLoaded || !user) return
      const email = user.primaryEmailAddress?.emailAddress
      const { data } = await supabase.from('teachers').select('*').eq('email', email).single()
      setTeacher(data || null)
      setLoading(false)
    }
    fetchTeacher()
  }, [isLoaded, user])

  const saveSignature = async (url: string) => {
    if (!teacher) return
    const { error } = await supabase.from('teachers').update({ signature_url: url }).eq('id', teacher.id)
    if (error) toast.error('Failed to save signature: ' + error.message)
    else toast.success('Signature saved! It will now appear on your students\' report cards.')
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Signature</h1>
          <p className="text-gray-600">Upload your signature once — it will be automatically affixed on report cards for your form class.</p>
        </div>

        {!teacher ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-800">
            No teacher profile found for this account. Please contact the administrator.
          </div>
        ) : (
          <SignatureUpload
            currentUrl={teacher.signature_url}
            label="My Signature (Class Teacher)"
            storagePath={`signatures/teacher_${teacher.id}`}
            onSaved={saveSignature}
          />
        )}
      </main>
    </div>
  )
}