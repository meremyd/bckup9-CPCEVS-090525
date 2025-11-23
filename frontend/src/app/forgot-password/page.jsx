"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LeftSide from '../../components/LeftSide'
import { authAPI } from '@/lib/api/auth'

export default function ForgotPassword() {
  const router = useRouter()
  const [form, setForm] = useState({ schoolId: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
  const resp = await authAPI.voterForgotPassword({ schoolId: form.schoolId, email: form.email })
  // Save schoolId and returned voterId locally so verify page can reference it
  localStorage.setItem('forgotSchoolId', form.schoolId)
  if (resp && resp.voterId) localStorage.setItem('forgotVoterId', resp.voterId)
  router.push('/forgot-password/verify')
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden overflow-y-auto">
      <LeftSide />

      {/* Right side - form */}
      <div className="w-full flex-grow bg-white flex flex-col items-center justify-center p-6 relative rounded-t-2xl -mt-3 md:mt-0 md:rounded-none md:w-3/5 md:h-screen md:p-9 xl:gap-y-20">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-white/20 p-6 md:p-10">
          <h2 className="font-semibold text-[#001f65] mb-2 text-[clamp(1.25rem,3.5vw,1.75rem)]">Forgot Password</h2>
          <p className="mb-6 text-[#123b7a]/80 text-sm md:text-base">Enter your School ID and your registered email to receive an OTP to reset your password.</p>

          {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="schoolId" className="block text-sm font-medium text-[#123b7a] mb-1">School ID</label>
              <input maxLength={8} id="schoolId" name="schoolId" value={form.schoolId} onChange={handleChange} placeholder="e.g. 20250001" className="w-full p-3 md:p-4 border border-gray-200 rounded-lg  focus:outline-blue-500" required />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#123b7a] mb-1">Registered Email</label>
              <input id="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" type="email" className="w-full p-3 md:p-4 border border-gray-200 rounded-lg focus:outline-blue-500" required />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button type="submit" disabled={loading} className="w-full sm:w-auto px-5 py-3 bg-blue-500 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition">
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
              <button type="button" onClick={() => router.push('/voterlogin')} className="w-full sm:w-auto px-5 py-3 border border-gray-200 rounded-lg text-[#001f65] bg-white hover:bg-gray-50 transition">Back to Login</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
