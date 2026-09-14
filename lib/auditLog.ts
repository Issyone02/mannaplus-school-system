import { supabase } from './supabase'

interface AuditLogParams {
  userId?: string
  userEmail?: string
  userRole?: string
  action: string
  description: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
  severity?: 'LOW' | 'MEDIUM' | 'HIGH'
}

export async function logAuditEvent(params: AuditLogParams) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: params.userId || null,
      user_email: params.userEmail || null,
      user_role: params.userRole || null,
      action: params.action,
      description: params.description,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
      severity: params.severity || 'MEDIUM',
      created_at: new Date().toISOString()
    })

    if (error) {
      console.error('❌ Audit log error:', error)
    }
  } catch (error) {
    console.error('❌ Audit log failed:', error)
    // Don't throw - audit logging shouldn't break main functionality
  }
}

// Helper functions for common actions
export const auditActions = {
  // Teacher actions
  teacherMarkAttendance: (userEmail: string, classId: string, date: string, count: number) => 
    logAuditEvent({
      userEmail,
      userRole: 'teacher',
      action: 'mark_attendance',
      description: `Marked attendance for ${count} students in ${classId.toUpperCase()} on ${date}`,
      entityType: 'attendance',
      metadata: { classId, date, studentCount: count }
    }),

  teacherEnterResults: (userEmail: string, classId: string, subjectName: string, count: number) =>
    logAuditEvent({
      userEmail,
      userRole: 'teacher',
      action: 'enter_results',
      description: `Entered ${count} results for ${subjectName} in ${classId.toUpperCase()}`,
      entityType: 'result',
      metadata: { classId, subjectName, resultCount: count }
    }),

  teacherUpdateResult: (userEmail: string, studentId: string, subjectName: string) =>
    logAuditEvent({
      userEmail,
      userRole: 'teacher',
      action: 'update_result',
      description: `Updated result for student ${studentId} in ${subjectName}`,
      entityType: 'result',
      entityId: studentId,
      metadata: { subjectName }
    }),

  teacherDeleteResult: (userEmail: string, resultId: string) =>
    logAuditEvent({
      userEmail,
      userRole: 'teacher',
      action: 'delete_result',
      description: `Deleted result ${resultId}`,
      entityType: 'result',
      entityId: resultId
    }),

  // Admin actions
  adminCreateUser: (adminEmail: string, newUserEmail: string, role: string) =>
    logAuditEvent({
      userEmail: adminEmail,
      userRole: 'admin',
      action: 'create_user',
      description: `Created ${role} account for ${newUserEmail}`,
      entityType: 'user',
      entityId: newUserEmail,
      metadata: { newUserRole: role }
    }),

  adminDeleteUser: (adminEmail: string, targetEmail: string, role: string) =>
    logAuditEvent({
      userEmail: adminEmail,
      userRole: 'admin',
      action: 'delete_user',
      description: `Deleted ${role} account: ${targetEmail}`,
      entityType: 'user',
      entityId: targetEmail
    }),

  adminCreateSubject: (adminEmail: string, subjectName: string, classId: string) =>
    logAuditEvent({
      userEmail: adminEmail,
      userRole: 'admin',
      action: 'create_subject',
      description: `Created subject "${subjectName}" for ${classId.toUpperCase()}`,
      entityType: 'subject',
      metadata: { subjectName, classId }
    }),

  adminBulkUpload: (adminEmail: string, type: string, count: number) =>
    logAuditEvent({
      userEmail: adminEmail,
      userRole: 'admin',
      action: 'bulk_upload',
      description: `Bulk uploaded ${count} ${type}`,
      entityType: type,
      metadata: { count, type }
    }),

  // ✅ NEW: Admin Modify Attendance (with OTP Override tracking)
  adminModifyAttendance: (
    adminEmail: string,
    studentId: string,
    date: string,
    newStatus: string,
    overrideType: 'NORMAL_EDIT' | 'OTP_OVERRIDE'
  ) => {
    logAuditEvent({
      userEmail: adminEmail,
      userRole: 'admin',
      action: 'ATTENDANCE_MODIFIED',
      description: `Admin modified attendance for student ${studentId} on ${date} to ${newStatus} (${overrideType})`,
      entityType: 'attendance',
      entityId: studentId,
      metadata: {
        student_id: studentId,
        date: date,
        new_status: newStatus,
        override_type: overrideType,
        timestamp: new Date().toISOString(),
      },
      severity: overrideType === 'OTP_OVERRIDE' ? 'HIGH' : 'MEDIUM'
    })
  },

  // Authentication
  userLogin: (userEmail: string, role: string) =>
    logAuditEvent({
      userEmail,
      userRole: role,
      action: 'login',
      description: `${role} logged in: ${userEmail}`,
      entityType: 'auth'
    }),

  userLogout: (userEmail: string, role: string) =>
    logAuditEvent({
      userEmail,
      userRole: role,
      action: 'logout',
      description: `${role} logged out: ${userEmail}`,
      entityType: 'auth'
    })
}