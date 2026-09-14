'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TrendingUp, TrendingDown, DollarSign, Users, BookOpen, Award, Plus, FileText } from 'lucide-react'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalFeeStructures: 0,
    totalCollected: 0,
    totalPending: 0,
    totalRevenue: 0,
    pendingRequests: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { count: studentsCount } = await supabase.from('students').select('*', { count: 'exact', head: true })
      const { count: teachersCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true })
      const { count: parentsCount } = await supabase.from('parents').select('*', { count: 'exact', head: true })
      const { data: feeStructures } = await supabase.from('fee_structures').select('amount').eq('active', true)
      const { data: payments } = await supabase.from('fee_payments').select('amount_paid')
      const { count: pendingRequestsCount } = await supabase.from('payment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')

      const totalStructures = feeStructures?.reduce((sum, f) => sum + f.amount, 0) || 0
      const totalCollected = payments?.reduce((sum, p) => sum + p.amount_paid, 0) || 0
      const totalPending = totalStructures - totalCollected

      setStats({
        totalStudents: studentsCount || 0,
        totalTeachers: teachersCount || 0,
        totalParents: parentsCount || 0,
        totalFeeStructures: feeStructures?.length || 0,
        totalCollected,
        totalPending: Math.max(0, totalPending),
        totalRevenue: totalCollected,
        pendingRequests: pendingRequestsCount || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-900 font-bold text-xl">Loading dashboard...</div>
      </div>
    )
  }

  const overviewCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-blue-500', trend: '+12%', trendUp: true },
    { title: 'Total Teachers', value: stats.totalTeachers, icon: BookOpen, color: 'bg-purple-500', trend: '+5%', trendUp: true },
    { title: 'Total Parents', value: stats.totalParents, icon: Users, color: 'bg-green-500', trend: '+8%', trendUp: true },
    { title: 'Fee Structures', value: stats.totalFeeStructures, icon: DollarSign, color: 'bg-yellow-500', trend: 'Active', trendUp: true }
  ]

  const financeCards = [
    { title: 'Total Collected', value: `₦${stats.totalCollected.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { title: 'Total Expected', value: `₦${(stats.totalCollected + stats.totalPending).toLocaleString()}`, icon: DollarSign, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { title: 'Pending Fees', value: `₦${stats.totalPending.toLocaleString()}`, icon: TrendingDown, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    { title: 'Payment Requests', value: stats.pendingRequests, icon: Award, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', subtitle: 'Awaiting approval' }
  ]

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {overviewCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon className="text-white" size={24} />
              </div>
              <span className={`text-sm font-bold ${card.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {card.trend}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
            <p className="text-gray-600 text-sm">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Finance Cards */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {financeCards.map((card, index) => (
            <div key={index} className={`${card.bgColor} rounded-xl shadow-md p-6 border-2 ${card.borderColor}`}>
              <div className="flex items-center justify-between mb-4">
                <card.icon className={card.color} size={24} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
              <p className="text-gray-700 text-sm font-medium">{card.title}</p>
              {card.subtitle && <p className="text-gray-600 text-xs mt-1">{card.subtitle}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button 
            onClick={() => router.push('/admin/students')}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-blue-200 transition-colors text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <Plus className="text-blue-600" size={24} />
              <h3 className="font-bold text-blue-900 text-lg">Add Student</h3>
            </div>
            <p className="text-sm text-blue-700 ml-12">Register new student</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/fees')}
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border-2 border-green-200 transition-colors text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-green-600" size={24} />
              <h3 className="font-bold text-green-900 text-lg">Record Payment</h3>
            </div>
            <p className="text-sm text-green-700 ml-12">Manual payment entry</p>
          </button>
          
          <button 
            onClick={() => router.push('/admin/fees')}
            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border-2 border-purple-200 transition-colors text-left relative"
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="text-purple-600" size={24} />
              <h3 className="font-bold text-purple-900 text-lg">View Requests</h3>
            </div>
            <p className="text-sm text-purple-700 ml-12">{stats.pendingRequests} pending approval{stats.pendingRequests !== 1 ? 's' : ''}</p>
            {stats.pendingRequests > 0 && (
              <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {stats.pendingRequests}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}