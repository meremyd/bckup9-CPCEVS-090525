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
    <div className="min-h-screen flex flex-col md:flex-row">
      <LeftSide />
      <div className="w-full flex-grow flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
          <p className="mb-6 text-gray-600">Enter your School ID and your registered email to receive an OTP to reset your password.</p>

          {error && <div className="mb-4 text-red-600">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input name="schoolId" value={form.schoolId} onChange={handleChange} placeholder="School ID" className="w-full p-3 border rounded" maxLength={8} required />
            </div>
            <div className="mb-4">
              <input name="email" value={form.email} onChange={handleChange} placeholder="Registered Email" className="w-full p-3 border rounded" required />
            </div>
            <div className="flex space-x-2">
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Sending...' : 'Send OTP'}</button>
              <button type="button" onClick={() => router.push('/voterlogin')} className="px-4 py-2 border rounded">Back to Login</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
