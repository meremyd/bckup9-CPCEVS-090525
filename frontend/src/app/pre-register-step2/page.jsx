"use client"
import LeftSide from "../../components/LeftSide"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import ChatSupportBtn from "../../components/ChatSupportBtn"
import { authAPI } from '@/lib/api/auth'

export default function PreRegisterStep2() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [voterInfo, setVoterInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")

  useEffect(() => {
    const storedVoter = localStorage.getItem("preRegisterVoter")
    if (!storedVoter) {
      router.push("/pre-register")
      return
    }
    const voter = JSON.parse(storedVoter)
    setVoterInfo(voter)
    setEmail(voter.email || "")
  }, [router])

  const sendOtp = async (e) => {
    e.preventDefault()
    if (!voterInfo) return
    setLoading(true)
    setError("")
    try {
      await authAPI.preRegisterStep2({ voterId: voterInfo.id, email })
      setOtpSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verify = async (e) => {
    e.preventDefault()
    if (!voterInfo) return
    setLoading(true)
    setError("")
    try {
      await authAPI.verifyOtp({ voterId: voterInfo.id, otp })
      // proceed to step 3
      router.push('/pre-register-step3')
    } catch (err) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  if (!voterInfo) return <div>Loading...</div>

  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden overflow-y-auto">
        <LeftSide />

        <div className="w-full flex-grow bg-white flex flex-col items-center justify-center p-6 relative rounded-t-2xl -mt-3 md:mt-0 md:rounded-none md:w-3/5 md:h-screen md:p-9 xl:gap-y-20">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-white/20 p-6 md:p-10">
            <div className="text-center mb-4">
              <div className="flex flex-row items-center justify-center w-full mb-2">
                <img src="/voteicon.png" alt="Vote Icon" className="w-10 h-10 md:w-12 md:h-12 mr-3" />
                <h2 className="font-semibold text-[#001f65] mb-0 text-[clamp(1rem,3.2vw,1.5rem)]">Pre Registration</h2>
              </div>
              <p className="text-[#123b7a]/80 text-sm md:text-base">Enter your email to receive an OTP to continue</p>
            </div>

            <div className="w-full text-left mb-3">
              <span className="text-sm font-bold text-gray-800 md:text-base">STEP 2</span>
              <div className="text-xs text-gray-600 mt-1 md:text-sm">Welcome, {voterInfo.firstName} {voterInfo.lastName} (ID: {voterInfo.schoolId})</div>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm w-full">{error}</div>}

            {!otpSent ? (
              <form className="w-full" onSubmit={sendOtp}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#123b7a] mb-2">Email *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-blue-500" />
                </div>
                <div className="flex space-x-2">
                  <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-700 text-white rounded-lg font-semibold">{loading ? 'Sending...' : 'Send OTP'}</button>
                  <button type="button" onClick={() => router.push('/pre-register')} className="px-4 py-3 border border-gray-200 rounded-lg">Back</button>
                </div>
              </form>
            ) : (
              <form className="w-full" onSubmit={verify}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#123b7a] mb-2">Enter OTP *</label>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required className="w-full px-4 py-3 border border-gray-200  focus:outline-blue-500 rounded-lg text-lg tracking-widest text-center" />
                </div>
                <div className="flex space-x-2">
                  <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-700 text-white rounded-lg font-semibold">{loading ? 'Verifying...' : 'Verify OTP'}</button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!voterInfo) return
                      setLoading(true); setError("")
                      try {
                        await authAPI.resendOtp({ voterId: voterInfo.id })
                        setError('OTP resent to your email')
                      } catch (err) {
                        setError(err.message || 'Failed to resend OTP')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    className="px-4 py-3 border border-gray-200 rounded-lg"
                  >
                    Resend
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6">
              <ChatSupportBtn />
            </div>
          </div>
        </div>
      </div>

    </>
  )
}
