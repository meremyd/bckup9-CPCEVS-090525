import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Home, 
  Vote, 
  GraduationCap, 
  HelpCircle, 
  MessageSquare, 
  User, 
  BookOpen, 
  LogOut,
  Menu,
  X
} from 'lucide-react'
import Swal from 'sweetalert2'
import { voterLogout } from '@/lib/auth'

export default function VoterNavbar({ 
  currentPage, 
  pageTitle, 
  pageSubtitle,
  pageIcon,
  onProfileClick,
  onRulesClick 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  const navItems = [
    { label: 'Home', icon: Home, path: '/voter/dashboard', id: 'home' },
    { label: 'SSG', icon: Vote, path: '/voter/ssg/elections', id: 'ssg' },
    { label: 'Departmental', icon: GraduationCap, path: '/voter/departmental/elections', id: 'departmental' },
    { label: 'FAQ', icon: HelpCircle, path: '/voter/faq', id: 'faq' },
    { label: 'Messages', icon: MessageSquare, path: '/voter/messages', id: 'messages' },
  ]

  const actionItems = [
    { label: 'Profile', icon: User, action: onProfileClick, id: 'profile' },
    { label: 'Rules', icon: BookOpen, action: onRulesClick, id: 'rules' },
  ]

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out of your account',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      voterLogout()
      router.push('/voterlogin')
      
      Swal.fire({
        title: 'Logged Out',
        text: 'You have been successfully logged out',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
    }
  }

  const handleNavClick = (path) => {
    setIsMenuOpen(false)
    router.push(path)
  }

  const handleActionClick = (action) => {
    setIsMenuOpen(false)
    if (action) action()
  }

  const isActive = (itemId) => currentPage === itemId

  return (
    <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/30 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Page Title */}
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
            {pageIcon}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">
              {pageTitle}
            </h1>
            {pageSubtitle && (
              <p className="text-xs text-[#001f65]/70">
                {pageSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.id)
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={`flex items-center px-3 py-2 text-sm transition-all relative group ${
                  active
                    ? 'text-[#001f65] font-medium'
                    : 'text-[#001f65] hover:text-[#003399]'
                }`}
                title={item.label}
              >
                <Icon className="w-4 h-4 mr-1" />
                <span className="font-medium">{item.label}</span>
                {/* underline line (only line on hover) */}
                <span className={`absolute bottom-0 left-3 right-3 h-0.5 bg-[#001f65] transform origin-left transition-transform ${
                  active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}></span>
              </button>
            )
          })}

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          {/* Action Items */}
          {actionItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleActionClick(item.action)}
                className="flex items-center px-3 py-2 text-sm text-[#001f65] transition-all relative group"
                title={item.label}
              >
                <Icon className="w-4 h-4 mr-1" />
                <span className="font-medium">{item.label}</span>
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#001f65] transform origin-left transition-transform scale-x-0 group-hover:scale-x-100"></span>
              </button>
            )
          })}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium shadow-md ml-2"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>

        {/* Mobile: Hamburger Menu */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden p-2 text-[#001f65] hover:bg-[#001f65]/10 rounded-lg transition-colors"
        >
          {isMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
          <div className="space-y-1">
            {/* Navigation Items */}
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  /* mobile: keep box background hover restored, keep underline animation too */
                  className={`w-full flex items-center px-4 py-3 text-sm rounded-lg transition-all ${
                    active
                      ? 'text-[#001f65] font-medium bg-[#f1f8ff]'
                      : 'text-[#001f65] hover:text-[#003399] hover:bg-gray-100'
                  } relative group`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.label}</span>
                  <span className={`absolute bottom-2 left-6 right-6 h-0.5 bg-[#001f65] transform origin-left transition-transform ${
                    active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}></span>
                </button>
              )
            })}

            {/* Divider */}
            <div className="h-px bg-gray-200 my-2"></div>

            {/* Action Items */}
            {actionItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleActionClick(item.action)}
                  /* mobile: show box hover for action items too */
                  className="w-full flex items-center px-4 py-3 text-sm text-[#001f65] hover:text-[#003399] hover:bg-gray-100 rounded-lg transition-all relative group"
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.label}</span>
                  <span className="absolute bottom-2 left-6 right-6 h-0.5 bg-[#001f65] transform origin-left transition-transform scale-x-0 group-hover:scale-x-100"></span>
                </button>
              )
            })}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium shadow-md mt-2"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}