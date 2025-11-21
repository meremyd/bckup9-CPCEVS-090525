"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { partylistsAPI } from "@/lib/api/partylists"
import { candidatesAPI } from "@/lib/api/candidates"
import VoterLayout from '@/components/VoterLayout'
import SSGNavbar from '@/components/SSGNavbar'
import Swal from 'sweetalert2'
import { 
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ImageIcon
} from "lucide-react"

export default function VoterSSGPartylistPage() {
  const [partylists, setPartylists] = useState([])
  const [activePartylistIndex, setActivePartylistIndex] = useState(0)
  const [currentPartylist, setCurrentPartylist] = useState(null)
  const [carouselImages, setCarouselImages] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [imageLoading, setImageLoading] = useState(true)
  const [error, setError] = useState("")
  const [electionTitle, setElectionTitle] = useState("")
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const electionId = searchParams.get('id')

  useEffect(() => {
    checkAuthAndLoadData()
  }, [electionId])

  useEffect(() => {
    if (partylists.length > 0) {
      loadPartylistData(activePartylistIndex)
    }
  }, [activePartylistIndex, partylists])

  const checkAuthAndLoadData = async () => {
    try {
      const voterToken = localStorage.getItem("voterToken")
      if (!voterToken) {
        router.push("/voterlogin")
        return
      }

      if (!electionId) {
        setError("No election ID provided")
        setLoading(false)
        return
      }

      await loadPartylists()
    } catch (error) {
      console.error("Auth check error:", error)
      setError("Authentication error occurred")
      setLoading(false)
    }
  }

  const loadPartylists = async () => {
    try {
      setLoading(true)
      const response = await partylistsAPI.voter.getBySSGElection(electionId)
      const partylistsData = response?.partylists || []
      
      if (partylistsData.length === 0) {
        setError("No partylists found for this election")
        setLoading(false)
        return
      }

      setPartylists(partylistsData)
      
      if (partylistsData[0]?.ssgElectionId?.title) {
        setElectionTitle(partylistsData[0].ssgElectionId.title)
      }
      
      setLoading(false)
    } catch (error) {
      console.error("Error loading partylists:", error)
      setError("Failed to load partylists")
      setLoading(false)
    }
  }

  const loadPartylistData = async (index) => {
    try {
      setImageLoading(true)
      setCurrentImageIndex(0)
      
      const partylist = partylists[index]
      
      const detailedResponse = await partylistsAPI.voter.getById(partylist._id)
      
      setCurrentPartylist(detailedResponse)
      
      const images = []
      
      if (detailedResponse.hasLogo) {
        try {
          const logoBlob = await partylistsAPI.voter.getLogo(partylist._id)
          const logoDataUrl = await blobToDataUrl(logoBlob)
          
          images.push({
            type: 'logo',
            dataUrl: logoDataUrl,
            label: `${detailedResponse.partylistName} - Logo`
          })
        } catch (error) {
          console.error('Error loading logo:', error)
        }
      }
      
      if (detailedResponse.hasPlatform) {
        try {
          const platformBlob = await partylistsAPI.voter.getPlatform(partylist._id)
          const platformDataUrl = await blobToDataUrl(platformBlob)
          
          images.push({
            type: 'platform',
            dataUrl: platformDataUrl,
            label: `${detailedResponse.partylistName} - Platform`
          })
        } catch (error) {
          console.error('Error loading platform:', error)
        }
      }
      
      if (detailedResponse.candidates && detailedResponse.candidates.length > 0) {
        const candidatesWithCredentials = detailedResponse.candidates.filter(c => c.hasCredentials)
        
        for (const candidate of candidatesWithCredentials) {
          try {
            const credentialsBlob = await candidatesAPI.voter.getCredentials(candidate._id)
            const credentialsDataUrl = await blobToDataUrl(credentialsBlob)
            
            images.push({
              type: 'credentials',
              dataUrl: credentialsDataUrl,
              label: `${candidate.name} - ${candidate.position}`,
              candidateName: candidate.name,
              position: candidate.position
            })
          } catch (error) {
            console.error(`Error loading credentials for ${candidate.name}:`, error)
          }
        }
      }
      
      setCarouselImages(images)
      setImageLoading(false)
    } catch (error) {
      console.error("Error loading partylist data:", error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load partylist details',
        confirmButtonColor: '#001f65'
      })
      setImageLoading(false)
    }
  }

  const blobToDataUrl = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const handlePreviousImage = () => {
    setCurrentImageIndex(prev => 
      prev === 0 ? carouselImages.length - 1 : prev - 1
    )
  }

  const handleNextImage = () => {
    setCurrentImageIndex(prev => 
      prev === carouselImages.length - 1 ? 0 : prev + 1
    )
  }

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50
    
    if (isLeftSwipe) {
      handleNextImage()
    }
    if (isRightSwipe) {
      handlePreviousImage()
    }
    
    setTouchStart(0)
    setTouchEnd(0)
  }

  if (loading) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading partylists...</p>
          </div>
        </div>
      </VoterLayout>
    )
  }

  if (error) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md w-full border border-white/20">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
            <p className="text-gray-600 mb-4 text-center">{error}</p>
            <button
              onClick={() => router.push(`/voter/ssg/info?id=${electionId}`)}
              className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
            >
              Back to Election Info
            </button>
          </div>
        </div>
      </VoterLayout>
    )
  }

  return (
    <VoterLayout>
      {/* SSG Navbar */}
      <SSGNavbar
        currentPage="partylist"
        electionId={electionId}
        pageTitle={electionTitle || "Partylist Information"}
        pageSubtitle="View partylist details and candidates"
      />

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        <div className="max-w-5xl mx-auto">
          
          {/* Partylist Tabs - Centered */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              {partylists.map((partylist, index) => (
                <button
                  key={partylist._id}
                  onClick={() => setActivePartylistIndex(index)}
                  className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                    activePartylistIndex === index
                      ? 'bg-[#001f65] text-white'
                      : 'bg-white text-[#001f65] hover:bg-gray-50'
                  } ${index !== 0 ? 'border-l border-gray-200' : ''}`}
                >
                  {partylist.partylistName}
                </button>
              ))}
            </div>
          </div>

          {/* Carousel Container */}
          {imageLoading ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
              <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-[#001f65]" />
              <p className="mt-4 text-[#001f65] font-medium">Loading images...</p>
            </div>
          ) : carouselImages.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No images available for this partylist</p>
            </div>
          ) : (
            <div className="bg-transparent backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden max-w-2xl mx-auto">
              {/* Carousel */}
              <div 
                className="relative w-full"
                style={{ aspectRatio: '3/4', maxHeight: '75vh' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Current Image */}
                <img
                  src={carouselImages[currentImageIndex]?.dataUrl}
                  alt={carouselImages[currentImageIndex]?.label}
                  className="w-full h-full object-contain"
                  style={{ maxHeight: '75vh' }}
                  onError={(e) => {
                    console.error('Image load error:', e)
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="gray"%3EImage Error%3C/text%3E%3C/svg%3E'
                  }}
                />

                {/* Navigation Arrows */}
                {carouselImages.length > 1 && (
                  <>
                    <button
                      onClick={handlePreviousImage}
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-colors z-10"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-colors z-10"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm z-10">
                  {currentImageIndex + 1} / {carouselImages.length}
                </div>
              </div>

              {/* Thumbnail Navigation (Desktop) */}
              {carouselImages.length > 1 && (
                <div className="hidden md:flex gap-2 p-4 overflow-x-auto bg-transparent">
                  {carouselImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-20 border-2 rounded-lg overflow-hidden transition-all ${
                        currentImageIndex === index
                          ? 'border-[#001f65] shadow-lg scale-105'
                          : 'border-gray-300 hover:border-[#001f65]/50'
                      }`}
                    >
                      <img
                        src={image.dataUrl}
                        alt={image.label}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Dot Indicators (Mobile) */}
              {carouselImages.length > 1 && (
                <div className="flex md:hidden justify-center gap-2 p-4 bg-transparent">
                  {carouselImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        currentImageIndex === index
                          ? 'bg-[#001f65] w-6'
                          : 'bg-gray-300'
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </VoterLayout>
  )
}