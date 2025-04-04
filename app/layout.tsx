import React from 'react'
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Script-to-Image Generator',
  description: 'Transform your imagination into stunning visuals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 