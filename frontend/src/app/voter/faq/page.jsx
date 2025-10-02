"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { HelpCircle, Search, ChevronDown, ChevronUp, ArrowLeft, Loader2, Filter } from "lucide-react"
import VoterLayout from '@/components/VoterLayout'
import { chatSupportAPI } from '@/lib/api/chatSupport'
import { getVoterFromToken } from '@/lib/auth'
import Swal from 'sweetalert2'

export default function VoterFAQ() {
  const [faqs, setFaqs] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [voter, setVoter] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const voterToken = localStorage.getItem("voterToken")
        if (!voterToken) {
          router.push("/voterlogin")
          return
        }

        const voterFromToken = getVoterFromToken()
        if (!voterFromToken) {
          router.push("/voterlogin")
          return
        }

        setVoter(voterFromToken)
        await loadFAQData()
      } catch (error) {
        console.error("Auth check error:", error)
        setError("Authentication error occurred")
        setLoading(false)
      }
    }

    checkAuthAndLoadData()
  }, [router])

  const loadFAQData = async () => {
    try {
      setLoading(true)
      
      // Load FAQs and categories in parallel
      const [faqsResponse, categoriesResponse] = await Promise.all([
        chatSupportAPI.getFAQs({ limit: 50 }),
        chatSupportAPI.getFAQCategories()
      ])

      if (faqsResponse.success && faqsResponse.data) {
        setFaqs(faqsResponse.data.faqs || [])
      }

      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data.categories || [])
      }

      setError("")
    } catch (error) {
      console.error("Error loading FAQ data:", error)
      setError("Failed to load FAQs. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = async (categoryId) => {
    try {
      setSelectedCategory(categoryId)
      setLoading(true)
      
      const params = { limit: 50 }
      if (categoryId) {
        params.category = categoryId
      }
      
      const response = await chatSupportAPI.getFAQs(params)
      
      if (response.success && response.data) {
        setFaqs(response.data.faqs || [])
      }
    } catch (error) {
      console.error("Error filtering FAQs:", error)
      await Swal.fire({
        title: 'Error',
        text: 'Failed to filter FAQs',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  const filteredFAQs = faqs.filter(faq => {
    if (!searchQuery) return true
    
    const searchLower = searchQuery.toLowerCase()
    return (
      faq.question.toLowerCase().includes(searchLower) ||
      faq.answer.toLowerCase().includes(searchLower) ||
      faq.department?.degreeProgram?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading FAQs...</p>
          </div>
        </div>
      </VoterLayout>
    )
  }

  if (error) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-white/20">
            <div className="text-red-500 text-6xl mb-4 text-center">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
            <p className="text-gray-600 mb-4 text-center">{error}</p>
            <div className="space-y-2">
              <button
                onClick={loadFAQData}
                className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => router.push("/voter/dashboard")}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </VoterLayout>
    )
  }

  return (
    <VoterLayout>
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push("/voter/dashboard")}
              className="mr-3 p-2 hover:bg-gray-100/80 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#001f65]" />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">
                Frequently Asked Questions
              </h1>
              <p className="text-xs text-[#001f65]/70">
                Find answers to common questions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[calc(100vh-120px)] p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Search and Filter Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-white/30">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent bg-white/80"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent bg-white/80"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.degreeProgram} ({category.faqCount} FAQs)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredFAQs.length} {filteredFAQs.length === 1 ? 'question' : 'questions'}
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            {filteredFAQs.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 text-center border border-white/30">
                <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No FAQs Found</h3>
                <p className="text-gray-500">
                  {searchQuery ? "Try adjusting your search terms" : "No frequently asked questions available yet"}
                </p>
              </div>
            ) : (
              filteredFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <button
                    onClick={() => toggleExpand(index)}
                    className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex-1 text-left pr-4">
                      <h3 className="text-base sm:text-lg font-semibold text-[#001f65] mb-1">
                        {faq.question}
                      </h3>
                      {faq.department && (
                        <p className="text-xs text-gray-500">
                          {faq.department.degreeProgram} • Asked {faq.count} {faq.count === 1 ? 'time' : 'times'}
                        </p>
                      )}
                    </div>
                    {expandedIndex === index ? (
                      <ChevronUp className="w-5 h-5 text-[#001f65] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#001f65] flex-shrink-0" />
                    )}
                  </button>
                  
                  {expandedIndex === index && (
                    <div className="px-4 sm:px-6 pb-4 border-t border-gray-200/50">
                      <div className="pt-4">
                        <div className="bg-blue-50/80 rounded-lg p-4">
                          <p className="text-sm font-medium text-[#001f65] mb-2">Answer:</p>
                          <p className="text-gray-700 whitespace-pre-wrap">{faq.answer}</p>
                        </div>
                        {faq.lastUpdated && (
                          <p className="text-xs text-gray-500 mt-3">
                            Last updated: {new Date(faq.lastUpdated).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-gradient-to-r from-purple-50/80 to-blue-50/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/30">
            <h3 className="text-lg font-semibold text-[#001f65] mb-2">
              Can't find what you're looking for?
            </h3>
            <p className="text-gray-600 mb-4">
              Submit a support request and our team will get back to you.
            </p>
            <button
              onClick={() => router.push("/voter/messages")}
              className="bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
            >
              Submit Support Request
            </button>
          </div>
        </div>
      </div>
    </VoterLayout>
  )
}