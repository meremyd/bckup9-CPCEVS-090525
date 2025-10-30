"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LeftSide from '../../../components/LeftSide'
import { authAPI } from '@/lib/api/auth'

export default function ResetPassword() {
  const router = useRouter()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [voterId, setVoterId] = useState('')

  useEffect(() => {
    const id = localStorage.getItem('forgotVoterId')
    if (!id) {
      router.push('/forgot-password')
    } else {
      setVoterId(id)
    }
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authAPI.voterResetPassword({ voterId, password: form.password, confirmPassword: form.confirmPassword })
      // Clear stored data and redirect to login
      localStorage.removeItem('forgotVoterId')
      localStorage.removeItem('forgotSchoolId')
      alert('Password reset successful. You can now login with your new password.')
      router.push('/voterlogin')
    } catch (err) {
      setError(err.message || 'Password reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <LeftSide />
      <div className="w-full flex-grow flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
          <p className="mb-6 text-gray-600">Enter your new password.</p>

          {error && <div className="mb-4 text-red-600">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="New password" className="w-full p-3 border rounded" required />
            </div>
            <div className="mb-4">
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm password" className="w-full p-3 border rounded" required />
            </div>
            <div className="flex space-x-2">
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Resetting...' : 'Reset Password'}</button>
              <button type="button" onClick={() => router.push('/forgot-password/verify')} className="px-4 py-2 border rounded">Back</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
