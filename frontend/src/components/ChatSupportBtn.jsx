"use client"
import { useState } from "react"
import { chatSupportAPI } from '@/lib/api/chatSupport'

export default function ChatSupportBtn() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    idNumber: "",
    firstName: "",
    middleName: "",
    lastName: "",
    course: "",
    email: "",
    message: "",
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0]
    setPhotoFile(file || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Pass photoFile along with the form. The API helper will build FormData.
      await chatSupportAPI.submit({ ...form, photoFile })
      setSuccess(true)
      setForm({
        idNumber: "",
        firstName: "",
        middleName: "",
        lastName: "",
        course: "",
        email: "",
        message: "",
      })
      setPhotoFile(null)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 2000)
    } catch (error) {
      console.error("Chat support error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setOpen(true)} 
          className="bg-white rounded-full p-2 shadow-lg hover:scale-110 hover:bg-blue-50 transition"
        >
          <img src="/chatsprt.png" alt="Chat Support" className="w-16 h-16" />
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-hidden">
            
            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition"
            >
              &times;
            </button>

            {/* Header */}
            <div className="p-8 pb-4 border-b">
              <div className="flex items-center">
                <img src="/chatsprt.png" alt="Chat Icon" className="w-14 h-14 mr-3" />
                <div>
                  <h2 className="text-2xl font-extrabold text-blue-700">CHAT SUPPORT</h2>
                  <p className="text-sm text-gray-500 -mt-1">Address your queries</p>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {success ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-green-700">Message Sent!</h3>
                <p className="text-gray-500 mt-2">Your support request has been submitted successfully.</p>
              </div>
            ) : (
              /* Form */
              <form className="px-8 py-6 space-y-4 overflow-y-auto max-h-[65vh]" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-gray-500">ID NUMBER:</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="idNumber"
                    value={form.idNumber}
                    onChange={handleChange}
                    maxLength={8}
                    className="w-full rounded-lg bg-blue-50 px-4 py-2 outline-none border border-transparent focus:border-blue-300 focus:bg-white transition"
                    placeholder="e.g. 20230001"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-500">FIRST NAME:</label>
                    <input
                      type="text"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      className="w-full rounded-lg bg-blue-50 px-4 py-2 outline-none focus:border-blue-300 focus:bg-white border border-transparent transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-500">MIDDLE NAME:</label>
                    <input
                      type="text"
                      name="middleName"
                      value={form.middleName}
                      onChange={handleChange}
                      className="w-full rounded-lg bg-blue-50 px-4 py-2 outline-none focus:border-blue-300 focus:bg-white border border-transparent transition"
                      placeholder="(optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-500">LAST NAME:</label>
                    <input
                      type="text"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      className="w-full rounded-lg bg-blue-50 px-4 py-2 outline-none focus:border-blue-300 focus:bg-white border border-transparent transition"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-500">COURSE:</label>
                  <select
                    name="course"
                    value={form.course}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-blue-50 px-4 py-2 outline-none focus:border-blue-300 focus:bg-white border border-transparent transition"
                    required
                  >
                    <option value="">Select course</option>
                    <option value="BSIT">BSIT</option>
                    <option value="BSED">BSED</option>
                    <option value="BEED">BEED</option>
                    <option value="BSHM">BSHM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-500">EMAIL:</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-blue-50 px-4 py-2 outline-none focus:border-blue-300 focus:bg-white border border-transparent transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-500">MESSAGE:</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-blue-50 px-4 py-2 outline-none focus:border-blue-300 focus:bg-white border border-transparent transition resize-none"
                    rows={3}
                    required
                  ></textarea>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-500">PHOTO (optional):</label>
                  <input
                    type="file"
                    accept="image/*"
                    name="photo"
                    onChange={handleFileChange}
                    className="w-full rounded-lg bg-blue-50 px-4 py-2 outline-none focus:border-blue-300 focus:bg-white border border-transparent transition"
                  />
                </div>
                

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white font-bold rounded-full py-3 shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {loading ? "SENDING..." : "SEND"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
