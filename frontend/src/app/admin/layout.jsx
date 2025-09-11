"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Users, CheckCircle, Building2, User, MessageCircle, FileText, LogOut, Loader2, Menu, X, ChevronDown, ChevronRight } from "lucide-react"

import { getUserFromToken, logout } from "../../lib/auth"
import { departmentsAPI } from "../../lib/api/departments"

export default function AdminLayout({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [departments, setDepartments] = useState([])
  const [departmentsExpanded, setDepartmentsExpanded] = useState(false)
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
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

  // Load departments when departments section is expanded
  useEffect(() => {
    const loadDepartments = async () => {
      if (departmentsExpanded && departments.length === 0) {
        setDepartmentsLoading(true)
        try {
          const response = await departmentsAPI.getAll({ 
            limit: 50, 
            sortBy: 'departmentCode',
            sortOrder: 'asc' 
          })
          setDepartments(response.departments || [])
        } catch (error) {
          console.error("Failed to load departments:", error)
        } finally {
          setDepartmentsLoading(false)
        }
      }
    }

    loadDepartments()
  }, [departmentsExpanded, departments.length])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }

    const handleClickOutside = (event) => {
      if (sidebarOpen && window.innerWidth < 1024) {
        const sidebar = document.getElementById('admin-sidebar')
        const menuButton = document.getElementById('mobile-menu-button')
        
        if (sidebar && !sidebar.contains(event.target) && 
            menuButton && !menuButton.contains(event.target)) {
          setSidebarOpen(false)
        }
      }
    }

    window.addEventListener('resize', handleResize)
    document.addEventListener('mousedown', handleClickOutside)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [sidebarOpen])

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

  const toggleDepartments = () => {
    setDepartmentsExpanded(!departmentsExpanded)
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
      id: "departments",
      name: "Departments",
      path: "/admin/departments",
      icon: <Building2 className="w-5 h-5" />,
      expandable: true,
      expanded: departmentsExpanded,
      onToggle: toggleDepartments,
      children: departments.map(dept => ({
        id: `dept-${dept._id}`,
        name: `${dept.departmentCode}`,
        path: `/admin/departments/${dept._id}`,
        icon: null,
        subtitle: dept.degreeProgram ? dept.degreeProgram.substring(0, 30) + (dept.degreeProgram.length > 30 ? '...' : '') : ''
      }))
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
      <div 
        id="admin-sidebar"
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between h-16 px-4 bg-blue-600 text-white">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-blue-700 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <div key={item.id}>
                {/* Main menu item */}
                <div className="flex items-center">
                  <Link
                    href={item.path}
                    onClick={handleSidebarItemClick}
                    className={`flex-1 flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      pathname === item.path
                        ? "bg-blue-100 text-blue-700 border-r-4 border-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Link>
                  
                  {/* Expand/collapse button for departments */}
                  {item.expandable && (
                    <button
                      onClick={item.onToggle}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={`${item.expanded ? 'Collapse' : 'Expand'} ${item.name}`}
                    >
                      {item.expanded ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </button>
                  )}
                </div>

                {/* Expandable children (departments) */}
                {item.expandable && item.expanded && (
                  <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-200">
                    {departmentsLoading ? (
                      <div className="flex items-center px-4 py-2 text-gray-500">
                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                        Loading departments...
                      </div>
                    ) : item.children && item.children.length > 0 ? (
                      item.children.map((child) => (
                        <Link
                          key={child.id}
                          href={child.path}
                          onClick={handleSidebarItemClick}
                          className={`ml-4 flex flex-col px-3 py-2 text-sm rounded-lg transition-colors ${
                            pathname === child.path
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                          }`}
                        >
                          <span className="font-medium">{child.name}</span>
                          {child.subtitle && (
                            <span className="text-xs text-gray-400 mt-0.5">
                              {child.subtitle}
                            </span>
                          )}
                        </Link>
                      ))
                    ) : (
                      <div className="ml-4 px-3 py-2 text-sm text-gray-400">
                        No departments found
                      </div>
                    )}
                  </div>
                )}
              </div>
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                id="mobile-menu-button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-3 transition-colors"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-800">
                {menuItems.find((item) => item.path === pathname)?.name || "Admin Dashboard"}
              </h2>
            </div>
            
            {/* Desktop user info */}
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
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}