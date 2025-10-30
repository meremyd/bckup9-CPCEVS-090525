import React, { useState } from 'react'

export default function OtpModal({ visible, onClose, onSubmit, initialVoterId }) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!visible) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      await onSubmit({ voterId: initialVoterId, otp })
    } catch (err) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Enter OTP</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <p className="mt-2 mb-4 text-sm text-gray-600">We've sent a one-time password to your registered email. Enter it below to complete login.</p>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="flex justify-center mb-4">
            <input
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="------"
              className="w-full text-center px-4 py-3 border border-gray-200 rounded-lg text-xl tracking-widest placeholder-gray-300"
              required
              maxLength={6}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg bg-blue-700 text-white">{isLoading ? 'Verifying...' : 'Verify'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
