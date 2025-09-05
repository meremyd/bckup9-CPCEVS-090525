"use client"

import { useQuery } from "@tanstack/react-query"
import { userQueries, voterQueries, electionQueries } from "@/lib/queries"

export default function TestPage() {
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: userQueries.getUsers,
  })

  const { data: voters, isLoading: votersLoading } = useQuery({
    queryKey: ["voters"],
    queryFn: voterQueries.getVoters,
  })

  const { data: elections, isLoading: electionsLoading } = useQuery({
    queryKey: ["elections"],
    queryFn: electionQueries.getElections,
  })

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Database Test Page</h1>

        {/* Users Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          {usersLoading ? (
            <p>Loading users...</p>
          ) : (
            <div className="space-y-2">
              {users?.map((user) => (
                <div key={user._id} className="border p-3 rounded">
                  <p>
                    <strong>Username:</strong> {user.username}
                  </p>
                  <p>
                    <strong>Type:</strong> {user.userType}
                  </p>
                  <p>
                    <strong>Active:</strong> {user.isActive ? "Yes" : "No"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voters Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Voters</h2>
          {votersLoading ? (
            <p>Loading voters...</p>
          ) : (
            <div className="space-y-2">
              {voters?.map((voter) => (
                <div key={voter._id} className="border p-3 rounded">
                  <p>
                    <strong>Name:</strong> {voter.firstName} {voter.lastName}
                  </p>
                  <p>
                    <strong>School ID:</strong> {voter.schoolId}
                  </p>
                  <p>
                    <strong>Degree:</strong> {voter.degreeId?.degreeName}
                  </p>
                  <p>
                    <strong>Department:</strong> {voter.degreeId?.department}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Elections Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Elections</h2>
          {electionsLoading ? (
            <p>Loading elections...</p>
          ) : (
            <div className="space-y-2">
              {elections?.map((election) => (
                <div key={election._id} className="border p-3 rounded">
                  <p>
                    <strong>Title:</strong> {election.title}
                  </p>
                  <p>
                    <strong>Year:</strong> {election.electionYear}
                  </p>
                  <p>
                    <strong>Type:</strong> {election.electionType}
                  </p>
                  <p>
                    <strong>Status:</strong> {election.status}
                  </p>
                  <p>
                    <strong>Date:</strong> {new Date(election.electionDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
