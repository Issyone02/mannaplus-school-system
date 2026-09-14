'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, Loader2, PenLine } from 'lucide-react'
import toast from 'react-hot-toast'

interface SignatureUploadProps {
  currentUrl?: string | null
  label: string
  storagePath: string // e.g. 'signatures/teacher_ademola'
  onSaved: (url: string) => void
}

export default function SignatureUpload({ currentUrl, label, storagePath, onSaved }: SignatureUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (PNG with transparent background works best)')
      return
    }

    setUploading(true)
    try {
      const path = `${storagePath}_${Date.now()}.${file.name.split('.').pop()}`
      const { error } = await supabase.storage.from('school-assets').upload(path, file)
      if (error) throw error

      const { data } = supabase.storage.from('school-assets').getPublicUrl(path)
      setPreview(data.publicUrl)
      onSaved(data.publicUrl)
      toast.success(`${label} uploaded & saved!`)
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <PenLine size={18} /> {label}
      </h3>

      <div className="flex items-center gap-6 flex-wrap">
        {/* Preview box */}
        <div className="w-48 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
          {preview ? (
            <img src={preview} alt="Signature preview" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400 text-center px-2">No signature uploaded yet</span>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 cursor-pointer w-fit">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {preview ? 'Replace Image' : 'Upload Image'}
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
          <p className="text-xs text-gray-500">Tip: Use a PNG with transparent background for a clean look.</p>
        </div>
      </div>
    </div>
  )
}