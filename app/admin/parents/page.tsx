'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Search, X, Save, User, Mail, Phone, Home, Briefcase, Users } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { getSchoolAssets, getClassTeacherSignature } from '@/lib/schoolAssets';
import { findEmailConflict } from '@/lib/emailGuard';

interface Parent {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  alternate_phone?: string;
  occupation?: string;
  employer?: string;
  address?: string;
  state?: string;
  lga?: string;
  relationship_to_student?: string;
  students_ids?: string[]; // ✅ Made optional to handle null/undefined from DB
  active: boolean;
  created_at: string;
}

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  class_name?: string;
}

interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    alternate_phone: '',
    occupation: '',
    employer: '',
    address: '',
    state: '',
    lga: '',
    relationship_to_student: 'Father',
    students_ids: [] as string[],
    create_portal_account: false,
    user_email: '',
    active: true,
    user_id: null as string | null,
  });

  const relationshipOptions = ['Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Other'];
  const stateOptions = ['Lagos', 'Abuja', 'Rivers', 'Kano', 'Oyo', 'Edo', 'Anambra', 'Imo', 'Kaduna', 'Other'];

  useEffect(() => {
    fetchParents();
    fetchStudents();
    fetchUsers();
  }, []);

  const fetchParents = async () => {
    try {
      const { data, error } = await supabase.from('parents').select('*').order('full_name');
      if (error) throw error;
      setParents(data || []);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to load parents');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('id, full_name, admission_number, class_id').order('full_name');
    const enriched = (data || []).map((s: any) => ({ ...s, class_name: s.class_id || 'N/A' }));
    setStudents(enriched);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('id, email, full_name, role').or(`role.eq.parent,role.is.null`).order('email');
    setUsers(data || []);
  };

  const createClerkUser = async (email: string, fullName: string) => {
    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, role: 'parent', phone: '' }),
      });
      const result = await response.json();
      if (!response.ok && result.error) toast.error(result.error);
      if (result.success) {
        const { data } = await supabase.from('users').select('id').eq('clerk_id', result.clerkId).single();
        return data?.id || null;
      }
      return null;
    } catch (error) {
      console.error('Error creating Clerk user:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ✅ EMAIL UNIQUENESS GUARD: contact email AND portal email must belong to this parent only
      for (const em of [formData.email, formData.user_email].filter(Boolean)) {
        const conflict = await findEmailConflict(em, { ignoreParentId: editingParent?.id });
        if (conflict) {
          toast.error(`Email conflict: ${em} already belongs to ${conflict.person} (${conflict.role}). Each person needs a unique email.`);
          return;
        }
      }

      let userId: string | null = formData.user_id || null;

      if (formData.create_portal_account && formData.user_email) {
        userId = await createClerkUser(formData.user_email, formData.full_name);
        if (!userId) toast.error('Failed to create portal account, but parent was added');
      } else if (formData.user_email) {
        const user = users.find(u => u.email === formData.user_email);
        if (user) userId = user.id;
      }

      const parentData: any = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        alternate_phone: formData.alternate_phone || null,
        occupation: formData.occupation || null,
        employer: formData.employer || null,
        address: formData.address || null,
        state: formData.state || null,
        lga: formData.lga || null,
        relationship_to_student: formData.relationship_to_student,
        students_ids: formData.students_ids,
        user_id: userId,
        active: formData.active,
      };

      if (editingParent) {
        // 1. Update parent record
        const { error: parentError } = await supabase.from('parents').update(parentData).eq('id', editingParent.id);
        if (parentError) throw parentError;
        
        // ✅ Linkage lives ONLY in parents.students_ids.
        // students.user_id is reserved for the student's OWN portal account.
        toast.success('Parent updated successfully!');
      } else {
        // New parent
        const { error: parentError } = await supabase.from('parents').insert([parentData]);
        if (parentError) throw parentError;
        
        // ✅ Linkage lives ONLY in parents.students_ids (set above in parentData).
        toast.success('Parent added successfully!' + (userId ? ' Portal account created!' : ''));
      }

      setShowModal(false);
      setFormData({
        full_name: '', email: '', phone: '', alternate_phone: '', occupation: '',
        employer: '', address: '', state: '', lga: '', relationship_to_student: 'Father',
        students_ids: [], create_portal_account: false, user_email: '', active: true,
        user_id: null,
      });
      setEditingParent(null);
      fetchParents();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  const handleEdit = (parent: Parent) => {
    setEditingParent(parent);
    setFormData({
      full_name: parent.full_name,
      email: parent.email,
      phone: parent.phone,
      alternate_phone: parent.alternate_phone || '',
      occupation: parent.occupation || '',
      employer: parent.employer || '',
      address: parent.address || '',
      state: parent.state || '',
      lga: parent.lga || '',
      relationship_to_student: parent.relationship_to_student || 'Father',
      students_ids: parent.students_ids || [], // ✅ Default to empty array if undefined
      create_portal_account: !!parent.user_id,
      user_email: parent.user_id ? (users.find(u => u.id === parent.user_id)?.email || '') : '',
      active: parent.active,
      user_id: parent.user_id || null,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this parent?')) return;
    try {
      const { error } = await supabase.from('parents').delete().eq('id', id);
      if (error) throw error;
      toast.success('Parent deleted!');
      fetchParents();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase.from('parents').update({ active: !currentActive }).eq('id', id);
      if (error) throw error;
      toast.success('Parent ' + (!currentActive ? 'activated' : 'deactivated'));
      fetchParents();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      students_ids: prev.students_ids.includes(studentId)
        ? prev.students_ids.filter(s => s !== studentId)
        : [...prev.students_ids, studentId],
    }));
  };

  // ✅ FIXED: Safely handle undefined or null studentIds
  const getLinkedStudents = (studentIds: string[] | undefined | null) => {
    if (!studentIds || !Array.isArray(studentIds)) return [];
    return students.filter(s => studentIds.includes(s.id));
  };

  const filteredParents = parents.filter(parent =>
    parent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.phone.includes(searchTerm)
  );

  if (loading) return <div className="p-8 text-gray-900 font-bold">Loading parents...</div>;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parent Management</h1>
          <p className="text-gray-600 mt-1 font-medium">{parents.length} parents • {parents.filter(p => p.active).length} active</p>
        </div>
        <button
          onClick={() => { 
            setEditingParent(null); 
            setFormData({
              full_name: '', email: '', phone: '', alternate_phone: '', occupation: '',
              employer: '', address: '', state: '', lga: '', relationship_to_student: 'Father',
              students_ids: [], create_portal_account: false, user_email: '', active: true,
              user_id: null,
            });
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-bold"
        >
          <Plus size={20} />
          <span>Add Parent</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium"
          />
        </div>
      </div>

      {/* Parents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredParents.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
            <Users size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium text-lg">No parents found</p>
            <p className="text-gray-500 mt-2">Add your first parent!</p>
          </div>
        ) : (
          filteredParents.map((parent) => {
            const linkedStudents = getLinkedStudents(parent.students_ids);
            return (
              <div key={parent.id} className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-700 font-bold text-xl">{parent.full_name.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{parent.full_name}</h3>
                        <p className="text-sm text-gray-600">{parent.relationship_to_student}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(parent.id, parent.active)}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${parent.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {parent.active ? '✓ Active' : '✗ Inactive'}
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-700">
                      <Mail size={14} className="mr-2 text-purple-600" />
                      <span className="font-medium truncate" title={parent.email}>{parent.email}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <Phone size={14} className="mr-2 text-purple-600" />
                      <span>{parent.phone}</span>
                    </div>
                    {parent.alternate_phone && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Phone size={14} className="mr-2 text-purple-600" />
                        <span className="text-gray-500">Alt: {parent.alternate_phone}</span>
                      </div>
                    )}
                    {parent.occupation && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Briefcase size={14} className="mr-2 text-purple-600" />
                        <span>{parent.occupation}{parent.employer ? ` at ${parent.employer}` : ''}</span>
                      </div>
                    )}
                    {parent.state && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Home size={14} className="mr-2 text-purple-600" />
                        <span>{parent.state}{parent.lga ? `, ${parent.lga}` : ''}</span>
                      </div>
                    )}
                  </div>

                  {linkedStudents.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-gray-600 mb-2 flex items-center">
                        <Users size={12} className="mr-1" />
                        LINKED CHILDREN ({linkedStudents.length}):
                      </p>
                      <div className="space-y-1">
                        {linkedStudents.map((student) => (
                          <div key={student.id} className="px-2 py-1 bg-purple-50 rounded text-xs">
                            <span className="font-medium text-purple-900">{student.full_name}</span>
                            <span className="text-purple-600 ml-2">({student.admission_number})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs text-gray-500">Added: {new Date(parent.created_at).toLocaleDateString()}</span>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(parent)} className="p-2 text-purple-600 hover:bg-purple-50 rounded font-bold" title="Edit">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(parent.id)} className="p-2 text-red-600 hover:bg-red-50 rounded font-bold" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b-2 border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">{editingParent ? '✏️ Edit Parent' : '➕ Add New Parent'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-700 hover:text-gray-900 font-bold text-xl"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><User size={20} className="mr-2" /> Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">Full Name *</label><input type="text" required value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium" /></div>
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">Email *</label><input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium" /></div>
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">Phone *</label><input type="tel" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium" /></div>
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">Alternate Phone</label><input type="tel" value={formData.alternate_phone} onChange={(e) => setFormData({...formData, alternate_phone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium" /></div>
                </div>
              </div>

              {/* Address & Location */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Home size={20} className="mr-2" /> Address & Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-900 mb-1">Address</label><textarea rows={2} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium" /></div>
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">State</label><select value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium"><option value="">Select State</option>{stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">LGA</label><input type="text" value={formData.lga} onChange={(e) => setFormData({...formData, lga: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium" /></div>
                </div>
              </div>

              {/* Employment Information */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Briefcase size={20} className="mr-2" /> Employment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">Occupation</label><input type="text" value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium" /></div>
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">Employer</label><input type="text" value={formData.employer} onChange={(e) => setFormData({...formData, employer: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium" /></div>
                </div>
              </div>

              {/* Student Linking */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Users size={20} className="mr-2" /> Link to Children (Students)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                  {students.map((student) => (
                    <label key={student.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded">
                      <input type="checkbox" checked={formData.students_ids.includes(student.id)} onChange={() => handleStudentToggle(student.id)} className="w-4 h-4 text-purple-600 rounded" />
                      <div>
                        <span className="text-sm text-gray-700 font-medium">{student.full_name}</span>
                        <span className="text-xs text-gray-500 ml-2">({student.admission_number})</span>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">Selected: <span className="font-bold text-purple-600">{formData.students_ids.length}</span> children</p>
              </div>

              {/* Portal Account Section */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-bold text-purple-900 mb-3 flex items-center"><Mail size={20} className="mr-2" /> Parent Portal Account (Optional)</h3>
                <div className="flex items-center space-x-3 mb-3">
                  <input type="checkbox" id="create_portal_parent" checked={formData.create_portal_account} onChange={(e) => setFormData({...formData, create_portal_account: e.target.checked})} className="w-5 h-5 text-purple-600 rounded" />
                  <label htmlFor="create_portal_parent" className="text-purple-900 font-bold">Create portal account for this parent</label>
                </div>
                {formData.create_portal_account && (
                  <div>
                    <label className="block text-sm font-bold text-purple-900 mb-1">Parent Email (for login)</label>
                    <input type="email" value={formData.user_email} onChange={(e) => setFormData({...formData, user_email: e.target.value})} className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium" placeholder="parent@mannaplus.edu.ng" />
                    <p className="text-xs text-purple-700 mt-2">✨ Clerk account created automatically. Login credentials sent to this email.</p>
                  </div>
                )}
              </div>

              {/* Relationship & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Relationship to Student</label>
                  <select value={formData.relationship_to_student} onChange={(e) => setFormData({...formData, relationship_to_student: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-bold">
                    {relationshipOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Status</label>
                  <select value={formData.active ? 'active' : 'inactive'} onChange={(e) => setFormData({...formData, active: e.target.value === 'active'})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-bold">
                    <option value="active">✓ Active</option>
                    <option value="inactive">✗ Inactive</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t-2 border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-gray-900">Cancel</button>
                <button type="submit" className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-bold"><Save size={18} /><span>{editingParent ? 'Update' : 'Add'} Parent</span></button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}