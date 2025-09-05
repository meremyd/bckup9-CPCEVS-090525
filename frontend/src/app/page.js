"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to voter login page
    router.push("/voterlogin")
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">E-Voting System</h1>
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  )
}
