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

  const handlePreRegister = () => router.push("/pre-register")

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
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

      if (data.otpRequired) {
        setPendingVoterId(data.voterId)
        setOtpModalVisible(true)
        return
      }

      localStorage.setItem("voterToken", data.token)
      localStorage.setItem("voter", JSON.stringify(data.user))
      router.push(data.redirectTo || "/voter/dashboard")
    } catch (error) {
      console.error("Voter login error:", error)

      let errorMessage = "Login failed. Please try again."

      if (error.message) {
        if (error.message.includes("Invalid credentials")) {
          errorMessage = "Invalid School ID or password."
        } else if (error.message.includes("Too many")) {
          errorMessage = "Too many login attempts. Please wait 15 minutes."
        } else if (error.message.includes("not found")) {
          errorMessage = "School ID not found."
        } else if (error.message.includes("not activated")) {
          errorMessage = "Account not activated. Complete pre-registration first."
        } else if (error.message.includes("Network Error")) {
          errorMessage = "Connection error. Check your internet."
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
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      <LeftSide />

      <div className="w-full flex-grow bg-white flex flex-col items-center justify-center p-6 lg:p-1 relative rounded-t-2xl md:rounded-none -mt-3 md:mt-0 md:w-3/5 lg:w-2/3 xl:w-3/5  
        "
      >
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 lg:mb-14 xl:mb-16 mt-2 md:mt-6 lg:mt-8">
          <div className="flex flex-row items-center justify-center w-full mb-2">
            <Image
              src="/voteicon.png"
              alt="Vote Icon"
              width={48}
              height={48}
              className="mr-3 w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16"
            />
            <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-blue-900">
              Welcome
            </h2>
          </div>
          <p className="text-base md:text-lg lg:text-xl xl:text-2xl text-gray-600">
            Please login to your account
          </p>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mb-6">
          <form className="w-full" onSubmit={handleSubmit}>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="ml-3 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* USER ID */}
            <div className="w-full mb-4">
              <label
                htmlFor="userId"
                className="block text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-medium text-gray-600 mb-1"
              >
                School ID
              </label>

              <div className="
                relative flex items-center border border-gray-300 rounded-lg shadow-sm 
                px-4 py-2 md:py-3 lg:py-4 xl:py-5 bg-white
                focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500
              ">
                <Image src="/user.png" alt="User Icon" width={20} height={20} className="mr-3" />

                <input
                  type="text"
                  name="userId"
                  id="userId"
                  placeholder="Enter your School ID"
                  maxLength="8"
                  value={form.userId}
                  onChange={handleChange}
                  className="flex-1 bg-transparent outline-none text-base md:text-lg lg:text-xl xl:text-2xl placeholder-gray-500"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>


            {/* PASSWORD */}
            <div className="w-full mb-2">
              <label 
                htmlFor="password" 
                className="block text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-medium text-gray-600 mb-1"
              >
                Password
              </label>

              <div className="
                relative flex items-center border border-gray-300 rounded-lg shadow-sm 
                px-4 py-2 md:py-3 lg:py-4 xl:py-5 bg-white
                focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500
              ">
                <Image src="/lock.png" alt="Password Icon" width={20} height={20} className="mr-3" />

                <input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  className="flex-1 bg-transparent outline-none text-base md:text-lg lg:text-xl xl:text-2xl placeholder-gray-500"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Forgot Password */}
            <div className="w-full text-right mt-2">
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Buttons */}
            <div className="flex flex-row justify-center w-full mt-8 lg:mt-10 gap-3">
              <button
                type="submit"
                disabled={isLoading || !form.userId.trim() || !form.password.trim()}
                className="
                  flex-1 cursor-pointer bg-blue-600 rounded-lg px-7 py-2 md:px-8 md:py-3 
                  lg:px-9 lg:py-4 xl:px-10 xl:py-5
                  text-white font-bold shadow-md 
                  text-base md:text-lg lg:text-xl xl:text-2xl
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:bg-blue-700 transition duration-200
                "
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </div>
                ) : "Log In"}
              </button>

              <button
                type="button"
                onClick={handlePreRegister}
                disabled={isLoading}
                className="
                  flex-1 cursor-pointer bg-white border border-blue-600 rounded-lg
                  px-7 py-2 md:px-8 md:py-3 lg:px-9 lg:py-4 xl:px-10 xl:py-5
                  text-blue-600 font-bold shadow-md 
                  text-base md:text-lg lg:text-xl xl:text-2xl
                  hover:bg-blue-50 transition duration-200
                "
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
