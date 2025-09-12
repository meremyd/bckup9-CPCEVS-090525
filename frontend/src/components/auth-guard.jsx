"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, hasRole, getUserFromToken } from "../lib/auth"

export default function AuthGuard({ children, requiredRole = null }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        router.push("/adminlogin")
        return
      }

      if (requiredRole && !hasRole(requiredRole)) {
 
        const user = getUserFromToken()
        if (user && user.userType) {
          switch (user.userType) {
            case "admin":
              router.push("/admin/dashboard")
              break
            case "election_committee":
              router.push("/ecommittee/dashboard")
              break
            case "sao":
              router.push("/sao/dashboard")
              break
            default:
              router.push("/adminlogin")
          }
        } else {
          router.push("/adminlogin")
        }
        return
      }

      setIsAuthorized(true)
      setIsLoading(false)
    }

    checkAuth()
  }, [router, requiredRole])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return children
}
