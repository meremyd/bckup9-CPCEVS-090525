"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LeftSide from '../../../components/LeftSide'
import { authAPI } from '@/lib/api/auth'
import Swal from 'sweetalert2'

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
    const { name, value } = e.target
    const newValue = value.replace(/\s/g, '');
    setForm({ ...form, [e.target.name]: newValue });
    setError('');
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authAPI.voterResetPassword({ voterId, password: form.password, confirmPassword: form.confirmPassword })
      // Clear stored data
      localStorage.removeItem('forgotVoterId')
      localStorage.removeItem('forgotSchoolId')
      // Show friendly confirmation then redirect to login
      await Swal.fire({
        icon: 'success',
        title: 'Password reset',
        text: 'Your password was reset successfully. You can now log in with your new password.',
        confirmButtonColor: '#001f65'
      })
      router.push('/voterlogin')
    } catch (err) {
      setError(err.message || 'Password reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden overflow-y-auto">
      <LeftSide />

      <div className="w-full flex-grow bg-white flex flex-col items-center justify-center p-6 relative rounded-t-2xl -mt-3 md:mt-0 md:rounded-none md:w-3/5 md:h-screen md:p-9 xl:gap-y-20">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-white/20 p-6 md:p-10">
          <h2 className="font-semibold text-blue-900 mb-2 text-[clamp(1.25rem,3.5vw,1.75rem)]">Reset Password</h2>
          <p className="mb-6 text-[#123b7a]/80 text-sm md:text-base">Enter your new password.</p>

          {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#123b7a] mb-1">New password</label>
              <input id="password" type="password" name="password" value={form.password} onChange={handleChange} placeholder="New password" className="w-full p-3 md:p-4 border border-gray-200 rounded-lg focus:outline-blue-500 " required />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#123b7a] mb-1">Confirm password</label>
              <input id="confirmPassword" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm password" className="w-full p-3 md:p-4 border border-gray-200 rounded-lg focus:outline-blue-500" required />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button type="submit" disabled={loading} className="w-full sm:w-auto px-5 py-3 bg-blue-500 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => router.push('/forgot-password/verify')} className="w-full sm:w-auto px-5 py-3 border border-gray-200 rounded-lg text-[#001f65] bg-white hover:bg-gray-50 transition">Back</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
