'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Search, X, Save, User, GraduationCap, Mail, Phone, Calendar, Briefcase, PenLine } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import TeacherSignatureModal from '@/components/TeacherSignatureModal';

interface Teacher {
  id: string;
  user_id?: string;
  staff_id: string;
  full_name: string;
  email: string;
  phone?: string;
  qualification?: string;
  subjects: string[];
  form_class_id?: string;
  form_class_name?: string;
  joined_date: string;
  active: boolean;
  created_at: string;
}

interface ClassItem {
  id: string;
  class_name: string;
  arm: string | null;
  department: string | null;
}

interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [sigTeacher, setSigTeacher] = useState<any>(null)
  const [formData, setFormData] = useState({
    staff_id: '',
    full_name: '',
    email: '',
    phone: '',
    qualification: '',
    subjects: [] as string[],
    form_class_id: '',
    joined_date: new Date().toISOString().split('T')[0],
    create_portal_account: false,
    user_email: '',
    active: true,
    user_id: null as string | null,
  });
  
  // ✅ DYNAMIC SUBJECTS: Will hold unique subject names
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  // ✅ FETCH CLASSES FROM DATABASE
  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, arm, department')
        .order('class_level')
        .order('class_name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      console.error('Error fetching classes:', error);
    }
  };

  // ✅ FETCH SUBJECTS FROM DATABASE (WITH SMART DEDUPLICATION)
  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('name');

      if (error) throw error;
      
      if (data) {
        // 1. Use a Set to get unique subject names
        const uniqueSubjectNames = new Set(data.map(s => s.name));
        
        // 2. Convert to array and sort alphabetically
        const sortedUniqueNames = Array.from(uniqueSubjectNames).sort();
        setAvailableSubjects(sortedUniqueNames);
      }
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
    }
  };

  // ✅ FETCH TEACHERS WITH DYNAMIC CLASS FORMATTING
  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase.from('teachers').select('*').order('full_name');
      if (error) throw error;
      
      // Format class names with department information
      const enriched = (data || []).map((t: any) => {
        const classObj = classes.find(c => c.id === t.form_class_id);
        let className = classObj?.class_name || 'Unassigned';
        if (classObj?.arm) className += ` (${classObj.arm})`;
        if (classObj?.department) className += ` - ${classObj.department}`;
        return { ...t, form_class_name: className };
      });
      
      setTeachers(enriched);
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FETCH USERS FOR PORTAL ACCOUNTS
  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .or(`role.eq.teacher,role.is.null`)
        .order('email');
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  // ✅ CREATE CLERK USER (FOR PORTAL ACCOUNTS)
  const createClerkUser = async (email: string, fullName: string) => {
    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          fullName, 
          role: 'teacher', 
          phone: formData.phone || '' 
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', result.clerkId)
          .single();
        return data?.id || null;
      }
      return null;
    } catch (error) {
      console.error('Error creating Clerk user:', error);
      return null;
    }
  };

  // ✅ SUBMIT TEACHER DATA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let userId: string | null = formData.user_id || null;

      // ✅ CREATE PORTAL ACCOUNT IF REQUESTED
      if (formData.create_portal_account && formData.user_email) {
        userId = await createClerkUser(formData.user_email, formData.full_name);
        if (!userId) toast.error('Failed to create portal account, but teacher was added');
      } else if (formData.user_email) {
        const user = users.find(u => u.email === formData.user_email);
        if (user) userId = user.id;
      }

      // ✅ PREPARE TEACHER DATA
      const teacherData = {
        staff_id: formData.staff_id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        qualification: formData.qualification || null,
        subjects: formData.subjects,
        form_class_id: formData.form_class_id || null,
        joined_date: formData.joined_date,
        user_id: userId,
        active: formData.active,
      };

      // ✅ SAVE OR UPDATE TEACHER
      if (editingTeacher) {
        const { error } = await supabase
          .from('teachers')
          .update(teacherData)
          .eq('id', editingTeacher.id);
        if (error) throw error;
        toast.success('Teacher updated successfully!');
      } else {
        const { error } = await supabase
          .from('teachers')
          .insert([teacherData]);
        if (error) throw error;
        toast.success('Teacher added successfully!' + (userId ? ' Portal account created!' : ''));
      }

      // ✅ RESET FORM AND REFRESH
      setShowModal(false);
      setFormData({
        staff_id: '', 
        full_name: '', 
        email: '', 
        phone: '', 
        qualification: '',
        subjects: [], 
        form_class_id: '', 
        joined_date: new Date().toISOString().split('T')[0],
        create_portal_account: false, 
        user_email: '', 
        active: true, 
        user_id: null,
      });
      setEditingTeacher(null);
      fetchTeachers();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  // ✅ EDIT EXISTING TEACHER
  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      staff_id: teacher.staff_id,
      full_name: teacher.full_name,
      email: teacher.email,
      phone: teacher.phone || '',
      qualification: teacher.qualification || '',
      subjects: teacher.subjects || [],
      form_class_id: teacher.form_class_id || '',
      joined_date: teacher.joined_date?.split('T')[0] || '',
      create_portal_account: !!teacher.user_id,
      user_email: teacher.user_id ? (users.find(u => u.id === teacher.user_id)?.email || '') : '',
      active: teacher.active,
      user_id: teacher.user_id || null,
    });
    setShowModal(true);
  };

  // ✅ DELETE TEACHER
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this teacher?')) return;
    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Teacher deleted!');
      fetchTeachers();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  // ✅ TOGGLE ACTIVE STATUS
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .update({ active: !currentActive })
        .eq('id', id);
      if (error) throw error;
      toast.success('Teacher ' + (!currentActive ? 'activated' : 'deactivated'));
      fetchTeachers();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  // ✅ TOGGLE SUBJECT SELECTION
  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  // ✅ FILTER TEACHERS FOR SEARCH
  const filteredTeachers = teachers.filter(teacher =>
    teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.staff_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.subjects || []).some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ✅ INITIAL DATA FETCH
  useEffect(() => {
    fetchClasses();
    fetchSubjects(); // ✅ Fetch unique subject names
    fetchTeachers();
    fetchUsers();
  }, []);

  if (loading) return <div className="p-8 text-gray-900 font-bold">Loading teachers...</div>;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-gray-600 mt-1 font-medium">{teachers.length} teachers • {teachers.filter(t => t.active).length} active</p>
        </div>
        <button
          onClick={() => { 
            setEditingTeacher(null); 
            setFormData({ 
              staff_id: '', 
              full_name: '', 
              email: '', 
              phone: '', 
              qualification: '', 
              subjects: [], 
              form_class_id: '', 
              joined_date: new Date().toISOString().split('T')[0],
              create_portal_account: false, 
              user_email: '', 
              active: true, 
              user_id: null 
            }); 
            setShowModal(true); 
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold"
        >
          <Plus size={20} />
          <span>Add Teacher</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, staff ID, email, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {filteredTeachers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
            <User size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium text-lg">No teachers found</p>
            <p className="text-gray-500 mt-2">Add your first teacher!</p>
          </div>
        ) : (
          filteredTeachers.map((teacher) => (
            <div key={teacher.id} className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-700 font-bold text-xl">{teacher.full_name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{teacher.full_name}</h3>
                      <p className="text-sm text-gray-600">{teacher.staff_id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(teacher.id, teacher.active)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${teacher.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {teacher.active ? '✓ Active' : '✗ Inactive'}
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-700">
                    <Mail size={14} className="mr-2 text-blue-600" />
                    <span className="font-medium truncate-text" title={teacher.email}>{teacher.email}</span>
                  </div>
                  {teacher.phone && (
                    <div className="flex items-center text-sm text-gray-700">
                      <Phone size={14} className="mr-2 text-blue-600" />
                      <span>{teacher.phone}</span>
                    </div>
                  )}
                  {teacher.qualification && (
                    <div className="flex items-center text-sm text-gray-700">
                      <GraduationCap size={14} className="mr-2 text-blue-600" />
                      <span>{teacher.qualification}</span>
                    </div>
                  )}
                  {teacher.form_class_name && (
                    <div className="flex items-center text-sm text-gray-700">
                      <Briefcase size={14} className="mr-2 text-blue-600" />
                      <span>Form Teacher: <strong>{teacher.form_class_name}</strong></span>
                    </div>
                  )}
                </div>

                {(teacher.subjects || []).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-600 mb-2">SUBJECTS:</p>
                    <div className="flex flex-wrap gap-1">
                      {(teacher.subjects || []).slice(0, 5).map((subject, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-medium">
                          {subject}
                        </span>
                      ))}
                      {(teacher.subjects || []).length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-medium">
                          +{(teacher.subjects || []).length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Joined: {new Date(teacher.joined_date).toLocaleDateString()}</span>
                  <div className="flex space-x-2">
                    <button onClick={() => setSigTeacher(teacher)} className="p-2 text-purple-600 hover:bg-purple-50 rounded font-bold" title="Upload Signature">
                      <PenLine size={18} />
                    </button>
                    <button onClick={() => handleEdit(teacher)} className="p-2 text-blue-600 hover:bg-blue-50 rounded font-bold" title="Edit">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(teacher.id)} className="p-2 text-red-600 hover:bg-red-50 rounded font-bold" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b-2 border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">{editingTeacher ? '✏️ Edit Teacher' : '➕ Add New Teacher'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-700 hover:text-gray-900 font-bold text-xl"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><User size={20} className="mr-2" /> Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">Full Name *</label><input type="text" required value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" placeholder="e.g., Mr. John Doe" /></div>
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">Staff ID *</label><input type="text" required value={formData.staff_id} onChange={(e) => setFormData({...formData, staff_id: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" placeholder="e.g., STF/2024/001" /></div>
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">Email *</label><input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" placeholder="teacher@mannaplus.com" /></div>
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" placeholder="+234 801 234 5678" /></div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><GraduationCap size={20} className="mr-2" /> Professional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-900 mb-1">Qualification</label><input type="text" value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" placeholder="e.g., B.Ed, M.Sc Mathematics" /></div>
                  <div><label className="block text-sm font-bold text-gray-900 mb-1">Joined Date</label><input type="date" value={formData.joined_date} onChange={(e) => setFormData({...formData, joined_date: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" /></div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">Form Teacher For</label>
                    <select value={formData.form_class_id} onChange={(e) => setFormData({...formData, form_class_id: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium">
                      <option value="">Not a form teacher</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.class_name} {c.arm ? `(${c.arm})` : ''} {c.department ? `- ${c.department}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Briefcase size={20} className="mr-2" /> Subjects Taught</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                  {availableSubjects.length === 0 ? (
                    <p className="text-gray-500 col-span-3 text-center py-4">No subjects found. Please add subjects in the Results page first.</p>
                  ) : (
                    availableSubjects.map((subject) => (
                      <label key={subject} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded">
                        <input 
                          type="checkbox" 
                          checked={formData.subjects.includes(subject)} 
                          onChange={() => handleSubjectToggle(subject)} 
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                        />
                        <span className="text-sm text-gray-700 font-medium">{subject}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-2">Selected: <span className="font-bold text-blue-600">{formData.subjects.length}</span> subjects</p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center"><Mail size={20} className="mr-2" /> Teacher Portal Account (Optional)</h3>
                <div className="flex items-center space-x-3 mb-3">
                  <input type="checkbox" id="create_portal_teacher" checked={formData.create_portal_account} onChange={(e) => setFormData({...formData, create_portal_account: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                  <label htmlFor="create_portal_teacher" className="text-blue-900 font-bold">Create portal account for this teacher</label>
                </div>
                {formData.create_portal_account && (
                  <div>
                    <label className="block text-sm font-bold text-blue-900 mb-1">Teacher Email (for login)</label>
                    <input type="email" value={formData.user_email} onChange={(e) => setFormData({...formData, user_email: e.target.value})} className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium" placeholder="teacher@mannaplus.com" />
                    <p className="text-xs text-blue-700 mt-2">✨ Clerk account created automatically. Login credentials sent to this email.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Status</label>
                <select value={formData.active ? 'active' : 'inactive'} onChange={(e) => setFormData({...formData, active: e.target.value === 'active'})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold">
                  <option value="active">✓ Active</option>
                  <option value="inactive">✗ Inactive</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t-2 border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-bold text-gray-900">Cancel</button>
                <button type="submit" className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold"><Save size={18} /><span>{editingTeacher ? 'Update' : 'Add'} Teacher</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sigTeacher && (
        <TeacherSignatureModal teacher={sigTeacher} onClose={() => setSigTeacher(null)} />
      )}
    </div>
  );
}