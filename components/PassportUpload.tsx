'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface PassportUploadProps {
  currentUrl?: string | null
  onUrlChange: (url: string | null) => void
}

export default function PassportUpload({ currentUrl, onUrlChange }: PassportUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { getToken } = useAuth()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ✅ Client-side validation
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Only JPG and PNG files are allowed')
      return
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)

    try {
      // ✅ Get Clerk token
      const token = await getToken()
      
      if (!token) {
        throw new Error('Not authenticated. Please sign in again.')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-passport', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // ✅ Send token in header
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      onUrlChange(data.url)
      toast.success('Passport photo uploaded successfully!')
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload image')
      setPreview(currentUrl || null) // Revert on error
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = '' // Reset input
      }
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUrlChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700">Passport Photograph</label>
      <p className="text-xs text-gray-500">Max size: 2MB. Formats: JPG, PNG.</p>
      
      <div className="flex items-center gap-4">
        {/* Preview Area */}
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
          {preview ? (
            <img src={preview} alt="Passport preview" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="text-gray-300" size={32} />
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg, image/png, image/jpg"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Choose Photo'}
          </button>
          
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X size={16} />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}