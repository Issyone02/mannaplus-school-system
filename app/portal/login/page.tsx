'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, SignInButton, SignOutButton } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import toast, { Toaster } from 'react-hot-toast'
import { User, LogOut } from 'lucide-react'

export default function ParentLoginPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [checking, setChecking] = useState(false)

  // Check parent access when user loads
  useEffect(() => {
    if (isLoaded && user) {
      checkParentAccess()
    }
  }, [user, isLoaded])

  const checkParentAccess = async () => {
    setChecking(true)
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) return

      // Check if this email has a parent record
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('email', email)
        .single()

      if (data) {
        localStorage.setItem('parent', JSON.stringify(data))
        router.push('/portal/dashboard')
      } else {
        toast('Parent account not found. Contact school admin.')
      }
    } catch (error: any) {
      toast('Error: ' + error.message)
    } finally {
      setChecking(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 font-bold">Please Wait...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      
      {!user ? (
        // NOT logged in - show sign in button
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold">MPLS</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Mannaplus Group of Schools</h1>
            <p className="text-gray-600">Parent Portal Login</p>
          </div>

          <SignInButton mode="modal" forceRedirectUrl="/portal/dashboard">
            <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
              <User size={18}/> Sign In with Clerk
            </button>
          </SignInButton>
          
          <div className="mt-6 pt-6 border-t text-center text-sm text-gray-600">
            <p className="font-bold mb-2">First time?</p>
            <p>Sign up above, then contact admin to link your account to your child</p>
          </div>
        </div>
      ) : (
        // Logged in - checking access
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <User size={48} className="mx-auto text-green-600 mb-4"/>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome, {user.firstName}!</h2>
          <p className="text-gray-600 mb-4">{user.emailAddresses[0]?.emailAddress}</p>
          
          {checking ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Checking access, Please Wait...</p>
            </div>
          ) : (
            <SignOutButton>
              <button className="flex items-center justify-center gap-2 mx-auto bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                <LogOut size={16}/> Sign Out
              </button>
            </SignOutButton>
          )}
        </div>
      )}
    </div>
  )
}