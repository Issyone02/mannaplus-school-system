'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignInButton, useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { User, LogIn, Mail, Lock } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function TeacherLoginPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [checking, setChecking] = useState(false)

  // Check if user is a teacher when they sign in
  useState(() => {
    if (isLoaded && user) {
      checkTeacherAccess()
    }
  })

  const checkTeacherAccess = async () => {
    setChecking(true)
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) return

      // Check if this email exists in teachers table
      const { data, error } = await supabase
        .from('teachers')
        .select('id, full_name, email')
        .eq('email', email)
        .single()

      if (data) {
        // Store teacher info
        localStorage.setItem('teacher', JSON.stringify(data))
        toast.success('Welcome, ' + data.full_name)
        router.push('/teacher/dashboard')
      } else {
        toast.error('Teacher account not found. Contact admin.')
        // Sign out if not a teacher
        // router.push('/teacher/login')
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setChecking(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 font-bold">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      
      {!user ? (
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={32}/>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Teacher Portal</h1>
            <p className="text-gray-600">Mannaplus Group of Schools</p>
          </div>

          <SignInButton mode="modal" forceRedirectUrl="/teacher/dashboard">
            <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <LogIn size={18}/> Sign In with Clerk
            </button>
          </SignInButton>
          
          <div className="mt-6 pt-6 border-t text-center text-sm text-gray-600">
            <p className="font-bold mb-2">First time?</p>
            <p>Contact the school admin to create your teacher account</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <User size={48} className="mx-auto text-blue-600 mb-4"/>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome!</h2>
          <p className="text-gray-600 mb-4">{user.emailAddresses[0]?.emailAddress}</p>
          {checking ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Checking access...</p>
            </div>
          ) : (
            <p className="text-gray-600">Redirecting to dashboard...</p>
          )}
        </div>
      )}
    </div>
  )
}