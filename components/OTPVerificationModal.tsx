'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { X, Mail, Shield, CheckCircle, Key } from 'lucide-react'
import toast from 'react-hot-toast'

interface OTPVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  purpose: string
}

export default function OTPVerificationModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  purpose 
}: OTPVerificationModalProps) {
  const { user } = useUser()
  const [step, setStep] = useState<'send' | 'verify'>('send')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugOtp, setDebugOtp] = useState('')

  const handleSendOTP = async () => {
  setLoading(true)
  try {
    const userEmail = user?.primaryEmailAddress?.emailAddress
    
    if (!userEmail) {
      throw new Error('No email address found')
    }

    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        purpose,
        userEmail 
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('API Error:', data)
      throw new Error(data.error || `Server error: ${response.status}`)
    }

    if (data.debug_otp) {
      setDebugOtp(data.debug_otp)
      console.log('🔐 Debug OTP:', data.debug_otp)
    }

    setStep('verify')
    toast.success(`OTP sent to ${userEmail}`)
  } catch (error: any) {
    console.error('Error sending OTP:', error)
    toast.error('Failed to send OTP: ' + error.message)
  } finally {
    setLoading(false)
  }
}

  const handleVerifyOTP = async () => {
  if (!otp || otp.length !== 6) {
    toast.error('Please enter the complete 6-digit OTP')
    return
  }

  setLoading(true)
  try {
    const userEmail = user?.primaryEmailAddress?.emailAddress
    
    if (!userEmail) {
      throw new Error('No email address found')
    }

    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        otp, 
        purpose,
        userEmail 
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Verification Error:', data)
      throw new Error(data.error || `Server error: ${response.status}`)
    }

    toast.success('OTP verified successfully!')
    onSuccess()
    handleClose()
  } catch (error: any) {
    console.error('Error verifying OTP:', error)
    toast.error('Invalid OTP. Please try again.')
  } finally {
    setLoading(false)
  }
}

  const handleClose = () => {
    setStep('send')
    setOtp('')
    setDebugOtp('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'send' ? 'Verify Admin Identity' : 'Enter OTP Code'}
          </h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {step === 'send' ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">Security Verification Required</h3>
                  <p className="text-sm text-blue-800">
                    You are about to modify locked attendance records. This action will be permanently logged in the audit trail.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2"><strong>Purpose:</strong></p>
              <p className="text-sm text-gray-900 italic">{purpose}</p>
            </div>

            <div className="flex items-center gap-3 text-gray-700">
              <Mail size={20} className="text-gray-500" />
              <span className="text-sm">OTP will be sent to: <strong>{user?.primaryEmailAddress?.emailAddress}</strong></span>
            </div>

            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending OTP...' : 'Send OTP to My Email'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                <div>
                  <h3 className="font-bold text-green-900">OTP Sent Successfully</h3>
                  <p className="text-sm text-green-800">
                    Check your email for the 6-digit verification code
                  </p>
                </div>
              </div>
            </div>

            {/* ⚠️ REMOVE THIS IN PRODUCTION - Debug display */}
            {debugOtp && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                <p className="text-xs text-yellow-800 font-bold">⚠️ DEBUG MODE - OTP:</p>
                <p className="text-2xl font-mono text-yellow-900 text-center">{debugOtp}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Enter 6-Digit OTP Code
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('send')}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Unlock'}
              </button>
            </div>

            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full text-sm text-blue-600 hover:text-blue-800 font-bold"
            >
              Resend OTP
            </button>
          </div>
        )}
      </div>
    </div>
  )
}