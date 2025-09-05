"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function VoterDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [votingStatus, setVotingStatus] = useState("registered")
  const [upcomingElections, setUpcomingElections] = useState([])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    const token = localStorage.getItem("token")

    if (!userData || !token) {
      router.push("/voterlogin")
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    // Mock data for upcoming elections
    setUpcomingElections([
      {
        id: 1,
        title: "Student Government Elections 2025",
        date: "March 15, 2025",
        description: "Vote for your student representatives",
        status: "upcoming",
      },
      {
        id: 2,
        title: "Class Officer Elections",
        date: "April 10, 2025",
        description: "Choose your class officers",
        status: "upcoming",
      },
    ])

    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    router.push("/voterlogin")
  }

  const handleVote = (electionId) => {
    // Navigate to voting page
    router.push(`/voter/vote/${electionId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src="/voteicon.png" alt="Vote Icon" className="w-8 h-8" />
              <h1 className="text-xl font-bold text-primary">Voter Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">Welcome, {user?.username}</div>
              <button
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Voting Status Section */}
            <section className="bg-card rounded-lg border border-border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Voting Status</h2>
              <div className="flex items-center space-x-4">
                <div
                  className={`w-4 h-4 rounded-full ${
                    votingStatus === "registered" ? "bg-accent" : votingStatus === "voted" ? "bg-chart-3" : "bg-muted"
                  }`}
                ></div>
                <div>
                  <p className="font-medium text-card-foreground">
                    {votingStatus === "registered"
                      ? "Registered to Vote"
                      : votingStatus === "voted"
                        ? "Vote Submitted"
                        : "Not Registered"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {votingStatus === "registered"
                      ? "You are eligible to participate in elections"
                      : votingStatus === "voted"
                        ? "Thank you for participating"
                        : "Complete registration to vote"}
                  </p>
                </div>
              </div>
            </section>

            {/* Upcoming Elections */}
            <section className="bg-card rounded-lg border border-border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-card-foreground mb-6">Upcoming Elections</h2>
              <div className="space-y-4">
                {upcomingElections.length > 0 ? (
                  upcomingElections.map((election) => (
                    <div
                      key={election.id}
                      className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-card-foreground mb-1">{election.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{election.description}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-accent font-medium">📅 {election.date}</span>
                            <span className="px-2 py-1 bg-accent/10 text-accent rounded-full text-xs">
                              {election.status}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleVote(election.id)}
                          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors ml-4"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🗳️</div>
                    <p className="text-muted-foreground">No upcoming elections at this time</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* User Profile Card */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Profile Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                  <p className="text-card-foreground">{user?.username}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                  <p className="text-card-foreground capitalize">{user?.userType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Registration Status</label>
                  <p className="text-accent font-medium">Active</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-secondary text-secondary-foreground px-4 py-3 rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors flex items-center justify-center space-x-2">
                  <span>📊</span>
                  <span>View Voting History</span>
                </button>
                <button className="w-full bg-muted text-muted-foreground px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors flex items-center justify-center space-x-2">
                  <span>⚙️</span>
                  <span>Account Settings</span>
                </button>
                <button className="w-full bg-muted text-muted-foreground px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors flex items-center justify-center space-x-2">
                  <span>❓</span>
                  <span>Help & Support</span>
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Voting System</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-chart-3 rounded-full"></div>
                    <span className="text-sm text-chart-3 font-medium">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="text-sm text-muted-foreground">Just now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
