'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Search, X, Save, UserPlus, Link, Unlink, Download } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth, useUser } from '@clerk/nextjs';

type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

interface AppUser {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  created_at: string;
  active: boolean;
}

interface ClassItem {
  id: string;
  class_name: string;
  arm: string | null;
  department: string | null;
}

// 🔐 The developer / super admin account. Role is locked & protected.
const SUPER_ADMIN_EMAIL = 'olalereisaiah68@gmail.com';

export default function UserManagementPage() {
  const { getToken } = useAuth();
  const { user: currentUser } = useUser(); // ✅ Get current logged-in user
  const [users, setUsers] = useState<AppUser[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState(''); // ✅ Class filter
  const [classFilterUserIds, setClassFilterUserIds] = useState<Set<string>>(new Set()); // ✅ User IDs linked to selected class
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'teacher' as UserRole,
    phone: '',
    password: '',
  });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingUser, setLinkingUser] = useState<{ userId: string; userEmail: string } | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchClasses(); // ✅ Fetch classes for filter
  }, []);

  // ✅ Fetch user_ids linked to selected class when filter changes
  useEffect(() => {
    if (filterClass) {
      fetchClassFilterUserIds(filterClass);
    } else {
      setClassFilterUserIds(new Set());
    }
  }, [filterClass]);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load users');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, class_name, arm, department')
      .order('class_level')
      .order('class_name');
    if (!error && data) {
      setClasses(data);
    }
  };

  // ✅ Fetch all user_ids associated with a class (students + teachers + parents)
  const fetchClassFilterUserIds = async (classId: string) => {
    const userIds = new Set<string>();

    // 1. Students in this class
    const { data: students } = await supabase
      .from('students')
      .select('user_id')
      .eq('class_id', classId)
      .eq('active', true);
    
    students?.forEach(s => {
      if (s.user_id) userIds.add(s.user_id);
    });

    // 2. Teachers assigned to this class (form_class_id or form_class_ids)
    const { data: teachers } = await supabase
      .from('teachers')
      .select('user_id, form_class_id, form_class_ids');
    
    teachers?.forEach(t => {
      if (t.user_id) {
        if (t.form_class_id === classId) {
          userIds.add(t.user_id);
        } else if (t.form_class_ids && t.form_class_ids.includes(classId)) {
          userIds.add(t.user_id);
        }
      }
    });

    // 3. Parents of students in this class
    const studentIds = students?.map(s => s.user_id).filter(Boolean) || [];
    if (studentIds.length > 0) {
      const { data: studentRecords } = await supabase
        .from('students')
        .select('id, user_id')
        .in('user_id', studentIds);
      
      const studentRecordIds = studentRecords?.map(s => s.id) || [];
      
      const { data: parents } = await supabase
        .from('parents')
        .select('user_id, students_ids');
      
      parents?.forEach(p => {
        if (p.user_id && p.students_ids) {
          const hasOverlap = p.students_ids.some((sid: string) => studentRecordIds.includes(sid));
          if (hasOverlap) {
            userIds.add(p.user_id);
          }
        }
      });
    }

    setClassFilterUserIds(userIds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // ✅ UPDATE: Check if email changed and conflicts
        if (formData.email !== editingUser.email) {
          const { data: existingEmail } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('email', formData.email)
            .single();

          if (existingEmail) {
            toast.error(`Email "${formData.email}" is already registered to ${existingEmail.full_name}. Each person needs a unique email.`);
            return;
          }
        }

        const { error } = await supabase
          .from('users')
          .update({
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            phone: formData.phone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingUser.id);
        if (error) throw error;
        toast.success('User updated successfully!');
      } else {
        // ✅ CREATE: Duplicate checks before creating
        // Check 1: Same email
        const { data: existingEmail } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('email', formData.email)
          .single();

        if (existingEmail) {
          toast.error(`Email "${formData.email}" is already registered to ${existingEmail.full_name}. Each person needs a unique email.`);
          return;
        }

        // Check 2: Same name + same role
        const { data: existingNameRole } = await supabase
          .from('users')
          .select('id, email')
          .eq('full_name', formData.full_name)
          .eq('role', formData.role)
          .single();

        if (existingNameRole) {
          toast.error(`A ${formData.role} named "${formData.full_name}" already exists (email: ${existingNameRole.email}). If this is a different person, add a middle name or identifier.`);
          return;
        }

        const token = await getToken(); // ✅ Get Clerk token
        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // ✅ Added Authorization header
          },
          body: JSON.stringify({
            email: formData.email,
            fullName: formData.full_name,
            role: formData.role,
            phone: formData.phone,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create user');
        toast.success(result.message || 'User created successfully!');
      }
      setShowModal(false);
      setFormData({ email: '', full_name: '', role: 'teacher', phone: '', password: '' });
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  const handleDelete = async (user: AppUser) => {
    const currentEmail = currentUser?.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
    const SUPER_ADMIN_EMAIL = 'olalereisaiah68@gmail.com';
    const isSuperAdmin = currentEmail === SUPER_ADMIN_EMAIL;

    // 🔐 SECURITY: Block deleting the super admin (developer) account
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
      toast.error('Super admin account cannot be deleted. This is the developer account.');
      return;
    }

    // 🔐 SECURITY: Only super admin can delete other admins
    if (user.role === 'admin' && !isSuperAdmin) {
      toast.error('Only the super admin can delete admin accounts.');
      return;
    }

    // Confirmation dialog
    const confirmMsg = user.role === 'admin'
      ? `⚠️ You are about to delete an ADMIN account: "${user.full_name}"\n\nThis will remove all their access and cannot be undone. Continue?`
      : `Are you sure you want to delete "${user.full_name}"?\n\nThis action cannot be undone.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete user');

      toast.success('User deleted successfully!');
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  
  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    // 🔐 Never allow demoting the super admin
    const target = users.find(u => u.id === userId);
    if (target && target.email.toLowerCase() === SUPER_ADMIN_EMAIL && newRole !== 'admin') {
      toast.error('The super admin role cannot be changed.');
      return;
    }

    try {
      const token = await getToken();
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed');
      toast.success(`Role updated to ${newRole}. Access is effective immediately.`);
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase.from('users').update({ active: !currentActive }).eq('id', userId);
      if (error) throw error;
      toast.success('User ' + (!currentActive ? 'activated' : 'deactivated'));
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  const openLinkModal = (user: AppUser) => {
    setLinkingUser({ userId: user.id, userEmail: user.email });
    setShowLinkModal(true);
    setStudentSearch('');
    setStudentResults([]);
  };

  const searchStudents = async () => {
    if (studentSearch.length < 2) {
      setStudentResults([]);
      return;
    }
    const { data } = await supabase.from('students').select('*').ilike('full_name', `%${studentSearch}%`).or(`admission_number.ilike.%${studentSearch}%`).limit(10);
    setStudentResults(data || []);
  };

  const linkStudentToUser = async (studentId: string) => {
    if (!linkingUser) return;
    try {
      const { error } = await supabase.from('students').update({ user_id: linkingUser.userId }).eq('id', studentId);
      if (error) throw error;
      toast.success('Student linked to user account!');
      setShowLinkModal(false);
      setLinkingUser(null);
    } catch (error: any) {
      toast.error('Link failed: ' + error.message);
    }
  };

  const unlinkStudent = async (userId: string) => {
    try {
      const { error } = await supabase.from('students').update({ user_id: null }).eq('user_id', userId);
      if (error) throw error;
      toast.success('Student unlinked from user');
      fetchUsers();
    } catch (error: any) {
      toast.error('Unlink failed: ' + error.message);
    }
  };

  const filteredUsers = users.filter(user => {
    // ✅ Apply class filter first
    if (filterClass && !classFilterUserIds.has(user.id)) {
      return false;
    }
    
    // Then apply search filter
    return (
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.includes(searchTerm.toLowerCase())
    );
  });

  // ✅ STATS CALCULATION
  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    teacher: users.filter(u => u.role === 'teacher').length,
    parent: users.filter(u => u.role === 'parent').length,
    student: users.filter(u => u.role === 'student').length,
  };

  // ✅ EXPORT CSV FUNCTION
  const exportToCSV = () => {
    const headers = ['Full Name', 'Email', 'Role', 'Phone', 'Status', 'Created At'];
    const rows = filteredUsers.map(u => [
      u.full_name,
      u.email,
      u.role,
      u.phone || '',
      u.active ? 'Active' : 'Inactive',
      new Date(u.created_at).toLocaleDateString()
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('User list exported!');
  };

  if (loading) return <div className="p-8 text-gray-900 font-bold">Loading users...</div>;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 mb-6 text-center md:text-left">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1 font-medium">Create and manage users with automatic Clerk integration</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto justify-center md:justify-end">
          <button onClick={exportToCSV} className="flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 font-bold w-full md:w-auto">
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          <button onClick={() => { setEditingUser(null); setFormData({ email: '', full_name: '', role: 'teacher', phone: '', password: '' }); setShowModal(true); }} className="flex items-center justify-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold w-full md:w-auto">
            <UserPlus size={20} />
            <span>Create New User</span>
          </button>
        </div>
      </div>
      {/* ✅ STATS DASHBOARD */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-4 border-2 border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
          <p className="text-gray-600 text-xs md:text-sm font-medium text-center">Total Users</p>
        </div>
        <div className="bg-red-50 rounded-xl shadow-md p-4 border-2 border-red-200">
          <h3 className="text-2xl font-bold text-red-900">{stats.admin}</h3>
          <p className="text-red-600 text-xs md:text-sm font-medium text-center">Admins</p>
        </div>
        <div className="bg-blue-50 rounded-xl shadow-md p-4 border-2 border-blue-200">
          <h3 className="text-2xl font-bold text-blue-900">{stats.teacher}</h3>
          <p className="text-blue-600 text-xs md:text-sm font-medium text-center">Teachers</p>
        </div>
        <div className="bg-purple-50 rounded-xl shadow-md p-4 border-2 border-purple-200">
          <h3 className="text-2xl font-bold text-purple-900">{stats.parent}</h3>
          <p className="text-purple-600 text-xs md:text-sm font-medium text-center">Parents</p>
        </div>
        <div className="bg-green-50 rounded-xl shadow-md p-4 border-2 border-green-200">
          <h3 className="text-2xl font-bold text-green-900">{stats.student}</h3>
          <p className="text-green-600 text-xs md:text-sm font-medium text-center">Students</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative md:max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search by name, email, or role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900 font-medium" />
        </div>
        {/* ✅ CLASS FILTER DROPDOWN */}
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-medium bg-white focus:ring-2 focus:ring-green-500 md:w-64"
        >
          <option value="">All Classes</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.class_name} {c.arm ? `(${c.arm})` : ''} {c.department ? `- ${c.department}` : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="table-container bg-white rounded-xl shadow-md border border-gray-200 overflow-x-auto">
        <table className="responsive-table w-full min-w-[900px]">
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="min-w-[250px] px-6 py-4 text-left text-gray-900 font-bold">User</th>
              <th className="min-w-[200px] px-6 py-4 text-left text-gray-900 font-bold">Email</th>
              <th className="min-w-[180px] px-6 py-4 text-left text-gray-900 font-bold">Role</th>
              <th className="min-w-[150px] px-6 py-4 text-left text-gray-900 font-bold">Phone</th>
              <th className="min-w-[120px] px-6 py-4 text-left text-gray-900 font-bold">Status</th>
              <th className="min-w-[150px] px-6 py-4 text-left text-gray-900 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-600 font-medium">
                  {filterClass ? 'No users found for this class. Try a different class or clear the filter.' : 'No users found. Create your first user!'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{user.full_name}</div>
                    <div className="text-xs text-gray-500 font-mono mt-1">{user.clerk_id?.startsWith('user_') ? '✅ Clerk Linked' : '️ Pending'}</div>
                  </td>
                  <td className="px-6 py-4"><span className="truncate-text text-gray-900 font-medium" title={user.email}>{user.email}</span></td>
                  <td className="px-6 py-4">
                    {user.email.toLowerCase() === SUPER_ADMIN_EMAIL ? (
                      user.role === 'admin' ? (
                        <span className="px-2 md:px-3 py-1 inline-block border-2 border-red-300 bg-red-50 rounded-lg text-xs md:text-sm text-red-800 font-bold cursor-not-allowed select-none" title="Super admin role is locked">
                          🏢 Super Admin (Locked)
                        </span>
                      ) : (
                        <button onClick={() => handleUpdateRole(user.id, 'admin')} className="px-2 md:px-3 py-1 border-2 border-red-400 bg-red-100 rounded-lg text-xs md:text-sm text-red-800 font-bold hover:bg-red-200" title="Restore super admin">
                          ⚠️ Restore to Admin
                        </button>
                      )
                    ) : (
                      <select value={user.role} onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)} className={`px-2 md:px-3 py-1 border-2 rounded-lg text-xs md:text-sm text-gray-900 font-bold focus:ring-2 focus:ring-green-500 transition-colors ${user.role === 'admin' ? 'border-red-300 bg-red-50' : user.role === 'teacher' ? 'border-blue-300 bg-blue-50' : user.role === 'parent' ? 'border-purple-300 bg-purple-50' : 'border-green-300 bg-green-50'}`}>
                        <option value="admin">🏢 Admin</option>
                        <option value="teacher">👨‍ Teacher</option>
                        <option value="parent">👨‍‍ Parent</option>
                        <option value="student">🎓 Student</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-900">{user.phone || '—'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggleActive(user.id, user.active)} className={`px-3 py-1 rounded-full text-xs font-bold ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.active ? '✓ Active' : '✗ Inactive'}
                    </button>
                  </td>
                  <td className="px-3 md:px-6 py-4">
                    <div className="flex space-x-1 md:space-x-2">
                      {user.role === 'student' && (
                        <button onClick={() => openLinkModal(user)} className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded font-bold" title="Link to Student"><Link size={18} /></button>
                      )}
                      <button onClick={() => { setEditingUser(user); setFormData({ email: user.email, full_name: user.full_name, role: user.role, phone: user.phone || '', password: '' }); setShowModal(true); }} className="p-1.5 md:p-2 text-green-600 hover:bg-green-50 rounded font-bold" title="Edit"><Edit size={18} /></button>
                      {user.email.toLowerCase() !== SUPER_ADMIN_EMAIL && (
                        <button onClick={() => handleDelete(user)} className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded font-bold" title="Delete User"><Trash2 size={18} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filteredUsers.length > 0 && (
        <p className="md:hidden mt-2 text-xs text-gray-500 text-center">← Swipe the table sideways to see Role, Status & Actions →</p>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b-2 border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-700 hover:text-gray-900 font-bold text-xl"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingUser && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-bold">✨ Auto-Create Enabled</p>
                  <p className="text-xs text-green-700 mt-1">Clerk account will be created automatically. Login credentials sent to user's email.</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Email Address *</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900 font-medium" placeholder="user@greenfieldacademy.edu.ng" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Full Name *</label>
                <input type="text" required value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900 font-medium" placeholder="Mr. John Doe" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Role *</label>
                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900 font-bold">
                  <option value="admin">🏢 Admin</option>
                  <option value="teacher">👨‍🏫 Teacher</option>
                  <option value="parent">👨‍👩‍👦 Parent</option>
                  <option value="student">🎓 Student</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Phone (Optional)</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900 font-medium" placeholder="+234 801 234 5678" />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Temporary Password (Optional)</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900 font-medium" placeholder="Leave blank for auto-generated" />
                  <p className="text-xs text-gray-600 mt-1">If blank, Clerk generates one and emails it</p>
                </div>
              )}
              <div className="flex flex-col-reverse md:flex-row justify-end gap-3 md:space-x-3 pt-4 border-t-2 border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-gray-900 w-full md:w-auto">Cancel</button>
                <button type="submit" className="flex items-center justify-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold w-full md:w-auto"><Save size={18} /><span>{editingUser ? 'Update' : 'Create'} User</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Link Student Record</h3>
              <button onClick={() => setShowLinkModal(false)} className="text-gray-700 hover:text-gray-900 font-bold"><X size={24} /></button>
            </div>
            <p className="text-gray-700 font-medium mb-4">Link user <strong className="text-gray-900">{linkingUser?.userEmail}</strong> to a student:</p>
            <input type="text" placeholder="Search student..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} onKeyUp={searchStudents} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-medium mb-4" />
            {studentResults.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto border-2 border-gray-200 rounded-lg">
                {studentResults.map((student) => (
                  <div key={student.id} className="p-3 border-b border-gray-200 hover:bg-gray-50 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900">{student.full_name}</p>
                      <p className="text-sm text-gray-600">{student.admission_number}</p>
                    </div>
                    <button onClick={() => linkStudentToUser(student.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold">Link</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-4 border-t-2 border-gray-200">
              <button onClick={() => setShowLinkModal(false)} className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-gray-900 w-full md:w-auto">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}