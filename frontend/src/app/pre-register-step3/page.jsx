"use client"
import LeftSide from "../../components/LeftSide"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import ChatSupportBtn from "../../components/ChatSupportBtn"
import { authAPI } from '@/lib/api/auth'

export default function PreRegisterStep3() {
  const router = useRouter()
  const [form, setForm] = useState({ password: "", confirmPassword: "" })
  const [voterInfo, setVoterInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const storedVoter = localStorage.getItem("preRegisterVoter")
    if (!storedVoter) { router.push("/pre-register"); return }
    setVoterInfo(JSON.parse(storedVoter))
  }, [router])

  const handleChange = (e) => {
    const {name, value} = e.target;
    const newValue = value.replace(/\s/g, '');
    setForm({ ...form, [name]: newValue });
    }

  // Facial registration has been removed; registration will proceed without selfie capture.

  const handleDone = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters long'); return }
    setLoading(true); setError('')
    try {
      await authAPI.preRegisterStep3({
        voterId: voterInfo.id,
        password: form.password,
        confirmPassword: form.confirmPassword,
        firstName: voterInfo.firstName,
        middleName: voterInfo.middleName,
        lastName: voterInfo.lastName,
        schoolId: voterInfo.schoolId
      })
      localStorage.removeItem('preRegisterVoter')
      // show confirmation and redirect
      alert('Registration completed successfully! You can now login.')
      router.push('/voterlogin')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => { router.push('/voterlogin') }

  if (!voterInfo) return <div>Loading...</div>

  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden overflow-y-auto">
        <LeftSide />

        <div className="w-full flex-grow bg-white flex flex-col items-center justify-center p-6 relative rounded-t-2xl -mt-3 md:mt-0 md:rounded-none md:w-3/5 md:h-screen md:p-9 xl:gap-y-20">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-white/20 p-6 md:p-10">
            <div className="text-center mb-4">
              <div className="flex flex-row items-center justify-center w-full mb-2">
                <img src="/voteicon.png" alt="Fingerprint Icon" className="w-10 h-10 md:w-12 md:h-12 mr-3" />
                <h2 className="font-semibold text-[#001f65] mb-0 text-[clamp(1rem,3.2vw,1.5rem)]">Pre Registration</h2>
              </div>
              <p className="text-[#123b7a]/80 text-sm md:text-base">Create a password to complete your registration</p>
            </div>

            <div className="w-full text-left mb-3">
              <span className="text-sm font-bold text-gray-800 md:text-base">STEP 3</span>
              <div className="text-xs text-gray-600 mt-1 md:text-sm">Welcome, {voterInfo.firstName} {voterInfo.lastName} (ID: {voterInfo.schoolId})</div>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm w-full">{error}</div>}

            <form className="w-full" onSubmit={handleDone}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#123b7a] mb-2">Create a password *</label>
                <div className="relative flex items-center border border-gray-200 focus:outline-blue-500 rounded-lg shadow-sm px-4 py-2 bg-white">
                  <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} className="flex-1 bg-transparent outline-none text-gray-800 text-sm placeholder-gray-500" required disabled={loading} minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="ml-2 text-gray-500 hover:text-gray-700 text-sm">{showPassword ? 'Hide' : 'Show'}</button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#123b7a] mb-2">Confirm your password *</label>
                <div className="relative flex items-center border border-gray-200 rounded-lg shadow-sm px-4 py-2 bg-white">
                  <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className="flex-1 bg-transparent outline-none text-gray-800 text-sm placeholder-gray-500" required disabled={loading} minLength={6} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="ml-2 text-gray-500 hover:text-gray-700">{showConfirmPassword ? 'Hide' : 'Show'}</button>
                </div>
              </div>

              <div className="flex flex-row justify-center gap-3 mt-6">
                <button type="button" onClick={handleLogin} disabled={loading} className="flex-1 rounded-lg py-3 text-[#001f65] bg-white border border-gray-200 font-semibold shadow-sm hover:bg-gray-50 transition disabled:opacity-50">Log In</button>
                <button type="submit" disabled={loading} className="flex-1 rounded-lg py-3 text-white bg-blue-500 hover:bg-blue-700 font-semibold shadow-sm ml-0 disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Processing...' : 'Complete Registration'}</button>
              </div>
            </form>

            <div className="mt-6">
              <ChatSupportBtn />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}