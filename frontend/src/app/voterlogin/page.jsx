"use client"
import LeftSide from "../../components/LeftSide"
import { useRouter } from "next/navigation"
import Image from "next/image"
import ChatSupportBtn from "../../components/ChatSupportBtn"
import { useState } from "react"
import { authAPI } from '@/lib/api/auth'
import OtpModal from '@/components/OtpModal'

export default function VoterLogin() {
  const router = useRouter()
  const [form, setForm] = useState({ userId: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [otpModalVisible, setOtpModalVisible] = useState(false)
  const [pendingVoterId, setPendingVoterId] = useState(null)

  const handlePreRegister = () => {
    router.push("/pre-register")
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("") // Clear error when user types
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const data = await authAPI.voterLogin({
        userId: form.userId,
        password: form.password,
      })
      // If backend requires OTP, open modal and wait for verification
      if (data.otpRequired) {
        setPendingVoterId(data.voterId)
        setOtpModalVisible(true)
        return
      }

      // Otherwise backend returned token immediately
      localStorage.setItem("voterToken", data.token) // Use voterToken for voters
      localStorage.setItem("voter", JSON.stringify(data.user))
      router.push(data.redirectTo || "/voter/dashboard")
    } catch (error) {
      console.error("Voter login error:", error)
      
      // Enhanced error handling with user-friendly messages
      let errorMessage = "Login failed. Please try again."
      
      if (error.message) {
        if (error.message.includes("Invalid credentials")) {
          errorMessage = "Invalid School ID or password. Please check your credentials and try again."
        } else if (error.message.includes("Too many")) {
          errorMessage = "Too many login attempts. Please wait 15 minutes before trying again."
        } else if (error.message.includes("Student not found") || error.message.includes("not found")) {
          errorMessage = "School ID not found. Please check your School ID or contact support if you believe this is an error."
        } else if (error.message.includes("Account not activated") || error.message.includes("not activated")) {
          errorMessage = "Your account is not yet activated. Please complete the pre-registration process first."
        } else if (error.message.includes("Network Error")) {
          errorMessage = "Connection error. Please check your internet connection and try again."
        } else if (error.message.includes("Invalid School ID format")) {
          errorMessage = "Please enter a valid School ID format."
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async ({ voterId, otp }) => {
    try {
      const data = await authAPI.voterLoginVerifyOtp({ voterId, otp })
      // store token and proceed
      localStorage.setItem("voterToken", data.token)
      localStorage.setItem("voter", JSON.stringify(data.user))
      setOtpModalVisible(false)
      setPendingVoterId(null)
      router.push(data.redirectTo || "/voter/dashboard")
    } catch (err) {
      throw err
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden overflow-y-auto">
      <LeftSide />

      <div className="w-full flex-grow bg-white flex flex-col items-center justify-center p-6 relative rounded-t-3xl -mt-3 md:mt-0 md:rounded-none md:w-3/5 md:h-screen md:p-9 xl:gap-y-20">
        <div className="text-center mb-8 -mt-1 md:mb-10 md:mt-10 lg:mb-12 lg:-mt-0 xl:mb-16 xl:-mt-10">
          <div className="flex flex-row items-center justify-center w-full mb-2">
            <Image
              src="/voteicon.png"
              alt="Vote Icon"
              width={48}
              height={48}
              className="mr-3 w-10 h-10 md:w-12 md:h-12 xl:w-16 xl:h-16"
            />
            <h2 className="text-3xl font-extrabold text-blue-900 md:text-4xl mb-1 lg:text-5xl xl:text-7xl m-0">
              Welcome
            </h2>
          </div>
          <p className="text-base text-gray-600 md:text-lg xl:text-2xl">Please login to your account</p>
        </div>

        <div className="w-full max-w-sm mb-4 md:max-w-md md:mb-6 xl:max-w-2xl">
          <form className="w-full" onSubmit={handleSubmit}>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium leading-5">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="relative flex items-center mb-4 border border-gray-300 rounded-full shadow-sm px-4 py-2 md:mb-4 md:py-3 xl:py-5 xl:mb-8 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="text-gray-400 mr-3">
                <Image src="/user.png" alt="User Icon" width={20} height={20} />
              </span>
              <input
                type="text"
                name="userId"
                placeholder="Enter your School ID"
                maxLength="8"
                value={form.userId}
                onChange={handleChange}
                className="flex-1 bg-transparent outline-none text-gray-800 text-base placeholder-gray-500 md:text-lg xl:text-2xl xl:ml-2"
                required
                disabled={isLoading}
              />
            </div>

            <div className="relative flex items-center border border-gray-300 rounded-full shadow-sm px-4 py-2 md:py-3 xl:py-5 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="text-gray-400 mr-3">
                <Image src="/lock.png" alt="Password Icon" width={20} height={20} />
              </span>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                className="flex-1 bg-transparent outline-none text-gray-800 text-base placeholder-gray-500 md:text-lg xl:text-2xl xl:ml-2"
                required
                disabled={isLoading}
              />
            </div>

            <div className="w-full text-right mt-2">
              <button type="button" onClick={() => router.push('/forgot-password')} className="text-sm text-blue-600 hover:underline">Forgot password?</button>
            </div>

            <div className="mt-4" />

            <div className="flex flex-row justify-center space-x-0 mt-8 lg:text-2xl xl:text-2xl xl:mt-10 w-full">
              <button
                type="submit"
                disabled={isLoading || !form.userId.trim() || !form.password.trim()}
                className="flex-1 cursor-pointer bg-blue-600 rounded-full px-7 py-2 xl:px-9 xl:py-4 text-white font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </div>
                ) : (
                  "Log In"
                )}
              </button>
              <button
                type="button"
                onClick={handlePreRegister}
                disabled={isLoading}
                className="flex-1 cursor-pointer bg-white rounded-full px-7 py-2 xl:px-9 xl:py-4 text-blue-600 font-bold border border-blue-600 shadow-md ml-2 disabled:opacity-50 hover:bg-blue-50 transition duration-200"
              >
                Pre Register
              </button>
            </div>
          </form>
        </div>

        <OtpModal
          visible={otpModalVisible}
          onClose={() => { setOtpModalVisible(false); setPendingVoterId(null) }}
          onSubmit={handleVerifyOtp}
          initialVoterId={pendingVoterId}
        />

        <ChatSupportBtn />
      </div>
    </div>
  )
}