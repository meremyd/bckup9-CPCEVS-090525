"use client"
import LeftSide from "../../components/LeftSide"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import ChatSupportBtn from "../../components/ChatSupportBtn"
import Swal from "sweetalert2"
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
    if (!storedVoter) { 
      router.push("/pre-register")
      return 
    }
    setVoterInfo(JSON.parse(storedVoter))
  }, [router])

  const handleChange = (e) => { 
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("") 
  }

  const handleDone = async (e) => {
    e.preventDefault()
    
    if (form.password !== form.confirmPassword) { 
      setError('Passwords do not match')
      return 
    }
    
    if (form.password.length < 6) { 
      setError('Password must be at least 6 characters long')
      return 
    }
    
    setLoading(true)
    setError('')
    
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
      
      await Swal.fire({
        icon: 'success',
        title: 'Registration Complete!',
        text: 'Your registration has been completed successfully. You can now login.',
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Ok'
      })
      
      router.push('/voterlogin')
    } catch (err) { 
      setError(err.message || 'Registration failed')
      
      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: err.message || 'An error occurred during registration. Please try again.',
        confirmButtonColor: '#2563eb'
      })
    } finally { 
      setLoading(false) 
    }
  }

  const handleLogin = () => { 
    router.push('/voterlogin') 
  }

  if (!voterInfo) return <div>Loading...</div>

  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden overflow-y-auto">
        <LeftSide />
        <div className="w-full flex-grow bg-white flex flex-col items-center justify-center p-6 relative rounded-t-3xl -mt-3 md:mt-0 md:rounded-none md:w-3/5 md:h-screen xl:min-w-[600px] xl:-mt-10">
          <div className="text-center mb-6 -mt-1 md:mb-8 md:mt-10 lg:mb-10 lg:-mt-0 xl:mb-12">
            <div className="flex flex-row items-center justify-center w-full mb-2 xl:mt-10">
              <img src="/voteicon.png" alt="Fingerprint Icon" className="w-10 h-10 md:w-12 md:h-12 xl:w-14 xl:h-14 mr-3" />
              <h2 className="text-lg font-bold text-blue-700 md:text-xl lg:text-2xl xl:text-2xl m-0">Pre Registration</h2>
            </div>
            <p className="text-sm text-gray-600 md:text-base xl:text-base">Create a password to complete your registration</p>
          </div>

          <div className="w-full max-w-sm md:max-w-md xl:max-w-xl 2xl:max-w-2xl text-left mb-3">
            <span className="text-sm font-bold text-gray-800 md:text-base xl:text-lg">STEP 3</span>
            <div className="text-xs text-gray-600 mt-1 md:text-xs xl:text-sm">Welcome, {voterInfo.firstName} {voterInfo.lastName} (ID: {voterInfo.schoolId})</div>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm w-full max-w-sm md:max-w-md xl:max-w-xl">{error}</div>}

          <form className="w-full max-w-sm mb-4 md:max-w-md md:mb-6 xl:max-w-xl 2xl:max-w-2xl" onSubmit={handleDone}>
            <div className="mb-3 md:mb-4 xl:mb-5">
              <label className="block text-gray-700 text-sm mb-2 md:text-sm xl:text-base font-medium">Create a password *</label>
              <div className="relative flex items-center border border-gray-200 rounded-lg shadow-sm px-4 py-2 md:py-2 xl:py-3 2xl:px-5 2xl:py-3 bg-white">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password" 
                  value={form.password} 
                  onChange={handleChange} 
                  className="flex-1 bg-transparent outline-none text-gray-800 text-sm placeholder-gray-500 md:text-sm xl:text-base" 
                  placeholder="Enter your password"
                  required 
                  disabled={loading} 
                  minLength={6} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="ml-2 text-gray-500 hover:text-gray-700 text-sm"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="mb-4 md:mb-5 xl:mb-6">
              <label className="block text-gray-700 text-xs mb-2 md:text-sm xl:text-base font-medium">Confirm your password *</label>
              <div className="relative flex items-center border border-gray-300 rounded-full shadow-sm px-4 py-2 md:py-2 xl:py-3 2xl:px-5 2xl:py-4 bg-blue-50">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  name="confirmPassword" 
                  value={form.confirmPassword} 
                  onChange={handleChange} 
                  className="flex-1 bg-transparent outline-none text-gray-800 text-xs placeholder-gray-500 md:text-sm xl:text-base xl:ml-2 2xl:ml-4" 
                  placeholder="Re-enter your password"
                  required 
                  disabled={loading} 
                  minLength={6} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex flex-row justify-center gap-3 mt-8 lg:text-lg xl:mt-10 w-full">
              <button 
                type="button" 
                onClick={handleLogin} 
                disabled={loading} 
                className="flex-1 rounded-lg py-3 text-blue-700 bg-white border border-blue-200 font-semibold shadow-sm hover:bg-blue-50 transition xl:text-lg disabled:opacity-50"
              >
                Log In
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-1 rounded-lg py-3 text-white bg-blue-700 hover:bg-blue-800 font-semibold shadow-sm xl:text-lg ml-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Complete Registration'}
              </button>
            </div>
          </form>
          <ChatSupportBtn />
        </div>
      </div>
    </>
  )
}