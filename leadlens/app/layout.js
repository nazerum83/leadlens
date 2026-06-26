import './globals.css'

export const metadata = {
  title: 'LeadLens — AI-Powered Lead Intelligence',
  description: 'Find, audit, score and convert B2B leads with AI',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
