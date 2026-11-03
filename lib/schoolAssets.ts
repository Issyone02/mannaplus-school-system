import { supabase } from './supabase'

// Fetch all school assets (signatures, stamps, logos for both divisions)
export async function getSchoolAssets(): Promise<Record<string, { url: string; holder_name: string | null }>> {
  const { data } = await supabase.from('school_assets').select('asset_type, url, holder_name')
  const map: any = {}
  ;(data || []).forEach((a: any) => { map[a.asset_type] = a })
  return map
}

// ✅ Determine which division a class belongs to and return appropriate branding
export function getBrandingForClass(
  className: string,
  assets: Record<string, { url: string; holder_name: string | null }>
): { logoUrl: string | null; stampUrl: string | null } {
  const lowerName = (className || '').toLowerCase()
  
  // Primary division: Nursery, KG, Prep, Basic 1-6
  const isPrimary = 
    lowerName.includes('nursery') ||
    lowerName.includes('kg') ||
    lowerName.includes('prep') ||
    lowerName.includes('basic') ||
    lowerName.includes('primary')
  
  if (isPrimary) {
    return {
      logoUrl: assets.primary_logo?.url || assets.school_logo?.url || null,
      stampUrl: assets.primary_stamp?.url || assets.school_stamp?.url || null,
    }
  }
  
  // Secondary division: JSS 1-3, SS 1-3
  return {
    logoUrl: assets.secondary_logo?.url || assets.school_logo?.url || null,
    stampUrl: assets.secondary_stamp?.url || assets.school_stamp?.url || null,
  }
}

// Fetch the form teacher's signature for a given class
export async function getClassTeacherSignature(classId: string): Promise<string | null> {
  // 1) Form teacher
  const { data } = await supabase
    .from('teachers')
    .select('signature_url')
    .eq('form_class_id', classId)
    .maybeSingle()
  if (data?.signature_url) return data.signature_url

  // 2) Fallback: any teacher assigned to this class with a signature
  const { data: assignment } = await supabase
    .from('teacher_assignments')
    .select('teacher_id')
    .eq('class_id', classId)
  if (assignment && assignment.length > 0) {
    for (const a of assignment) {
      const { data: t } = await supabase
        .from('teachers')
        .select('signature_url')
        .eq('id', a.teacher_id)
        .single()
      if (t?.signature_url) return t.signature_url
    }
  }
  return null
}