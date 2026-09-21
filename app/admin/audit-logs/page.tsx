'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, Search, FileText } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface AuditLog {
  id: string
  created_at: string
  user_email?: string
  email?: string
  actor?: string
  role?: string
  action?: string
  description?: string
  details?: string
}

type CategoryKey = 'all' | 'attendance' | 'results' | 'fees' | 'users' | 'people' | 'content' | 'other'

const TABS: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'results', label: 'Results' },
  { key: 'fees', label: 'Fees & Payments' },
  { key: 'users', label: 'Users & Access' },
  { key: 'people', label: 'Students & Classes' },
  { key: 'content', label: 'Notices & Content' },
  { key: 'other', label: 'Other' },
]

// ✅ Keyword-based categorization (case-insensitive, order matters)
const categorize = (action: string): CategoryKey => {
  const a = (action || '').toLowerCase()
  if (a.includes('attendance')) return 'attendance'
  if (a.includes('result') || a.includes('report')) return 'results'
  if (a.includes('fee') || a.includes('payment') || a.includes('receipt')) return 'fees'
  if (a.includes('user') || a.includes('role') || a.includes('link') || a.includes('password') || a.includes('login')) return 'users'
  if (a.includes('student') || a.includes('class') || a.includes('promot') || a.includes('teacher') || a.includes('parent')) return 'people'
  if (a.includes('notice') || a.includes('news') || a.includes('timetable') || a.includes('subject')) return 'content'
  return 'other'
}

const CATEGORY_BADGE: Record<CategoryKey, string> = {
  all: 'bg-gray-100 text-gray-800',
  attendance: 'bg-green-100 text-green-800',
  results: 'bg-purple-100 text-purple-800',
  fees: 'bg-amber-100 text-amber-800',
  users: 'bg-red-100 text-red-800',
  people: 'bg-blue-100 text-blue-800',
  content: 'bg-teal-100 text-teal-800',
  other: 'bg-gray-100 text-gray-800',
}

