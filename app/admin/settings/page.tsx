'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SignatureUpload from '@/components/SignatureUpload'
import { Settings, Save, User } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function SchoolSettingsPage() {
  const [principalName, setPrincipalName] = useState('')
  const [principalSig, setPrincipalSig] = useState<string | null>(null)
  const [stampUrl, setStampUrl] = useState<string | null>(null)
  
  // ✅ Division-specific assets
  const [primaryLogo, setPrimaryLogo] = useState<string | null>(null)
  const [primaryStamp, setPrimaryStamp] = useState<string | null>(null)
  const [secondaryLogo, setSecondaryLogo] = useState<string | null>(null)
  const [secondaryStamp, setSecondaryStamp] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAssets = async () => {
      const { data } = await supabase.from('school_assets').select('*')
      ;(data || []).forEach((a: any) => {
        if (a.asset_type === 'principal_signature') {
          setPrincipalSig(a.url)
          setPrincipalName(a.holder_name || '')
        }
        if (a.asset_type === 'school_stamp') setStampUrl(a.url)
        if (a.asset_type === 'primary_logo') setPrimaryLogo(a.url)
        if (a.asset_type === 'primary_stamp') setPrimaryStamp(a.url)
        if (a.asset_type === 'secondary_logo') setSecondaryLogo(a.url)
        if (a.asset_type === 'secondary_stamp') setSecondaryStamp(a.url)
      })
      setLoading(false)
    }
    fetchAssets()
  }, [])

  const saveAsset = async (assetType: string, url: string, holderName?: string) => {
    const { error } = await supabase
      .from('school_assets')
      .upsert(
        { asset_type: assetType, url, holder_name: holderName ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'asset_type' }
      )
    if (error) toast.error('Failed to save: ' + error.message)
  }

  if (loading) {
    return <div className="p-8 text-gray-900 font-bold">Loading settings...</div>
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
            <div className="mb-6 text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2"><Settings size={28} /> School Settings</h1>
        <p className="text-gray-700">Manage the official stamp and head teacher's signature used on all report cards.</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Head Teacher Signature */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-center md:justify-start gap-2"><User size={18} /> Head Teacher's Name</h3>
                    <div className="flex gap-3 mb-4 flex-wrap justify-center md:justify-start">
            <input
              type="text"
              value={principalName}
              onChange={(e) => setPrincipalName(e.target.value)}
              placeholder="Current Head Teacher's name (e.g. Mrs. A. Bello)"
              className="w-full md:w-auto md:flex-1 p-2 border rounded text-gray-900"
            />
            <button
              onClick={() => { if (principalSig) saveAsset('principal_signature', principalSig, principalName); else toast.error('Upload the signature first'); }}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 w-full md:w-auto"
            >
              <Save size={16} /> Update Name
            </button>
          </div>
          <SignatureUpload
            currentUrl={principalSig}
            label="Head Teacher's Signature"
            storagePath="assets/principal_signature"
            onSaved={(url) => { setPrincipalSig(url); saveAsset('principal_signature', url, principalName); }}
          />
                    {principalName && <p className="text-xs text-gray-500 mt-2 text-center md:text-left">Current holder: <strong>{principalName}</strong>. When a new head teacher takes over, upload their signature and update the name — all new report cards will use it automatically.</p>}
        </div>

        {/* Generic School Stamp (Fallback) */}
        <SignatureUpload
          currentUrl={stampUrl}
          label="Official School Stamp (Fallback)"
          storagePath="assets/school_stamp"
          onSaved={(url) => { setStampUrl(url); saveAsset('school_stamp', url); }}
        />

        {/* ✅ PRIMARY DIVISION BRANDING */}
        <div className="bg-blue-50 rounded-lg shadow p-4 md:p-6 border-2 border-blue-200">
          <h3 className="font-bold text-blue-900 mb-4 flex items-center justify-center md:justify-start gap-2 text-lg">
            🎨 Primary Division Branding
          </h3>
          <p className="text-sm text-blue-700 mb-4 text-center md:text-left">
            Used for: <strong>Nursery, KG, Prep, Basic 1-6</strong>
          </p>
          
          <div className="space-y-4">
            <SignatureUpload
              currentUrl={primaryLogo}
              label="Primary School Logo"
              storagePath="assets/primary_logo"
              onSaved={(url) => { setPrimaryLogo(url); saveAsset('primary_logo', url); }}
            />
            
            <SignatureUpload
              currentUrl={primaryStamp}
              label="Primary School Stamp"
              storagePath="assets/primary_stamp"
              onSaved={(url) => { setPrimaryStamp(url); saveAsset('primary_stamp', url); }}
            />
          </div>
        </div>

        {/* ✅ SECONDARY DIVISION BRANDING */}
        <div className="bg-green-50 rounded-lg shadow p-4 md:p-6 border-2 border-green-200">
          <h3 className="font-bold text-green-900 mb-4 flex items-center justify-center md:justify-start gap-2 text-lg">
            🎨 Secondary Division Branding
          </h3>
          <p className="text-sm text-green-700 mb-4 text-center md:text-left">
            Used for: <strong>JSS 1-3, SS 1-3</strong>
          </p>
          
          <div className="space-y-4">
            <SignatureUpload
              currentUrl={secondaryLogo}
              label="Secondary School Logo"
              storagePath="assets/secondary_logo"
              onSaved={(url) => { setSecondaryLogo(url); saveAsset('secondary_logo', url); }}
            />
            
            <SignatureUpload
              currentUrl={secondaryStamp}
              label="Secondary School Stamp"
              storagePath="assets/secondary_stamp"
              onSaved={(url) => { setSecondaryStamp(url); saveAsset('secondary_stamp', url); }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}