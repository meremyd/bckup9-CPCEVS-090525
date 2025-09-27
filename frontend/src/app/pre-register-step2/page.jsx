"use client"
import LeftSide from "../../components/LeftSide"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import ChatSupportBtn from "../../components/ChatSupportBtn"
import { authAPI } from '@/lib/api/auth'

export default function PreRegisterStep2() {
  const router = useRouter()
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  })
  const [voterInfo, setVoterInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [showCameraModal, setShowCameraModal] = useState(false)
  const [faceRecognitionActive, setFaceRecognitionActive] = useState(false)
  const [faceRecognitionComplete, setFaceRecognitionComplete] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [blinkDetected, setBlinkDetected] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [showPhotoPreview, setShowPhotoPreview] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    const storedVoter = localStorage.getItem("preRegisterVoter")
    if (!storedVoter) {
      router.push("/pre-register")
      return
    }
    const voter = JSON.parse(storedVoter)
    setVoterInfo(voter)
  }, [router])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
  }

  const detectFaceAndBlink = async () => {
    if (!videoRef.current) return

    // Simulate more realistic face detection with better success rate
    const faceDetected = Math.random() > 0.1 // 90% chance of detecting face
    setFaceDetected(faceDetected)

    if (faceDetected && !blinkDetected) {
      setTimeout(() => {
        const blinkDetected = Math.random() > 0.2 // 80% chance of detecting blink
        setBlinkDetected(blinkDetected)

        if (blinkDetected) {
          startCountdown()
        }
      }, 500) // Reduced delay for better responsiveness
    }
  }

  const startCountdown = () => {
    setCountdown(3)
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          capturePhoto()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const startFaceRecognition = async () => {
    setShowCameraModal(true)
    try {
      setFaceRecognitionActive(true)
      setFaceDetected(false)
      setBlinkDetected(false)
      setCountdown(0)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()

          const detectionInterval = setInterval(() => {
            if (faceRecognitionActive && showCameraModal && videoRef.current && videoRef.current.readyState === 4) {
              detectFaceAndBlink()
            } else if (!faceRecognitionActive || !showCameraModal) {
              clearInterval(detectionInterval)
            }
          }, 300) // Reduced interval for more responsive detection
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      setError("Camera access denied. Please allow camera access for face recognition.")
      setFaceRecognitionActive(false)
      setShowCameraModal(false)
    }
  }

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      ctx.drawImage(video, 0, 0)

      canvas.toBlob(
        async (blob) => {
          const photoData = {
            blob: blob,
            dataUrl: canvas.toDataURL("image/jpeg", 0.8),
            timestamp: new Date().toISOString(),
            schoolId: voterInfo?.schoolId,
          }

          setCapturedPhoto(photoData)
          setShowPhotoPreview(true)

          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
          }
          setFaceRecognitionActive(false)
        },
        "image/jpeg",
        0.8,
      )
    }
  }

  const savePhotoToDirectory = async (photoData) => {
    try {
      const filename = `${photoData.schoolId}_${Date.now()}.jpg`

      const savedPhotos = JSON.parse(localStorage.getItem("registrationPhotos") || "[]")
      savedPhotos.push({
        filename: filename,
        dataUrl: photoData.dataUrl,
        timestamp: photoData.timestamp,
        schoolId: photoData.schoolId,
        directory: "frontend/src/app/regimg",
        faceEncoding: `face_encoding_${filename}`, // Placeholder for face encoding
        profilePicture: `profile_${filename}`, // Separate profile picture reference
      })
      localStorage.setItem("registrationPhotos", JSON.stringify(savedPhotos))

      return filename
    } catch (error) {
      console.error("Error saving photo:", error)
      throw error
    }
  }

  const confirmPhoto = async () => {
    try {
      const filename = await savePhotoToDirectory(capturedPhoto)
      setFaceRecognitionComplete(true)
      setShowPhotoPreview(false)
      setShowCameraModal(false)
      console.log(`Photo saved as: ${filename}`)
    } catch (error) {
      setError("Failed to save photo. Please try again.")
    }
  }

  const retakePhoto = () => {
    setCapturedPhoto(null)
    setShowPhotoPreview(false)
    setFaceRecognitionComplete(false)
    setFaceDetected(false)
    setBlinkDetected(false)
    startFaceRecognition()
  }

  const closeCameraModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    setShowCameraModal(false)
    setFaceRecognitionActive(false)
    setFaceDetected(false)
    setBlinkDetected(false)
    setCountdown(0)
  }

  const handleDone = async (e) => {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    // if (!faceRecognitionComplete) {
    //   setError("Please complete face recognition before proceeding")
    //   return
    // }

    setLoading(true)
    setError("")

    try {
      const data = await authAPI.preRegisterStep2({
        voterId: voterInfo.id,
        password: form.password,
        confirmPassword: form.confirmPassword,
        firstName: voterInfo.firstName,
        middleName: voterInfo.middleName,
        lastName: voterInfo.lastName,
        schoolId: voterInfo.schoolId,
        photoCompleted: faceRecognitionComplete,
      })
      
      localStorage.removeItem("preRegisterVoter")
      alert("Registration completed successfully! You can now login.")
      router.push("/voterlogin")
    } catch (error) {
      setError(error.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    router.push("/voterlogin")
  }

  if (!voterInfo) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="flex flex-col md:flex-row bg-white shadow-lg md:rounded-lg overflow-hidden w-full max-w-4xl h-[600px]">
          {/* Left Side */}
          <LeftSide />
         
          {/* Right Side */}
          <div className="flex-1 flex flex-col items-center p-8 overflow-auto">
            <div className="flex flex-1 items-center mb-2">
              <img
                src="voteicon.png"
                alt="Vote Icon"
                className="w-10 h-10"
              />
              <div>
                <h2 className="text-2xl font-bold text-blue-700 text-center">Pre Registration</h2>
                <p className="text-gray-500 text-center">Create a password and proceed to selfie authentication</p>
              </div>
            </div>

            <div className="w-full max-w-sm text-left mb-3">
              <span className="text-sm font-bold text-blue-600">STEP 2</span>
              <div className="text-xs text-gray-600 mt-1">
                Welcome, {voterInfo.firstName} {voterInfo.lastName} (ID: {voterInfo.schoolId})
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm w-full max-w-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form className="w-full max-w-sm mb-4" onSubmit={handleDone}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                className="w-full border p-3 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-blue-500"
                required
                disabled={loading}
                minLength={6}
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full border p-3 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-blue-500"
                required
                disabled={loading}
                minLength={6}
              />

              <div className="mb-4">
                <label className="block text-gray-700 text-sm mb-2 font-medium">
                  Facial Registration *
                </label>
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={startFaceRecognition}
                    disabled={faceRecognitionActive || faceRecognitionComplete}
                    className={`flex items-center justify-center w-12 h-12 rounded-full shadow-md transition ${
                      faceRecognitionComplete ? "bg-green-100 hover:bg-green-200" : "bg-blue-100 hover:bg-blue-200"
                    } ${faceRecognitionActive ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {faceRecognitionComplete ? (
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <img src="/camera.png" alt="Camera Icon" className="w-6 h-6" />
                    )}
                  </button>

                  {faceRecognitionComplete && (
                    <p className="text-xs text-green-600 mt-2 text-center">Face registration completed ✓</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 w-full mt-4">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="flex-1 border py-2 rounded text-blue-600 bg-white hover:bg-blue-50"
                >
                  Log In
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating Account..." : "Done"}
                </button>
              </div>
            </form>
            <ChatSupportBtn />
          </div>
        </div>
      </div>

      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Face Recognition</h3>
              <button onClick={closeCameraModal} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col items-center">
              {faceRecognitionActive && !showPhotoPreview && (
                <div className="mb-4">
                  <video ref={videoRef} className="w-full h-48 rounded-lg border-2 border-blue-300" autoPlay muted />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="text-center mt-2">
                    {!faceDetected && (
                      <p className="text-sm text-orange-600">
                        <span className="inline-block animate-pulse">●</span> Looking for your face...
                      </p>
                    )}
                    {faceDetected && !blinkDetected && (
                      <p className="text-sm text-blue-600">
                        <span className="inline-block animate-bounce">👁️</span> Face detected! Please blink to continue
                      </p>
                    )}
                    {faceDetected && blinkDetected && countdown > 0 && (
                      <p className="text-sm text-green-600 font-semibold">📸 Get ready! Capturing in {countdown}...</p>
                    )}
                  </div>
                </div>
              )}

              {showPhotoPreview && capturedPhoto && (
                <div className="mb-4 text-center">
                  <img
                    src={capturedPhoto.dataUrl || "/placeholder.svg"}
                    alt="Captured photo"
                    className="w-full h-48 rounded-lg border-2 border-green-300 object-cover"
                  />
                  <div className="flex justify-center space-x-3 mt-4">
                    <button
                      type="button"
                      onClick={retakePhoto}
                      className="px-4 py-2 text-sm bg-gray-500 text-white rounded-full hover:bg-gray-600 transition"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={confirmPhoto}
                      className="px-4 py-2 text-sm bg-green-500 text-white rounded-full hover:bg-green-600 transition"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
