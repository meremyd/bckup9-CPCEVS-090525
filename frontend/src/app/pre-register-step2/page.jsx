"use client"
import LeftSide from "../../components/LeftSide"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import ChatSupportBtn from "../../components/ChatSupportBtn"

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

    if (!faceRecognitionComplete) {
      setError("Please complete face recognition before proceeding")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("http://localhost:5000/api/auth/pre-register-step2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voterId: voterInfo.id,
          password: form.password,
          confirmPassword: form.confirmPassword,
          firstName: voterInfo.firstName,
          middleName: voterInfo.middleName,
          lastName: voterInfo.lastName,
          schoolId: voterInfo.schoolId,
          photoCompleted: faceRecognitionComplete,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.removeItem("preRegisterVoter")
        alert("Registration completed successfully! You can now login.")
        router.push("/voterlogin")
      } else {
        setError(data.message || "Registration failed")
      }
    } catch (error) {
      setError("Network error. Please try again.")
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
      <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden overflow-y-auto">
        <LeftSide />
        <div className="w-full flex-grow bg-white flex flex-col items-center justify-center p-6 relative rounded-t-3xl -mt-3 md:mt-0 md:rounded-none md:w-3/5 md:h-screen xl:min-w-[600px] xl:-mt-10">
          <div className="text-center mb-6 -mt-1 md:mb-8 md:mt-10 lg:mb-10 lg:-mt-0 xl:mb-12">
            <div className="flex flex-row items-center justify-center w-full mb-2 xl:mt-10">
              <img
                src="/fingerprint.png"
                alt="Fingerprint Icon"
                className="w-10 h-10 md:w-12 md:h-12 xl:w-16 xl:h-16 mr-3"
              />
              <h2 className="text-xl font-bold text-blue-600 md:text-2xl lg:text-3xl xl:text-3xl m-0">
                Pre Registration
              </h2>
            </div>
            <p className="text-xs text-gray-600 md:text-sm xl:text-base">
              Create a password and proceed to
              <br />
              selfie authentication
            </p>
          </div>

          <div className="w-full max-w-sm md:max-w-md xl:max-w-xl 2xl:max-w-2xl text-left mb-3">
            <span className="text-sm font-bold text-gray-800 md:text-base xl:text-lg">STEP 2</span>
            <div className="text-xs text-gray-600 mt-1 md:text-xs xl:text-sm">
              Welcome, {voterInfo.firstName} {voterInfo.lastName} (ID: {voterInfo.schoolId})
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-xs w-full max-w-sm md:max-w-md xl:max-w-xl 2xl:max-w-2xl md:text-sm">
              {error}
            </div>
          )}

          <form className="w-full max-w-sm mb-4 md:max-w-md md:mb-6 xl:max-w-xl 2xl:max-w-2xl" onSubmit={handleDone}>
            <div className="mb-3 md:mb-4 xl:mb-5">
              <label className="block text-gray-700 text-xs mb-2 md:text-sm xl:text-base font-medium">
                Create a password *
              </label>
              <div className="relative flex items-center border border-gray-300 rounded-full shadow-sm px-4 py-2 md:py-2 xl:py-3 2xl:px-5 2xl:py-4 bg-blue-50">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="flex-1 bg-transparent outline-none text-gray-800 text-xs placeholder-gray-500 md:text-sm xl:text-base xl:ml-2 2xl:ml-4"
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-4 md:mb-5 xl:mb-6">
              <label className="block text-gray-700 text-xs mb-2 md:text-sm xl:text-base font-medium">
                Confirm your password *
              </label>
              <div className="relative flex items-center border border-gray-300 rounded-full shadow-sm px-4 py-2 md:py-2 xl:py-3 2xl:px-5 2xl:py-4 bg-blue-50">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="flex-1 bg-transparent outline-none text-gray-800 text-xs placeholder-gray-500 md:text-sm xl:text-base xl:ml-2 2xl:ml-4"
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-6 md:mb-8 xl:mb-10">
              <label className="block text-gray-700 text-xs mb-3 md:text-sm xl:text-base font-medium">
                Facial Registration *
              </label>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={startFaceRecognition}
                  disabled={faceRecognitionActive || faceRecognitionComplete}
                  className={`flex items-center justify-center w-12 h-12 md:w-14 md:h-14 xl:w-16 xl:h-16 rounded-full shadow-md transition ${
                    faceRecognitionComplete ? "bg-green-100 hover:bg-green-200" : "bg-blue-100 hover:bg-blue-200"
                  } ${faceRecognitionActive ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {faceRecognitionComplete ? (
                    <svg
                      className="w-6 h-6 md:w-7 md:h-7 xl:w-8 xl:h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <img src="/camera.png" alt="Camera Icon" className="w-6 h-6 md:w-7 md:h-7 xl:w-8 xl:h-8" />
                  )}
                </button>

                {faceRecognitionComplete && (
                  <p className="text-xs text-green-600 mt-2 text-center">Face registration completed ✓</p>
                )}
              </div>
            </div>

            <div className="flex flex-row justify-center space-x-0 mt-6 lg:text-base xl:text-base xl:mt-8 w-full">
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="flex-1 rounded-full py-2 text-blue-600 bg-white border-1 border-blue-700 font-semibold shadow-sm hover:bg-blue-50 transition text-sm xl:text-base disabled:opacity-50"
              >
                Log In
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-full py-2 text-white bg-blue-600 font-semibold shadow-sm text-sm xl:text-base ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Account..." : "Done"}
              </button>
            </div>
          </form>
          <ChatSupportBtn />
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
