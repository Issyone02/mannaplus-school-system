'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Filter, Calendar, User, Activity, Download } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface AuditLog {
  id: string
  user_id: string
  user_email: string
  user_role: string
  action: string
  description: string
  entity_type: string
  entity_id: string
  metadata: any
  created_at: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterAction, setFilterAction] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [filterRole, filterAction, dateFrom, dateTo])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (filterRole !== 'all') {
        query = query.eq('user_role', filterRole)
      }

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction)
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom)
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59')
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (error: any) {
      toast.error('Failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      log.user_email?.toLowerCase().includes(term) ||
      log.description?.toLowerCase().includes(term) ||
      log.action?.toLowerCase().includes(term) ||
      log.user_role?.toLowerCase().includes(term)
    )
  })

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      login: 'bg-blue-100 text-blue-800',
      logout: 'bg-gray-100 text-gray-800',
      mark_attendance: 'bg-green-100 text-green-800',
      enter_results: 'bg-purple-100 text-purple-800',
      update_result: 'bg-yellow-100 text-yellow-800',
      delete_result: 'bg-red-100 text-red-800',
      create_user: 'bg-indigo-100 text-indigo-800',
      delete_user: 'bg-red-100 text-red-800',
      create_subject: 'bg-teal-100 text-teal-800',
      bulk_upload: 'bg-orange-100 text-orange-800'
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      teacher: 'bg-blue-100 text-blue-800',
      parent: 'bg-purple-100 text-purple-800',
      student: 'bg-green-100 text-green-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Role', 'Action', 'Description']
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.user_email || 'Unknown',
      log.user_role || 'Unknown',
      log.action,
      log.description
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('Exported to CSV!')
  }

  if (loading) {
    return <div className="p-8 text-gray-900">Loading audit logs...</div>
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">Track all critical activities in the system</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700"
        >
          <Download size={16}/> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Logs</p>
          <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Today's Activity</p>
          <p className="text-2xl font-bold text-blue-600">
            {logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Teacher Actions</p>
          <p className="text-2xl font-bold text-green-600">
            {logs.filter(l => l.user_role === 'teacher').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Admin Actions</p>
          <p className="text-2xl font-bold text-red-600">
            {logs.filter(l => l.user_role === 'admin').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Search size={14} className="inline mr-1"/> Search
            </label>
            <input
              type="text"
              placeholder="Search by email, action, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full p-2 border rounded text-gray-900 bg-white"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-2 border rounded text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-2 border rounded text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="p-3 text-left text-gray-900 font-bold">Date & Time</th>
                <th className="p-3 text-left text-gray-900 font-bold">User</th>
                <th className="p-3 text-left text-gray-900 font-bold">Role</th>
                <th className="p-3 text-left text-gray-900 font-bold">Action</th>
                <th className="p-3 text-left text-gray-900 font-bold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-600">
                    <Activity size={48} className="mx-auto text-gray-300 mb-2"/>
                    <p className="font-bold">No audit logs found</p>
                    <p className="text-sm">Logs will appear here as activities occur</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-700 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar size={12}/>
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-3 text-gray-900 text-sm">
                      <div className="flex items-center gap-1">
                        <User size={12}/>
                        {log.user_email || 'Unknown'}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getRoleBadge(log.user_role)}`}>
                        {log.user_role || 'Unknown'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-gray-900 text-sm">{log.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}