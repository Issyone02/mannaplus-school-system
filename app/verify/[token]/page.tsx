import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { CheckCircle, XCircle, School, FileText, Calendar, User, Award } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function VerifyDocumentPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // ✅ Simple lookup — no embedded joins (avoids FK/embed errors)
  const { data: doc, error: docError } = await supabaseAdmin
    .from('document_verifications')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (docError) console.error('Verify lookup error:', docError)

  const expired = doc?.expires_at ? new Date(doc.expires_at) < new Date() : false
  const verified = !!doc && !expired

  if (!verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="text-red-600" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-red-600 mb-2">Not Verified</h1>
          <p className="text-gray-600 mb-6">
            {expired ? 'This verification has expired.' : 'This document could not be matched to our official records.'}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              The document may be forged, altered, or the verification link is invalid.
            </p>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <School size={20} />
              <span className="text-sm font-medium">Mannaplus Group of Schools</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Fetch student and class with separate simple queries
  let student: any = null
  let cls: any = null

  if (doc?.student_id) {
    const { data: s } = await supabaseAdmin
      .from('students')
      .select('id, full_name, admission_number, class_id')
      .eq('id', doc.student_id)
      .maybeSingle()
    student = s || null

    if (student?.class_id) {
      const { data: c } = await supabaseAdmin
        .from('classes')
        .select('class_name, arm, department')
        .eq('id', student.class_id)
        .maybeSingle()
      cls = c || null
    }
  }

  const metadata = (doc?.metadata || {}) as Record<string, any>

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <School className="text-green-600" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mannaplus Group of Schools</h1>
                <p className="text-sm text-gray-600">Official Document Verification</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Checked on</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-white" size={40} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-900 mb-1">VERIFIED ✓</h2>
                <p className="text-green-800">This document is genuine and matches our official records.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Document Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Student Name</p>
                  <p className="text-base font-bold text-gray-900">{student?.full_name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Admission Number</p>
                  <p className="text-base font-bold text-gray-900">{student?.admission_number || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Class</p>
                  <p className="text-base font-bold text-gray-900">
                    {cls ? `${cls.class_name} ${cls.arm ? `(${cls.arm})` : ''}`.trim() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Term / Session</p>
                  <p className="text-base font-bold text-gray-900">{doc.term || 'N/A'} • {doc.session || 'N/A'}</p>
                </div>
              </div>
            </div>

            {Object.keys(metadata).length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Recorded at Issue Time</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                  <p className="text-sm text-gray-700">
                    <strong>Document type:</strong> {String(doc.document_type).replace(/_/g, ' ')}
                  </p>
                  {Object.entries(metadata).map(([key, value]) => (
                    <p key={key} className="text-sm text-gray-700">
                      <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong> {String(value)}
                    </p>
                  ))}
                  <p className="text-xs text-gray-500 mt-2">
                    Document issued: {new Date(doc.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Verification performed on {new Date().toLocaleString()}</p>
          <p className="mt-2">For questions, contact the school administration.</p>
        </div>
      </div>
    </div>
  )
}