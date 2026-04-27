import type { Metadata, Viewport } from 'next'
import {
  Inter,
  JetBrains_Mono,
  Press_Start_2P,
  Silkscreen,
  VT323,
} from 'next/font/google'
import { AppShell } from '@/components/app-shell'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

// Arcade-mode fonts (lazy-loaded by the browser; tiny file sizes each)
const vt323 = VT323({
  variable: '--font-vt323',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})
const pressStart2P = Press_Start_2P({
  variable: '--font-press-start-2p',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})
const silkscreen = Silkscreen({
  variable: '--font-silkscreen',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
})
const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'COOKREW',
  description: 'Bring your agents. Cook together.',
  icons: {
    icon: '/cookrew-icon.svg',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${vt323.variable} ${pressStart2P.variable} ${silkscreen.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
