import "./globals.css"
import QueryProvider from "@/components/QueryProvider"

export const metadata = {
  title: "E-Voting System",
  description: "School E-Voting System",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
