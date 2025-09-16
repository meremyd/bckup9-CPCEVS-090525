"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { 
  Home, 
  Users, 
  CheckCircle, 
  Building2, 
  User, 
  MessageCircle, 
  FileText, 
  LogOut, 
  Loader2, 
  Menu, 
  X 
} from "lucide-react"
import { getUserFromToken, logout } from "../../lib/auth"
import BackgroundWrapper from "@/components/BackgroundWrapper"

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
          logout()
          router.push("/adminlogin")
          return
        }
      } catch (error) {
        logout()
        router.push("/adminlogin")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    logout()
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/adminlogin")
  }

  const handleSidebarItemClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const menuItems = [
    { id: "dashboard", name: "Home", path: "/admin/dashboard", icon: Home },
    { id: "voters", name: "Voters", path: "/admin/voters", icon: Users },
    { id: "registered-voters", name: "Registered Voters", path: "/admin/registered-voters", icon: CheckCircle },
    { id: "departments", name: "Departments", path: "/admin/departments", icon: Building2 },
    { id: "users", name: "Users", path: "/admin/users", icon: User },
    { id: "messages", name: "Messages", path: "/admin/messages", icon: MessageCircle },
    { id: "audit-logs", name: "Audit Logs", path: "/admin/audit-logs", icon: FileText },
  ]

  if (loading) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading...</p>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  if (isDashboard) {
    return children
  }

  return (
    <BackgroundWrapper>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        id="admin-sidebar"
        className={`fixed left-0 top-0 h-full w-64 z-50 transform transition-transform duration-300 ease-in-out 
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{
          background: 'linear-gradient(135deg, #001f65 0%, #6895fd 100%)'
        }}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const IconComponent = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  onClick={handleSidebarItemClick}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    pathname === item.path
                      ? "bg-white/20 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="ml-3">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="pt-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 rounded-lg text-red-300 hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Header - Mobile */}
        <div className="lg:hidden bg-[#b0c8fe]/95 backdrop-blur-sm shadow-lg border-b border-[#b0c8fe]/30 px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              id="mobile-menu-button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
            >
              <Menu className="w-6 h-6 text-[#001f65]" />
            </button>
            <h1 className="text-lg font-bold text-[#001f65]">Admin Panel</h1>
            <div className="w-8 h-8 bg-[#001f65] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.username?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6 pt-20 lg:pt-6">
          {children}
        </div>
      </div>
    </BackgroundWrapper>
  )
}