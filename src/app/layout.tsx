import type { Metadata } from "next"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/navbar"
import "./globals.css"

export const metadata: Metadata = {
  title: "GreenHub - GitHub Contribution Reminder",
  description:
    "Never break your GitHub contribution streak. Get email reminders when you haven't committed today.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