const PAGE_SIZE = 50

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<CategoryKey>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 250)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => { fetchLogs() }, [debouncedSearch, roleFilter, fromDate, toDate])
  useEffect(() => { setPage(1) }, [activeTab, debouncedSearch, roleFilter, fromDate, toDate])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (roleFilter) q = q.eq('role', roleFilter)
      if (fromDate) q = q.gte('created_at', `${fromDate}T00:00:00`)
      if (toDate) q = q.lte('created_at', `${toDate}T23:59:59`)

      const s = debouncedSearch.trim()
      if (s) {
        q = q.or(`user_email.ilike.%${s}%,action.ilike.%${s}%,description.ilike.%${s}%`)
      }

      const { data, error } = await q
      if (error) throw error
      setLogs(data || [])
    } catch (e: any) {
      toast.error('Failed to load audit logs: ' + e.message)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  // ✅ Normalize fields defensively + attach category
  const enriched = logs.map(l => ({
    ...l,
    email: l.user_email || l.email || l.actor || 'Unknown',
    actionText: l.action || 'Unknown',
    descriptionText: l.description || l.details || '',
    category: categorize(l.action || ''),
  }))

  // ✅ Live counts per tab (respect current search/role/date filters)
  const counts = TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? enriched.length : enriched.filter(l => l.category === t.key).length
    return acc
  }, {} as Record<CategoryKey, number>)

  const tabFiltered = activeTab === 'all' ? enriched : enriched.filter(l => l.category === activeTab)

  const totalPages = Math.max(1, Math.ceil(tabFiltered.length / PAGE_SIZE))
  const paginated = tabFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const todayStr = new Date().toISOString().split('T')[0]
  const todayCount = enriched.filter(l => (l.created_at || '').startsWith(todayStr)).length
  const teacherCount = enriched.filter(l => l.role === 'teacher').length
  const adminCount = enriched.filter(l => l.role === 'admin').length

  const exportCsv = () => {
    const headers = ['Date & Time', 'User', 'Role', 'Category', 'Action', 'Description']
    const rows = tabFiltered.map(l => [
      new Date(l.created_at).toLocaleString(),
      l.email,
      l.role || '',
      TABS.find(t => t.key === l.category)?.label || 'Other',
      l.actionText,
      l.descriptionText,
    ])
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${activeTab}_${todayStr}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success(`Exported "${TABS.find(t => t.key === activeTab)?.label}" logs to CSV!`)
  }

  if (loading) return <div className="p-8 text-gray-900 font-bold">Loading audit logs...</div>

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />

      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-700">Track all critical activities in the system</p>
        </div>
        <button onClick={exportCsv} className="bg-green-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-green-700">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow"><p className="text-sm text-gray-600 font-medium">Total Logs</p><p className="text-2xl font-bold text-gray-900">{enriched.length}</p></div>
        <div className="bg-white p-4 rounded shadow"><p className="text-sm text-gray-600 font-medium">Today's Activity</p><p className="text-2xl font-bold text-blue-600">{todayCount}</p></div>
        <div className="bg-white p-4 rounded shadow"><p className="text-sm text-gray-600 font-medium">Teacher Actions</p><p className="text-2xl font-bold text-green-600">{teacherCount}</p></div>
        <div className="bg-white p-4 rounded shadow"><p className="text-sm text-gray-600 font-medium">Admin Actions</p><p className="text-2xl font-bold text-red-600">{adminCount}</p></div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative lg:col-span-2">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, action, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded text-gray-900 placeholder-gray-500"
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-4 py-2 border rounded text-gray-900 bg-white">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
            <option value="student">Student</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-2 py-2 border rounded text-gray-900" title="From date" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-2 py-2 border rounded text-gray-900" title="To date" />
          </div>
        </div>
      </div>

      {/* ✅ CATEGORY TABS */}
      <div className="bg-white rounded shadow mb-6">
        <div className="flex border-b overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 font-bold whitespace-nowrap ${activeTab === t.key ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-700 hover:text-gray-900'}`}
            >
              {t.label}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === t.key ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left text-gray-900 font-bold whitespace-nowrap">Date & Time</th>
              <th className="p-3 text-left text-gray-900 font-bold whitespace-nowrap">User</th>
              <th className="p-3 text-left text-gray-900 font-bold whitespace-nowrap">Role</th>
              <th className="p-3 text-left text-gray-900 font-bold whitespace-nowrap">Category</th>
              <th className="p-3 text-left text-gray-900 font-bold whitespace-nowrap">Action</th>
              <th className="p-3 text-left text-gray-900 font-bold whitespace-nowrap">Description</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-gray-600">
                  <FileText size={48} className="mx-auto text-gray-300 mb-2" />
                  <p className="font-bold">No logs in this category</p>
                  <p className="text-sm mt-1">Try another tab or clear the filters</p>
                </td>
              </tr>
            ) : (
              paginated.map(l => (
                <tr key={l.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-gray-700 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3 text-gray-900 font-medium">{l.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${l.role === 'admin' ? 'bg-red-100 text-red-800' : l.role === 'teacher' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {l.role || 'unknown'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${CATEGORY_BADGE[l.category]}`}>
                      {TABS.find(t => t.key === l.category)?.label || 'Other'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-900 font-medium whitespace-nowrap">{l.actionText}</td>
                  <td className="p-3 text-gray-700">{l.descriptionText}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {tabFiltered.length > 0 && (
        <p className="md:hidden mt-2 text-xs text-gray-500 text-center">← Swipe the table sideways to see Action & Description →</p>
      )}

      {/* Pagination */}
      {tabFiltered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <p className="text-sm text-gray-600">
            Showing <span className="font-bold">{(page - 1) * PAGE_SIZE + 1}</span>–<span className="font-bold">{Math.min(page * PAGE_SIZE, tabFiltered.length)}</span> of <span className="font-bold">{tabFiltered.length}</span> logs
          </p>
          <div className="flex gap-2 items-center">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded font-bold text-gray-700 disabled:opacity-50">Previous</button>
            <span className="px-3 py-1 text-sm font-bold text-gray-700">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="px-3 py-1 border rounded font-bold text-gray-700 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}