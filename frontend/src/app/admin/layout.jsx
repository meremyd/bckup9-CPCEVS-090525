"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Users, CheckCircle, BookOpen, User, MessageCircle, FileText, LogOut, Loader2, Menu, X } from "lucide-react"

import { getUserFromToken, logout } from "../../lib/auth"

export default function AdminLayout({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isDashboard = pathname === "/admin/dashboard"

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = getUserFromToken() 

        if (!userData) {
          router.push("/adminlogin")
          return
        }

        setUser(userData)

        if (userData.userType !== "admin") {
          console.warn("Unauthorized access: User is not an admin. Redirecting.")
          logout() 
          router.push("/adminlogin")
          return
        }
      } catch (error) {
        console.error("Authentication check failed:", error)
        logout()
        router.push("/adminlogin")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => {
    logout() 
    localStorage.removeItem("token")
    localStorage.removeItem("user") 
    router.push("/adminlogin")
  }

  const handleSidebarItemClick = () => {
    // Close sidebar on mobile when item is clicked
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const menuItems = [
    {
      id: "dashboard",
      name: "Home",
      path: "/admin/dashboard",
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: "voters",
      name: "Voters",
      path: "/admin/voters",
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: "registered-voters",
      name: "Registered Voters",
      path: "/admin/registered-voters",
      icon: <CheckCircle className="w-5 h-5" />,
    },
    {
      id: "degrees",
      name: "Degrees",
      path: "/admin/degrees",
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      id: "users",
      name: "Users",
      path: "/admin/users",
      icon: <User className="w-5 h-5" />,
    },
    {
      id: "messages",
      name: "Messages",
      path: "/admin/messages",
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      id: "audit-logs",
      name: "Audit Logs",
      path: "/admin/audit-logs",
      icon: <FileText className="w-5 h-5" />,
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isDashboard) {
    return children
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between h-16 px-4 bg-blue-600 text-white">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-blue-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.id}
                href={item.path}
                onClick={handleSidebarItemClick}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  pathname === item.path
                    ? "bg-blue-100 text-blue-700 border-r-4 border-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-left rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-3"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-800">
                {menuItems.find((item) => item.path === pathname)?.name || "Admin Dashboard"}
              </h2>
            </div>
            <div className="text-sm text-gray-600 hidden sm:block">
              Welcome, {user?.username}
            </div>
            {/* Mobile user indicator */}
            <div className="sm:hidden">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.username?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}