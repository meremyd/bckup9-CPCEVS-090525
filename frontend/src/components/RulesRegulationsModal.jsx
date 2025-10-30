import { X, BookOpen, CheckCircle } from 'lucide-react'

export default function RulesRegulationsModal({ isOpen, onClose, isFirstLogin = false }) {
  if (!isOpen) return null

  const handleAccept = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#001f65] to-[#003399] text-white p-6 rounded-t-2xl flex items-center justify-between sticky top-0">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 mr-3" />
            <h2 className="text-2xl font-bold">Rules and Regulations</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Section 1: Voter Eligibility */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#001f65] flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              1. Voter Eligibility
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Only registered students with active accounts are eligible to vote</li>
              <li>Each voter must be enrolled in the current academic year</li>
              <li>Voters must belong to the department they are voting for (for departmental elections)</li>
              <li>Each voter is allowed only ONE vote per election</li>
            </ul>
          </div>

          {/* Section 2: Voting Process */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#001f65] flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              2. Voting Process
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Voting is conducted electronically through the official voting system</li>
              <li>Voters must use their own credentials and must not share them with others</li>
              <li>Once a ballot is submitted, it cannot be changed or revoked</li>
              <li>Voting must be completed within the specified ballot duration time</li>
              <li>The system will automatically expire ballots after the allocated time</li>
            </ul>
          </div>

          {/* Section 3: Security and Privacy */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#001f65] flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              3. Security and Privacy
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>All votes are confidential and encrypted</li>
              <li>Voter identity is kept separate from ballot choices</li>
              <li>Do not share your login credentials with anyone</li>
              <li>Report any suspicious activity immediately to election committee</li>
              <li>Change your password regularly for account security</li>
            </ul>
          </div>

          {/* Section 4: Prohibited Actions */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#001f65] flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              4. Prohibited Actions
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Vote buying, selling, or trading is strictly prohibited</li>
              <li>Intimidation or coercion of voters is not allowed</li>
              <li>Attempting to vote multiple times is forbidden</li>
              <li>Sharing or using another person's voting credentials is prohibited</li>
              <li>Any form of election fraud or manipulation is strictly forbidden</li>
            </ul>
          </div>

          {/* Section 5: Election Schedule */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#001f65] flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              5. Election Schedule
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Elections are conducted according to the official schedule</li>
              <li>Voting periods have specific start and end times</li>
              <li>Late votes will not be accepted after the closing time</li>
              <li>Technical issues must be reported immediately to support</li>
            </ul>
          </div>

          {/* Section 6: Technical Requirements */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#001f65] flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              6. Technical Requirements
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Use a stable internet connection when voting</li>
              <li>Ensure your device has sufficient battery or power</li>
              <li>Use updated web browsers for best experience</li>
              <li>Do not close or refresh the page while voting is in progress</li>
              <li>Complete your ballot before the timer expires</li>
            </ul>
          </div>

          {/* Section 7: Penalties */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#001f65] flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              7. Penalties for Violations
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Violation of election rules may result in account suspension</li>
              <li>Fraudulent activities will be reported to university authorities</li>
              <li>Disciplinary actions may be taken according to university policies</li>
              <li>Repeat offenders may face permanent voting privileges revocation</li>
            </ul>
          </div>

          {/* Section 8: Support and Assistance */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#001f65] flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              8. Support and Assistance
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Technical support is available during election periods</li>
              <li>Use the Messages/Support feature for assistance</li>
              <li>Contact election committee for election-related concerns</li>
              <li>FAQ section provides answers to common questions</li>
            </ul>
          </div>

          {/* Agreement Statement */}
          <div className="bg-gray-50 border-l-4 border-[#001f65] p-4 rounded mt-6">
            <p className="text-gray-800 font-medium">
              By using this voting system, you acknowledge that you have read, understood, and agree to abide by all the rules and regulations stated above.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-gray-50 rounded-b-2xl flex justify-end space-x-3 border-t">
          <button
            onClick={handleAccept}
            className="px-6 py-2 bg-[#001f65] text-white rounded-lg hover:bg-[#003399] transition-colors font-medium"
          >
            OK, I Understand
          </button>
        </div>
      </div>
    </div>
  )
}