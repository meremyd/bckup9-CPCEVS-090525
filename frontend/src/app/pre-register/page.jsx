"use client"
import LeftSide from "../../components/LeftSide"
import { useRouter } from "next/navigation"
import { useState } from "react"
import ChatSupportBtn from "../../components/ChatSupportBtn"
import Swal from "sweetalert2"
import { authAPI } from '@/lib/api/auth'

export default function PreRegister() {
  const router = useRouter()
  const [form, setForm] = useState({
    schoolId: "",
    firstName: "",
    middleName: "",
    lastName: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  

  const handleLogin = () => {
    router.push("/voterlogin")
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === "schoolId") {
      if (value.length > 8) return
      setForm((prev) => ({ ...prev, schoolId: value }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }

    setError("")
  }
  

  const handleMatch = async (e) => {
    e.preventDefault()

    // Confirm using the information the student entered (do not show auto-lookup data)
    const result = await Swal.fire({
      title: "Confirm Your Information",
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p><strong>School ID:</strong> ${form.schoolId}</p>
          <p><strong>Name:</strong> ${form.firstName} ${form.middleName || ""} ${form.lastName}</p>
        </div>
        <p style="margin-top: 20px;">Is this information correct?</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, this is me",
      cancelButtonText: "No, let me check",
    })

    if (!result.isConfirmed) {
      return
    }

    setLoading(true)
    setError("")

    try {
      // Include full name fields in the verification payload to reduce risk
      const data = await authAPI.preRegisterStep1({
        schoolId: form.schoolId,
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
      })
      // Store voter info for step 2
      localStorage.setItem("preRegisterVoter", JSON.stringify(data.voter))
      router.push("/pre-register-step2")
    } catch (error) {
      setError(error.message || "Registration failed")
      Swal.fire({
        icon: "error",
        title: "Registration Error",
        text: error.message || "Registration failed. Please try again.",
        confirmButtonColor: "#2563eb",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden overflow-y-auto">
        <LeftSide />

        <div className="w-full flex-grow bg-white flex flex-col items-center justify-center p-6 relative rounded-t-2xl -mt-3 md:mt-0 md:rounded-none md:w-3/5 md:h-screen md:p-9 xl:gap-y-20">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-white/20 p-6 md:p-10">
            <div className="text-center mb-6">
              <div className="flex flex-row items-center justify-center w-full mb-2">
                <img src="/voteicon.png" alt="Vote Icon" className="w-12 h-12 md:w-14 md:h-14 mr-3" />
                <h2 className="font-semibold text-[#001f65] mb-0 text-[clamp(1.25rem,3.5vw,1.75rem)]">PRE-REGISTRATION</h2>
              </div>
              <p className="text-[#123b7a]/80 text-sm md:text-base">Enter your school ID to verify your information</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm w-full">
                {error}
              </div>
            )}

            <form className="w-full" onSubmit={handleMatch}>
              <div className="mb-4">
                <label htmlFor="schoolId" className="block text-sm font-medium text-[#123b7a] mb-2">School ID</label>
                <input
                  id="schoolId"
                  type="number"
                  name="schoolId"
                  placeholder="Enter your School ID"
                  value={form.schoolId}
                  onChange={handleChange}
                  maxLength="8"
                  min="10000000"
                  max="99999999"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-[#123b7a] mb-1">First Name</label>
                  <input type="text" name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#123b7a] mb-1">Middle Name</label>
                  <input type="text" name="middleName" placeholder="Middle Name" value={form.middleName} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg bg-white text-gray-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#123b7a] mb-1">Last Name</label>
                  <input type="text" name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800" />
                </div>
              </div>

              <div className="flex flex-row justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="flex-1 rounded-lg py-3 text-[#001f65] bg-white border border-gray-200 font-semibold shadow-sm hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Log In
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.schoolId.trim()}
                  className="flex-1 rounded-lg py-3 text-white bg-blue-500 hover:bg-blue-700 font-semibold shadow-sm ml-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "Pre Register"}
                </button>
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
