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
    <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden overflow-y-auto">
      <LeftSide />

      <div className="w-full flex-grow bg-white flex flex-col items-center justify-center p-6 relative rounded-t-2xl -mt-3 md:mt-0 md:rounded-none md:w-3/5 md:h-screen md:p-9 xl:gap-y-20">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-white/20 p-6 md:p-10">
          <h2 className="font-semibold text-blue-900 mb-2 text-[clamp(1.25rem,3.5vw,1.75rem)]">Verify OTP</h2>
          <p className="mb-6 text-[#123b7a]/80 text-sm md:text-base">Enter the OTP sent to your email.</p>

          {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-[#123b7a] mb-1">OTP</label>
              <input id="otp" name="otp" value={form.otp} onChange={handleChange} placeholder="Enter the OTP" className="w-full p-3 md:p-4 border border-gray-200 rounded-lg focus:outline-blue-500" required />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button type="submit" disabled={loading} className="w-full sm:w-auto px-5 py-3 bg-blue-500 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button type="button" onClick={() => router.push('/forgot-password')} className="w-full sm:w-auto px-5 py-3 border border-gray-200 rounded-lg text-[#001f65] bg-white hover:bg-gray-50 transition">Back</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
