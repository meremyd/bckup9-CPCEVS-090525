"use client"
import { useState } from "react"
import { chatSupportAPI } from '@/lib/api/chatSupport'

export default function ChatSupportBtn() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    idNumber: "",
    fullName: "",
    course: "",
    birthday: "",
    email: "",
    message: "",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await chatSupportAPI.submit(form)
      setSuccess(true)
      setForm({
        idNumber: "",
        fullName: "",
        course: "",
        birthday: "",
        email: "",
        message: "",
      })
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
      <div className="fixed bottom-4 right-4 z-50">
        <button onClick={() => setOpen(true)} className="bg-none rounded-full p-3 shadow-lg transition duration-300">
          <img src="/chatsprt.png" alt="Chat Support" className="w-20 h-20" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="chatsupport bg-blue-200 rounded-2xl shadow-xl ">
            <div className=" rounded-2xl shadow-xl p-8 w-full max-w-md relative animate-fade-in ">
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-700"
              >
                &times;
              </button>
              <div className="flex items-center mb-4">
                <img src="/chatsprt.png" alt="Chat Icon" className="w-14 h-14 mr-3" />
                <div>
                  <h2 className="text-2xl font-extrabold text-blue-700 leading-tight">CHAT SUPPORT</h2>
                  <p className="text-sm text-gray-500 -mt-1">Address your queries</p>
                </div>
              </div>
              {success ? (
                <div className="text-center text-green-600 font-bold">Support request submitted successfully!</div>
              ) : (
                <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                  <label className="text-xs font-bold text-blue-900">ID NUMBER:</label>
                  <input
                    type="number"
                    name="idNumber"
                    value={form.idNumber}
                    onChange={handleChange}
                    className="rounded-md bg-blue-100 px-3 py-2 outline-none"
                    required
                  />
                  <label className="text-xs font-bold text-blue-900">FULL NAME:</label>
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    className="rounded-md bg-blue-100 px-3 py-2 outline-none"
                    required
                  />
                  <label className="text-xs font-bold text-blue-900">COURSE:</label>
                  <select
                    name="course"
                    value={form.course}
                    onChange={handleChange}
                    className="rounded-md bg-blue-100 px-3 py-2 outline-none"
                    required
                  >
                    <option value="">Select course</option>
                    <option value="BSIT">BSIT</option>
                    <option value="BSED">BSED</option>
                    <option value="BEED">BEED</option>
                    <option value="BSHM">BSHM</option>
                  </select>
                  <label className="text-xs font-bold text-blue-900">BIRTHDAY:</label>
                  <input
                    type="date"
                    name="birthday"
                    value={form.birthday}
                    onChange={handleChange}
                    className="rounded-md bg-blue-100 px-3 py-2 outline-none"
                    required
                  />
                  <label className="text-xs font-bold text-blue-900">EMAIL:</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="rounded-md bg-blue-100 px-3 py-2 outline-none"
                    required
                  />
                  <label className="text-xs font-bold text-blue-900">MESSAGE:</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    className="rounded-md bg-blue-100 px-3 py-2 outline-none resize-none"
                    rows={2}
                    required
                  ></textarea>
                  <div className="text-xs text-center text-gray-500 mt-2 mb-1">
                    PLEASE ATTACH YOUR ID PHOTO FOR VERIFICATION
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <label className="cursor-pointer ml-24">
                      <span className="inline-block bg-blue-100 p-2 rounded-md">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="size-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                          />
                        </svg>
                      </span>
                      <input type="file" className="hidden" />
                    </label>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 text-white font-bold rounded-full px-8 py-2 shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {loading ? "SENDING..." : "SEND"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
