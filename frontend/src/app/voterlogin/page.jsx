"use client"
import LeftSide from "../../components/LeftSide"
import { useRouter } from "next/navigation"
import Image from "next/image"
import ChatSupportBtn from "../../components/ChatSupportBtn"
import { useState } from "react"

export default function VoterLogin() {
  const router = useRouter()
  const [form, setForm] = useState({ userId: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

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
      const response = await fetch("http://localhost:5000/api/auth/voter-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: form.userId,
          password: form.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store user data in localStorage
        localStorage.setItem("user", JSON.stringify(data.user))
        localStorage.setItem("token", data.token)

        router.push(data.redirectTo || "/voter/dashboard")
      } else {
        setError(data.message || "Login failed")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
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
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <div className="relative flex items-center mb-4 border border-gray-300 rounded-full shadow-sm px-4 py-2 md:mb-4 md:py-3 xl:py-5 xl:mb-8 bg-white">
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

            <div className="relative flex items-center border border-gray-300 rounded-full shadow-sm px-4 py-2 md:py-3 xl:py-5 bg-white">
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

            <div className="mt-4" />

            <div className="flex flex-row justify-center space-x-0 mt-8 lg:text-2xl xl:text-2xl xl:mt-10 w-full">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 cursor-pointer bg-blue-600 rounded-full px-7 py-2 xl:px-9 xl:py-4 text-white font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Logging in..." : "Log In"}
              </button>
              <button
                type="button"
                onClick={handlePreRegister}
                disabled={isLoading}
                className="flex-1 cursor-pointer bg-white rounded-full px-7 py-2 xl:px-9 xl:py-4 text-blue-600 font-bold border border-blue-600 shadow-md ml-2 disabled:opacity-50"
              >
                Pre Register
              </button>
            </div>
          </form>
        </div>

        <ChatSupportBtn />
      </div>
    </div>
  )
}
