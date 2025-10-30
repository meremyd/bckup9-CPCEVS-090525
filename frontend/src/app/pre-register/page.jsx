"use client"
import LeftSide from "../../components/LeftSide"
import { useRouter } from "next/navigation"
import { useState } from "react"
import ChatSupportBtn from "../../components/ChatSupportBtn"
import Swal from "sweetalert2"
import { votersAPI } from '@/lib/api/voters'
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
  const [voterFound, setVoterFound] = useState(false)
  const [voterData, setVoterData] = useState(null)

  const handleLogin = () => {
    router.push("/voterlogin")
  }

  const handleChange = async (e) => {
    const { name, value } = e.target

    if (name === "schoolId") {
      // Limit to 8 digits
      if (value.length > 8) {
        return
      }

      setForm({ ...form, [name]: value })
      setError("")
      setVoterFound(false)
      setVoterData(null)

      // Clear other fields when school ID changes
      setForm((prev) => ({
        ...prev,
        schoolId: value,
        firstName: "",
        middleName: "",
        lastName: "",
      }))

      // FIXED: Only lookup when exactly 8 digits are entered
      if (value.length === 8) {
        try {
          const data = await votersAPI.lookupBySchoolId(value)
          
          // FIXED: Correctly map the voter data with department info
          setForm((prev) => ({
            ...prev,
            firstName: data.firstName || "",
            middleName: data.middleName || "",
            lastName: data.lastName || "",
            sex: data.sex || "",
          }))
          setVoterData(data)
          setVoterFound(true)
          setError("")
        } catch (error) {
          console.error("Lookup error:", error)
          setForm((prev) => ({
            ...prev,
            firstName: "",
            middleName: "",
            lastName: "",
          }))
          setVoterFound(false)
          setVoterData(null)
          
          // Show error message for invalid 8-digit ID
          Swal.fire({
            icon: "error",
            title: "Student Not Found",
            text: error.message || "Student ID not found in voter database. Please check your School ID.",
            confirmButtonColor: "#2563eb",
          })
        }
      }
    }
  }

  const handleMatch = async (e) => {
    e.preventDefault()

    if (!voterFound || !voterData) {
      Swal.fire({
        icon: "warning",
        title: "No Student Found",
        text: "Please enter a valid 8-digit school ID to find your information",
        confirmButtonColor: "#2563eb",
      })
      return
    }

    // FIXED: Properly display department information in confirmation modal
    const departmentInfo = voterData.department || voterData.departmentId
    const departmentDisplay = departmentInfo 
      ? `${departmentInfo.departmentCode} - ${departmentInfo.degreeProgram}` 
      : "N/A"
    
   
    const result = await Swal.fire({
      title: "Confirm Your Information",
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p><strong>School ID:</strong> ${voterData.schoolId}</p>
          <p><strong>Name:</strong> ${voterData.firstName} ${voterData.middleName || ""} ${voterData.lastName}</p>
          <p><strong>Sex:</strong> ${voterData.sex || "N/A"}</p>
          <p><strong>Department:</strong> ${departmentDisplay}</p>
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
      const data = await authAPI.preRegisterStep1({ schoolId: form.schoolId })
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
        <div className="w-full flex-grow bg-white flex flex-col items-center justify-center p-6 relative rounded-t-3xl -mt-3 md:mt-0 md:rounded-none md:w-3/5 md:h-screen xl:min-w-[600px] xl:-mt-10">
          <div className="text-center mb-8 -mt-1 md:mb-10 md:mt-10 lg:mb-12 lg:-mt-0 xl:mb-16">
            <div className="flex flex-row items-center justify-center w-full mb-2 xl:mt-10">
              <img src="/voteicon.png" alt="Vote Icon" className="w-12 h-12 md:w-14 md:h-14 xl:w-18 xl:h-18 mr-3" />
              <h2 className="text-2xl font-bold text-blue-700 md:text-3xl lg:text-4xl xl:text-4xl m-0">
                Pre Registration
              </h2>
            </div>
            <p className="text-sm text-gray-600 md:text-base xl:text-lg">
              Enter your 8-digit school ID to verify your information
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm w-full max-w-sm md:max-w-md xl:max-w-xl">
              {error}
            </div>
          )}

          <form className="w-full max-w-sm mb-4 md:max-w-md md:mb-6 xl:max-w-xl 2xl:max-w-2xl" onSubmit={handleMatch}>
            <div className="relative flex items-center mb-3 border border-gray-200 rounded-full shadow-sm px-4 py-3 md:mb-4 md:py-3 xl:py-4 xl:mb-6 2xl:px-8 2xl:py-5 bg-gray-50">
              <input
                type="number"
                name="schoolId"
                placeholder="School ID"
                value={form.schoolId}
                onChange={handleChange}
                maxLength="8"
                min="10000000"
                max="99999999"
                className="flex-1 bg-transparent outline-none text-gray-800 text-base placeholder-gray-500 md:text-lg xl:text-xl 2xl:text-2xl xl:ml-4 2xl:ml-6"
                required
                disabled={loading}
              />
            </div>

            <div className="relative flex items-center mb-3 border border-gray-200 rounded-full shadow-sm px-4 py-2 md:mb-4 md:py-3 xl:py-4 xl:mb-6 2xl:px-8 2xl:py-5 bg-gray-50">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={form.firstName}
                className="flex-1 bg-transparent outline-none text-gray-800 text-base placeholder-gray-500 md:text-lg xl:text-xl 2xl:text-2xl xl:ml-6 2xl:ml-10 2xl:placeholder:text-xl cursor-not-allowed"
                readOnly
              />
            </div>

            <div className="relative flex items-center mb-3 border border-gray-300 rounded-full shadow-sm px-4 py-2 md:mb-4 md:py-3 xl:py-5 xl:mb-6 2xl:px-8 2xl:py-6 bg-gray-50">
              <input
                type="text"
                name="middleName"
                placeholder="Middle Name"
                value={form.middleName}
                className="flex-1 bg-transparent outline-none text-gray-800 text-base placeholder-gray-500 md:text-lg xl:text-xl 2xl:text-2xl xl:ml-6 2xl:ml-10 2xl:placeholder:text-xl cursor-not-allowed"
                readOnly
              />
            </div>

            <div className="relative flex items-center mb-3 border border-gray-300 rounded-full shadow-sm px-4 py-2 md:mb-4 md:py-3 xl:py-5 xl:mb-6 2xl:px-8 2xl:py-6 bg-gray-50">
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={form.lastName}
                className="flex-1 bg-transparent outline-none text-gray-800 text-base placeholder-gray-500 md:text-lg xl:text-xl 2xl:text-2xl xl:ml-6 2xl:ml-10 2xl:placeholder:text-xl cursor-not-allowed"
                readOnly
              />
            </div>

            <div className="flex flex-row justify-center gap-3 mt-8 lg:text-lg xl:mt-10 w-full">
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="flex-1 rounded-full py-3 text-blue-700 bg-white border border-blue-200 font-semibold shadow-sm hover:bg-blue-50 transition xl:text-lg disabled:opacity-50"
              >
                Log In
              </button>
              <button
                type="submit"
                disabled={loading || !voterFound}
                className="flex-1 rounded-full py-3 text-white bg-blue-700 hover:bg-blue-800 font-semibold shadow-sm xl:text-lg ml-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Pre Register"}
              </button>
            </div>
          </form>
          <ChatSupportBtn />
        </div>
      </div>
    </>
  )
}