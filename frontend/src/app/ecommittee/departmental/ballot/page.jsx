"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ballotAPI } from "@/lib/api/ballots"
import { departmentalElectionsAPI } from "@/lib/api/departmentalElections"
import DepartmentalLayout from "@/components/DepartmentalLayout"
import Swal from 'sweetalert2'
import { 
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  User,
  Shield,
  Settings,
  Plus,
  Minus,
  Timer,
  Save,
  BookOpen,
  Play,
  Square,
  Eye,
  Calendar
} from "lucide-react"

export default function DepartmentalBallotPreviewPage() {
  const [election, setElection] = useState(null)
  const [availablePositions, setAvailablePositions] = useState([])
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0)
  const [ballotPreview, setBallotPreview] = useState(null)
  const [selectedVote, setSelectedVote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Timing controls
  const [showTimerForm, setShowTimerForm] = useState(false)
  const [ballotOpenTime, setBallotOpenTime] = useState('')
  const [ballotCloseTime, setBallotCloseTime] = useState('')
  const [savingTiming, setSavingTiming] = useState(false)
  
  // Year level controls
  const [showYearLevelForm, setShowYearLevelForm] = useState(false)
  const [yearLevels, setYearLevels] = useState([1, 2, 3, 4])
  const [savingYearLevel, setSavingYearLevel] = useState(false)
  
  // Ballot status
  const [ballotStatus, setBallotStatus] = useState('closed')
  const [ballotTiming, setBallotTiming] = useState(null)
  const [activeBallots, setActiveBallots] = useState(0)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const deptElectionId = searchParams.get('deptElectionId')

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/adminlogin")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (!["admin", "election_committee"].includes(parsedUser.userType)) {
        router.push("/adminlogin")
        return
      }
    } catch (parseError) {
      console.error("Error parsing user data:", parseError)
      router.push("/adminlogin")
      return
    }

    if (deptElectionId) {
      initializeBallotPreview()
    } else {
      router.push('/ecommittee/departmental')
    }
  }, [deptElectionId])

  const initializeBallotPreview = async () => {
    try {
      setLoading(true)

      const [electionResponse, positionsResponse] = await Promise.all([
        departmentalElectionsAPI.getById(deptElectionId),
        ballotAPI.getPositionsForPreview(deptElectionId)
      ])

      setElection(electionResponse.election)
      setAvailablePositions(positionsResponse.availablePositions || [])

      if (positionsResponse.availablePositions && positionsResponse.availablePositions.length > 0) {
        await loadPositionPreview(positionsResponse.availablePositions[0]._id)
      }

    } catch (error) {
      console.error('Error initializing ballot preview:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to load ballot preview.',
        confirmButtonColor: '#001f65'
      }).then(() => {
        router.push('/ecommittee/departmental')
      })
    } finally {
      setLoading(false)
    }
  }

 const loadPositionPreview = async (positionId) => {
  try {
    setLoading(true)
    
    const [previewResponse, timingResponse] = await Promise.all([
      ballotAPI.previewDepartmentalBallot(deptElectionId, positionId),
      ballotAPI.getDepartmentalPositionBallotTiming(positionId)
    ])
    
    setBallotPreview(previewResponse)
    
    const timing = timingResponse.data?.timing
    setBallotTiming(timing)
    setActiveBallots(timing?.activeBallots || 0)
    
    
    if (timing?.ballotOpenTime) {
  setBallotOpenTime(formatTimeForInput(new Date(timing.ballotOpenTime)))
  console.log('Loaded ballotOpenTime:', timing.ballotOpenTime, '→ Formatted:', formatTimeForInput(new Date(timing.ballotOpenTime)))  // ✅ Debug
} else {
  setBallotOpenTime('')
}

if (timing?.ballotCloseTime) {
  setBallotCloseTime(formatTimeForInput(new Date(timing.ballotCloseTime)))
  console.log('Loaded ballotCloseTime:', timing.ballotCloseTime, '→ Formatted:', formatTimeForInput(new Date(timing.ballotCloseTime)))  // ✅ Debug
} else {
  setBallotCloseTime('')
}
    
    setBallotStatus(timing?.isOpen ? 'open' : 'closed')
    
    // Parse year levels from description
    if (previewResponse.position?.description) {
      const allowedLevels = parseYearLevels(previewResponse.position.description)
      setYearLevels(allowedLevels)
    } else {
      setYearLevels([1, 2, 3, 4])
    }
    
  } catch (error) {
    console.error('Error loading position preview:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to load position preview.',
      confirmButtonColor: '#001f65'
    })
  } finally {
    setLoading(false)
  }
}

  const parseYearLevels = (description) => {
    if (!description) return [1, 2, 3, 4]
    
    const yearLevelMatch = description.match(/Year levels?: (.*?)(?:\n|$)/)
    if (!yearLevelMatch) return [1, 2, 3, 4]
    
    const restrictionText = yearLevelMatch[1]
    if (restrictionText.includes('All year levels')) return [1, 2, 3, 4]
    
    const allowedLevels = []
    if (restrictionText.includes('1st')) allowedLevels.push(1)
    if (restrictionText.includes('2nd')) allowedLevels.push(2)
    if (restrictionText.includes('3rd')) allowedLevels.push(3)
    if (restrictionText.includes('4th')) allowedLevels.push(4)
    
    return allowedLevels.length > 0 ? allowedLevels : [1, 2, 3, 4]
  }

  const formatTimeForInput = (date) => {
  if (!date) return ''
  
  const d = new Date(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  
  return `${hours}:${minutes}`
}

  const formatTime = (minutes) => {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins} minutes`
  }

const handleSaveBallotTiming = async () => {
  if (!ballotPreview?.position) return

  // Validate that at least one time is provided
  if (!ballotOpenTime && !ballotCloseTime) {
    Swal.fire({
      icon: 'warning',
      title: 'Missing Information',
      text: 'Please provide at least open time or close time.',
      confirmButtonColor: '#001f65'
    })
    return
  }


  if (!election?.electionDate) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Election date not found. Cannot set ballot timing.',
      confirmButtonColor: '#001f65'
    })
    return
  }

  try {
    setSavingTiming(true)
    
    const timingData = {}

    // ✅ FIX: Use election date as base, not today's date
    const electionDate = new Date(election.electionDate)
    
    if (ballotOpenTime) {
      const [hours, minutes] = ballotOpenTime.split(':')
      const openDate = new Date(electionDate)  // ✅ Use election date
      openDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      timingData.ballotOpenTime = openDate.toISOString()  // ✅ Convert to ISO string
    }

    if (ballotCloseTime) {
      const [hours, minutes] = ballotCloseTime.split(':')
      const closeDate = new Date(electionDate)  // ✅ Use election date
      closeDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      timingData.ballotCloseTime = closeDate.toISOString()  // ✅ Convert to ISO string
    }

    // ✅ Validate close time is after open time
    if (ballotOpenTime && ballotCloseTime) {
      const openMinutes = parseInt(ballotOpenTime.split(':')[0]) * 60 + parseInt(ballotOpenTime.split(':')[1])
      const closeMinutes = parseInt(ballotCloseTime.split(':')[0]) * 60 + parseInt(ballotCloseTime.split(':')[1])
      
      if (closeMinutes <= openMinutes) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Time Range',
          text: 'Close time must be after open time.',
          confirmButtonColor: '#001f65'
        })
        setSavingTiming(false)
        return
      }
    }

    console.log('Sending timing data:', timingData)  // ✅ Debug log

    await ballotAPI.updateDepartmentalPositionBallotTiming(
      ballotPreview.position._id, 
      timingData
    )
    
    setShowTimerForm(false)
    
    await Swal.fire({
      icon: 'success',
      title: 'Ballot Timing Updated',
      html: `
        <div style="text-align: left; padding: 20px;">
          <p style="margin-bottom: 10px;"><strong>Position:</strong> ${ballotPreview.position.positionName}</p>
          <p style="margin-bottom: 10px;"><strong>Election Date:</strong> ${new Date(election.electionDate).toLocaleDateString()}</p>
          ${ballotOpenTime ? `<p style="margin-bottom: 10px;"><strong>Open Time:</strong> ${ballotOpenTime}</p>` : ''}
          ${ballotCloseTime ? `<p style="margin-bottom: 10px;"><strong>Close Time:</strong> ${ballotCloseTime}</p>` : ''}
          <p style="margin-top: 15px; color: #059669;">✓ Timing updated successfully</p>
        </div>
      `,
      confirmButtonColor: '#001f65'
    })

    await loadPositionPreview(ballotPreview.position._id)
    
  } catch (error) {
    console.error('Error saving ballot timing:', error)
    Swal.fire({
      icon: 'error',
      title: 'Save Failed',
      text: error.response?.data?.message || 'Failed to update ballot timing.',
      confirmButtonColor: '#001f65'
    })
  } finally {
    setSavingTiming(false)
  }
}

  const handleYearLevelUpdate = async () => {
    if (!ballotPreview?.position) return

    if (yearLevels.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Selection',
        text: 'Please select at least one year level.',
        confirmButtonColor: '#001f65'
      })
      return
    }

    try {
      setSavingYearLevel(true)
      
      await ballotAPI.updateDepartmentalPositionYearLevel(
        ballotPreview.position._id, 
        yearLevels
      )
      
      setShowYearLevelForm(false)
      
      const levelText = yearLevels.length === 4 ? 'All year levels' : 
        yearLevels.map(level => `${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'} Year`).join(', ')
      
      await Swal.fire({
        icon: 'success',
        title: 'Year Level Restriction Updated',
        html: `
          <div style="text-align: left; padding: 20px;">
            <p style="margin-bottom: 10px;"><strong>Position:</strong> ${ballotPreview.position.positionName}</p>
            <p style="margin-bottom: 10px;"><strong>Allowed Year Levels:</strong> ${levelText}</p>
            <p style="margin-top: 15px; color: #059669;">✓ Only students from these year levels can vote for this position</p>
          </div>
        `,
        confirmButtonColor: '#001f65'
      })
      
      await loadPositionPreview(ballotPreview.position._id)
      
    } catch (error) {
      console.error('Error updating year level restriction:', error)
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.response?.data?.message || 'Failed to update year level restriction',
        confirmButtonColor: '#001f65'
      })
    } finally {
      setSavingYearLevel(false)
    }
  }

  const toggleYearLevel = (level) => {
    setYearLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level].sort()
    )
  }

  const openBallotForPosition = async () => {
  if (!ballotPreview?.position) return

  const result = await Swal.fire({
    title: "Open Ballot for Position?",
    html: `
      <div style="text-align: left;">
        <p><strong>Position:</strong> ${ballotPreview.position.positionName}</p>
        <p><strong>Current Time Window:</strong> ${ballotOpenTime || 'Not set'} - ${ballotCloseTime || 'Not set'}</p>
        <p><strong>Eligible Year Levels:</strong> ${yearLevels.map(level => 
          `${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'}`
        ).join(', ')}</p>
        <p><strong>Candidates:</strong> ${ballotPreview?.candidates?.length || 0}</p>
        <br>
        <p style="color: #059669;">This will immediately open voting for this position. Ballot will close at the configured time or in 2 hours (default).</p>
      </div>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#22c55e",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Yes, open ballot",
    cancelButtonText: "Cancel",
  })

    if (result.isConfirmed) {
      try {
        setLoading(true)
        await ballotAPI.openDepartmentalPositionBallot(ballotPreview.position._id)
        
        setBallotStatus('open')
        
        await Swal.fire({
          icon: "success",
          title: "Ballot Opened!",
          text: `Voting is now open for ${ballotPreview.position.positionName}`,
          confirmButtonColor: "#001f65",
        })
        
        await loadPositionPreview(ballotPreview.position._id)
      } catch (error) {
        console.error('Error opening ballot:', error)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to open ballot',
          confirmButtonColor: '#001f65'
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const closeBallotForPosition = async () => {
    if (!ballotPreview?.position) return

    const result = await Swal.fire({
      title: "Close Ballot for Position?",
      html: `
        <div style="text-align: left;">
          <p><strong>Position:</strong> ${ballotPreview.position.positionName}</p>
          ${activeBallots > 0 ? `<p style="color: #dc2626;"><strong>Warning:</strong> ${activeBallots} active ballot(s) will be expired</p>` : ''}
          <p style="color: #dc2626;">This will immediately close voting for this position. No more votes can be submitted.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, close ballot",
      cancelButtonText: "Cancel",
    })

    if (result.isConfirmed) {
      try {
        setLoading(true)
        const response = await ballotAPI.closeDepartmentalPositionBallot(ballotPreview.position._id)
        
        setBallotStatus('closed')
        
        await Swal.fire({
          icon: "success",
          title: "Ballot Closed!",
          html: `
            <div style="text-align: left;">
              <p>Voting is now closed for ${ballotPreview.position.positionName}</p>
              ${response.data?.expiredBallots > 0 ? `<p style="margin-top: 10px; color: #dc2626;">Expired ${response.data.expiredBallots} active ballot(s)</p>` : ''}
            </div>
          `,
          confirmButtonColor: "#001f65",
        })
        
        await loadPositionPreview(ballotPreview.position._id)
      } catch (error) {
        console.error('Error closing ballot:', error)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to close ballot',
          confirmButtonColor: '#001f65'
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const handlePreviewMode = () => {
    Swal.fire({
      icon: "info",
      title: "Preview Mode",
      html: `
        <div style="text-align: left; padding: 20px;">
          <p style="margin-bottom: 10px;">You are viewing the ballot as voters will see it.</p>
          <p style="margin-bottom: 10px;">• Select candidates to test the interface</p>
          <p style="margin-bottom: 10px;">• No actual votes will be recorded</p>
          <p style="margin-bottom: 10px;">• Use this to verify ballot appearance</p>
        </div>
      `,
      confirmButtonColor: "#001f65",
    })
  }

  const handleVoteSelection = (candidateId) => {
    setSelectedVote(candidateId)
  }

  const isSelected = (candidateId) => {
    return selectedVote === candidateId
  }

  const handlePositionChange = async (newIndex) => {
    if (newIndex < 0 || newIndex >= availablePositions.length) return
    
    setCurrentPositionIndex(newIndex)
    setSelectedVote(null)
    const position = availablePositions[newIndex]
    if (position) {
      await loadPositionPreview(position._id)
    }
  }

  const handleNext = () => {
    if (currentPositionIndex < availablePositions.length - 1) {
      handlePositionChange(currentPositionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentPositionIndex > 0) {
      handlePositionChange(currentPositionIndex - 1)
    }
  }

  const handleSubmit = async () => {
    if (!selectedVote) {
      Swal.fire({
        icon: "warning",
        title: "No Vote Selected",
        text: "Please select a candidate before submitting the test ballot.",
        confirmButtonColor: "#001f65",
      })
      return
    }

    const selectedCandidate = ballotPreview?.candidates?.find(c => c._id === selectedVote)
    
    const result = await Swal.fire({
      icon: 'question',
      title: 'Preview Test Ballot',
      html: `
        <div style="text-align: left; padding: 20px;">
          <p style="margin-bottom: 15px; font-weight: bold; color: #d97706;">⚠️ PREVIEW MODE - NO VOTES WILL BE RECORDED</p>
          <p style="margin-bottom: 10px;">This is a ballot preview for testing purposes only.</p>
          <p style="margin-bottom: 10px;"><strong>NO actual votes will be submitted</strong> to the database.</p>
          <p>Continue to see your selection summary?</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#001f65',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'View Summary',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) return

    try {
      setSubmitting(true)

      await Swal.fire({
        icon: 'success',
        title: 'Ballot Preview Summary',
        html: `
          <div style="text-align: left; padding: 20px;">
            <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-weight: bold; color: #92400e;">🔒 PREVIEW MODE - NOT SUBMITTED</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #78350f;">No votes were recorded in the database.</p>
            </div>
            
            <p style="margin-bottom: 15px;"><strong>Election:</strong> ${election?.title || 'Departmental Election'}</p>
            <p style="margin-bottom: 15px;"><strong>Position:</strong> ${ballotPreview?.position?.positionName}</p>
            
            <div style="margin-top: 20px;">
              <strong>Your Selection:</strong>
              <div style="padding: 10px; margin: 10px 0; background: #f3f4f6; border-radius: 6px;">
                <strong>${ballotPreview?.position?.positionName}:</strong><br>
                #${selectedCandidate?.candidateNumber} - ${selectedCandidate?.name}
              </div>
            </div>
          </div>
        `,
        confirmButtonColor: '#001f65',
        confirmButtonText: 'Close Preview',
        width: '600px'
      })

      setSelectedVote(null)

    } catch (error) {
      console.error('Error in preview:', error)
      Swal.fire({
        icon: 'error',
        title: 'Preview Error',
        text: 'An error occurred while generating the preview.',
        confirmButtonColor: '#001f65'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getCampaignPictureUrl = (candidate) => {
    if (candidate.campaignPicture) {
      if (candidate.campaignPicture.startsWith('data:')) {
        return candidate.campaignPicture
      } else {
        return `data:image/jpeg;base64,${candidate.campaignPicture}`
      }
    }
    return `/api/candidates/user/${candidate._id}/campaign-picture`
  }

  if (loading && !ballotPreview) {
    return (
      <DepartmentalLayout
        deptElectionId={deptElectionId}
        title="Departmental Ballot Preview"
        subtitle="Election Committee Testing Interface"
        activeItem="ballot"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading ballot preview...</p>
          </div>
        </div>
      </DepartmentalLayout>
    )
  }

  if (!election || availablePositions.length === 0) {
    return (
      <DepartmentalLayout
        deptElectionId={deptElectionId}
        title="Departmental Ballot Preview"
        subtitle="Election Committee Testing Interface"
        activeItem="ballot"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
            <p className="text-gray-600 mb-4 text-center">
              {!election ? 'Failed to load election' : 'No positions available for this election'}
            </p>
            <button
              onClick={() => router.push('/ecommittee/departmental')}
              className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </DepartmentalLayout>
    )
  }

  const currentPosition = ballotPreview?.position

  return (
    <DepartmentalLayout
      deptElectionId={deptElectionId}
      title="Departmental Ballot Preview"
      subtitle="Election Committee Testing Interface"
      activeItem="ballot"
    >
      <div className="pt-6 pb-6 px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Controls */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="bg-blue-100/90 backdrop-blur-md text-blue-800 px-4 py-2 rounded-full text-sm flex items-center border border-blue-200">
                <Shield className="w-4 h-4 mr-2" />
                Testing Mode - Position-Based Control
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Position Selector */}
                <select
                  value={currentPositionIndex}
                  onChange={(e) => handlePositionChange(parseInt(e.target.value))}
                  className="flex-1 lg:flex-initial px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent bg-white text-sm"
                >
                  {availablePositions.map((position, index) => (
                    <option key={position._id} value={index}>
                      {position.positionName}
                    </option>
                  ))}
                </select>

                {/* Ballot Duration Display */}
                {ballotOpenTime && ballotCloseTime && (
  <div className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md border bg-blue-500/90 text-white border-blue-400">
    <Clock className="w-4 h-4" />
    <span className="font-bold text-sm">
      {ballotOpenTime} - {ballotCloseTime}
    </span>
  </div>
)}
                
                {/* Control Buttons - Icon Only on Mobile */}
                <button
                  onClick={() => setShowYearLevelForm(!showYearLevelForm)}
                  className="p-2 bg-purple-600/90 hover:bg-purple-700 backdrop-blur-md text-white rounded-lg transition-colors border border-purple-500 flex items-center gap-2"
                  title="Year Level Settings"
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="hidden xl:inline text-sm">Year Level</span>
                </button>

                <button
                  onClick={() => setShowTimerForm(!showTimerForm)}
                  className="p-2 bg-orange-600/90 hover:bg-orange-700 backdrop-blur-md text-white rounded-lg transition-colors border border-orange-500 flex items-center gap-2"
                  title="Ballot Timer Settings"
                >
                  <Settings className="w-5 h-5" />
                  <span className="hidden xl:inline text-sm">Timer</span>
                </button>

                <button
                  onClick={handlePreviewMode}
                  className="p-2 bg-blue-600/90 hover:bg-blue-700 backdrop-blur-md text-white rounded-lg transition-colors border border-blue-500 flex items-center gap-2"
                  title="Preview Mode"
                >
                  <Eye className="w-5 h-5" />
                  <span className="hidden xl:inline text-sm">Preview</span>
                </button>

                <button
                  onClick={openBallotForPosition}
                  disabled={ballotStatus === 'open'}
                  className="p-2 bg-green-600/90 hover:bg-green-700 disabled:bg-gray-400 backdrop-blur-md text-white rounded-lg transition-colors border border-green-500 flex items-center gap-2"
                  title="Open Ballot"
                >
                  <Play className="w-5 h-5" />
                  <span className="hidden xl:inline text-sm">Open</span>
                </button>

                <button
                  onClick={closeBallotForPosition}
                  disabled={ballotStatus === 'closed'}
                  className="p-2 bg-red-600/90 hover:bg-red-700 disabled:bg-gray-400 backdrop-blur-md text-white rounded-lg transition-colors border border-red-500 flex items-center gap-2"
                  title="Close Ballot"
                >
                  <Square className="w-5 h-5" />
                  <span className="hidden xl:inline text-sm">Close</span>
                </button>
              </div>
            </div>

            {/* Year Level Form */}
            {showYearLevelForm && currentPosition && (
              <div className="bg-purple-50/95 backdrop-blur-md border-2 border-purple-300 rounded-lg p-4 md:p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-purple-900 flex items-center text-base md:text-lg">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Configure Year Level Restrictions
                  </h4>
                  <button
                    onClick={() => setShowYearLevelForm(false)}
                    className="text-purple-600 hover:text-purple-800 text-xl"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 md:p-4 mb-4">
                  <p className="text-purple-900 text-xs md:text-sm">
                    ⚠️ Only voters from selected year levels will be able to vote for "{currentPosition.positionName}".
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 mb-4">
                  <span className="text-sm text-purple-700 font-medium">Allowed Year Levels:</span>
                  <div className="flex flex-wrap gap-3">
                    {[1, 2, 3, 4].map((level) => (
                      <label key={level} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={yearLevels.includes(level)}
                          onChange={() => toggleYearLevel(level)}
                          className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-purple-700">
                          {level}{level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'} Year
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleYearLevelUpdate}
                    disabled={savingYearLevel || yearLevels.length === 0}
                    className="flex-1 px-4 md:px-6 py-2 md:py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    {savingYearLevel ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Restrictions
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowYearLevelForm(false)}
                    className="px-4 md:px-6 py-2 md:py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-semibold text-sm md:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Ballot Timer Settings Form */}
{showTimerForm && currentPosition && (
  <div className="bg-orange-50/95 backdrop-blur-md border-2 border-orange-300 rounded-lg p-4 md:p-6 shadow-lg">
    <div className="flex items-center justify-between mb-4">
      <h4 className="font-bold text-orange-900 flex items-center text-base md:text-lg">
        <Timer className="w-5 h-5 mr-2" />
        Configure Ballot Timing
      </h4>
      <button
        onClick={() => setShowTimerForm(false)}
        className="text-orange-600 hover:text-orange-800 text-xl"
      >
        ✕
      </button>
    </div>
    
    <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 md:p-4 mb-4">
      <p className="text-orange-900 text-xs md:text-sm">
        ⚠️ Configure when voting opens/closes for this position.
      </p>
    </div>

    {/* REMOVED: Duration Control Section */}
    
    {/* Open/Close Time - KEEP THIS */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <div>
        <label className="text-sm font-medium text-orange-900 mb-2 block">Open Time</label>
        <input
          type="time"
          value={ballotOpenTime}
          onChange={(e) => setBallotOpenTime(e.target.value)}
          className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-orange-900 mb-2 block">Close Time</label>
        <input
          type="time"
          value={ballotCloseTime}
          onChange={(e) => setBallotCloseTime(e.target.value)}
          className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
      </div>
    </div>

    <div className="flex flex-col sm:flex-row gap-2">
      <button
        onClick={handleSaveBallotTiming}
        disabled={savingTiming}
        className="flex-1 px-4 md:px-6 py-2 md:py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 text-sm md:text-base"
      >
        {savingTiming ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Save Timing
          </>
        )}
      </button>
      <button
        onClick={() => setShowTimerForm(false)}
        className="px-4 md:px-6 py-2 md:py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-semibold text-sm md:text-base"
      >
        Cancel
      </button>
    </div>

    {/* UPDATED: Help text */}
    <div className="mt-4 text-xs md:text-sm text-orange-800">
      <p>• Set open and close times to control when voting is available</p>
      <p>• Use "Open Ballot" button for immediate opening with current time</p>
      <p>• Times are based on server time (Philippine Time)</p>
    </div>
  </div>
)}
          </div>
          
          {/* Header with Logos and Election Title */}
          <div className="relative mb-6 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <img 
                src="/ssglogo.jpg" 
                alt="SSG Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                onError={(e) => e.target.style.display = 'none'}
              />
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                  {election?.title || 'DEPARTMENTAL ELECTION'}
                </h1>
                {election?.electionDate && (
                  <p className="text-white/90 text-base md:text-lg mt-2 flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                    {new Date(election.electionDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
              <img 
                src="/cpclogo.png" 
                alt="CPC Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
            
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mt-4">
              {currentPosition?.positionName || 'Position'}
            </h2>
            <p className="text-white/80 text-sm sm:text-base md:text-lg mt-2">
              Select one candidate for this position
            </p>
            
            {/* Ballot Status Indicator */}
            <div className="mt-4">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-white font-medium text-sm ${
                ballotStatus === 'open' ? 'bg-green-600/90' : 'bg-red-600/90'
              }`}>
                {ballotStatus === 'open' && `🟢 Ballot Open ${activeBallots > 0 ? `(${activeBallots} active)` : ''}`}
                {ballotStatus === 'closed' && '🔴 Ballot Closed'}
              </div>
            </div>
          </div>


          {/* Candidates Grid */}
          <div className="flex justify-center mb-8">
            <div className={`grid gap-8 justify-items-center ${
              ballotPreview?.candidates?.length === 1
                ? 'grid-cols-1'
                : ballotPreview?.candidates?.length === 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-4xl'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl'
            }`}>
              {ballotPreview?.candidates?.map((candidate) => {
                const selected = isSelected(candidate._id)
                
                return (
                  <div
                    key={candidate._id}
                    onClick={() => handleVoteSelection(candidate._id)}
                    className={`relative cursor-pointer transition-all duration-300 w-full max-w-[320px] rounded-lg overflow-hidden ${
                      selected
                        ? 'ring-4 ring-white shadow-2xl scale-105'
                        : 'shadow-lg hover:shadow-xl hover:scale-102'
                    }`}
                  >
                    <div className={`h-full flex flex-col transition-all duration-300 ${
                      selected ? 'bg-[#001f65]' : 'bg-white'
                    }`}>
                      
                      <div className="relative w-full h-72 bg-gray-200 overflow-hidden flex-shrink-0">
                        {candidate.hasCampaignPicture ? (
                          <img
                            src={getCampaignPictureUrl(candidate)}
                            alt={candidate.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextElementSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center ${candidate.hasCampaignPicture ? 'hidden' : 'flex'}`}>
                          <User className="w-24 h-24 text-gray-400" />
                        </div>
                        
                        {selected && (
                          <div className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center z-30 shadow-lg">
                            <CheckCircle className="w-6 h-6 text-[#001f65] font-bold stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 p-5 text-center flex flex-col justify-end">
                        <div className={`-mx-5 -mb-5 p-4 transition-all duration-300 ${
                          selected
                            ? 'bg-[#001f65] text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}>
                          <p className="text-base font-bold">
                            {candidate.candidateNumber}. {candidate.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Position Progress Bar */}
          <div className="mt-8 text-center">
            <div className="w-full max-w-md mx-auto bg-white/20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentPositionIndex + 1) / availablePositions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedVote}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 md:px-12 py-3 md:py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-base md:text-lg flex items-center gap-3 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5 md:w-6 md:h-6" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                  View Selection Summary
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DepartmentalLayout>
  )
}