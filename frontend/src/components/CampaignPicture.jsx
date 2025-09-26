import { Users } from "lucide-react"

export default function CampaignPicture({ candidate }) {
  if (!candidate.campaignPicture) {
    // No campaign picture, show placeholder
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
        <Users className="w-20 h-20" />
      </div>
    )
  }

  // Determine data URL for campaign picture
  const imgSrc = candidate.campaignPicture.startsWith('data:')
    ? candidate.campaignPicture
    : `data:image/jpeg;base64,${candidate.campaignPicture}`

  // Render the image
  return (
    <img
      src={imgSrc}
      alt={`${candidate.name || candidate.fullName} campaign picture`}
      className="w-full h-full object-cover"
      style={{ display: "block" }}
      onError={(e) => {
        e.target.style.display = "none"
        // Optionally show Users icon here if you want
      }}
    />
  )
}