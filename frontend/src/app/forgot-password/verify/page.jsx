"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LeftSide from '../../../components/LeftSide'
import { authAPI } from '@/lib/api/auth'

export default function VerifyOtp() {
  const router = useRouter()
  const [form, setForm] = useState({ otp: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If schoolId was stored we could try to find voterId via an API; for now user can paste voterId or we can extend API to return voterId in forgot-password response

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Send only the OTP; server will identify the voter by otpCode
  const resp = await authAPI.voterVerifyOtp({ otp: form.otp })
  if (resp && resp.voterId) localStorage.setItem('forgotVoterId', resp.voterId)
  router.push('/forgot-password/reset')
    } catch (err) {
      setError(err.message || 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <LeftSide />
      <div className="w-full flex-grow flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Verify OTP</h2>
          <p className="mb-6 text-gray-600">Enter the OTP sent to your email.</p>

          {error && <div className="mb-4 text-red-600">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input name="otp" value={form.otp} onChange={handleChange} placeholder="OTP" className="w-full p-3 border rounded" required />
            </div>
            <div className="flex space-x-2">
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Verifying...' : 'Verify OTP'}</button>
              <button type="button" onClick={() => router.push('/forgot-password')} className="px-4 py-2 border rounded">Back</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
