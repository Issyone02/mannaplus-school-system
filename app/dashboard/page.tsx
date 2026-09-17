'use client'

import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { fetchUserRowByClerkId } from '@/lib/fetchUserRow'

type UserRole = 'admin' | 'teacher' | 'parent' | 'student' | null

// ✅ ADMIN EMAILS - Add your admin emails here
const ADMIN_EMAILS = [
  'olalereisaiah68@gmail.com',
  // Add more admin emails as needed
]

export default function DashboardPage() {
  const { isSignedIn, user, isLoaded } = useUser()
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRole = async () => {
      if (!isLoaded || !user) {
        setLoading(false)
        return
      }

      // ✅ Check if user email is in admin list
      const userEmail = user.emailAddresses[0]?.emailAddress
      const isAdminEmail = ADMIN_EMAILS.includes(userEmail)

      const { data } = await fetchUserRowByClerkId(user.id, '*', userEmail)

      // ✅ Force admin role if email matches
      const finalRole = (isAdminEmail ? 'admin' : (data?.role || null)) as UserRole
      
      setRole(finalRole)
      setLoading(false)
    }

    fetchRole()
  }, [isLoaded, user])

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!isSignedIn) {
    redirect('/sign-in')
  }

  const portalAccess: Record<Exclude<UserRole, null>, string[]> = {
    admin: ['admin', 'teacher', 'parent', 'student'],
    teacher: ['teacher'],
    parent: ['parent'],
    student: ['student'],
  }

  const allowedPortals = role ? (portalAccess[role] || []) : []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {user?.firstName || 'User'}
              </h1>
              <p className="text-gray-600">{user?.emailAddresses[0]?.emailAddress}</p>
              <p className="text-sm text-gray-500 mt-1">
                Role: <span className="font-bold text-green-600 capitalize">{role}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Portal</h2>
          <p className="text-gray-600 mb-6">Access your personalized dashboard:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* ✅ ADMIN: Show ONLY admin card */}
            {role === 'admin' && (
              <Link
                href="/admin"
                className="block bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-xl hover:from-green-600 hover:to-green-800 transition-all shadow-lg hover:shadow-xl"
              >
                <div className="text-4xl mb-3">🏢</div>
                <h3 className="text-xl font-bold mb-2">Admin Portal</h3>
                <p className="text-green-100 text-sm">Manage students, staff, fees, and school operations</p>
              </Link>
            )}

            {/* ✅ TEACHER: Show only teacher card */}
            {role === 'teacher' && (
              <Link
                href="/teacher/dashboard"
                className="block bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-xl hover:from-blue-600 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
              >
                <div className="text-4xl mb-3">👨‍🏫</div>
                <h3 className="text-xl font-bold mb-2">Teacher Portal</h3>
                <p className="text-blue-100 text-sm">Enter results, mark attendance, view timetable</p>
              </Link>
            )}

            {/* ✅ PARENT: Show only parent card */}
            {role === 'parent' && (
              <Link
                href="/parent"
                className="block bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-xl hover:from-purple-600 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl"
              >
                <div className="text-4xl mb-3">👨‍👩‍👦</div>
                <h3 className="text-xl font-bold mb-2">Parent Portal</h3>
                <p className="text-purple-100 text-sm">Monitor your child's results, attendance, and fees</p>
              </Link>
            )}

            {/* ✅ STUDENT: Show only student card */}
            {role === 'student' && (
              <Link
                href="/student"
                className="block bg-gradient-to-br from-orange-500 to-orange-700 text-white p-6 rounded-xl hover:from-orange-600 hover:to-orange-800 transition-all shadow-lg hover:shadow-xl"
              >
                <div className="text-4xl mb-3">🎓</div>
                <h3 className="text-xl font-bold mb-2">Student Portal</h3>
                <p className="text-orange-100 text-sm">View your results, timetable, and academic progress</p>
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600 font-medium">Email</p>
              <p className="text-gray-900 font-semibold">{user?.emailAddresses[0]?.emailAddress}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">User ID</p>
              <p className="text-gray-900 font-semibold font-mono text-sm">{user?.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Role</p>
              <p className="text-gray-900 font-semibold capitalize">{role}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}