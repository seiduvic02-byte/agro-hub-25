import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgroHub — Farm operations, connected',
  description: 'A trusted workspace for farm communication, verification, transactions, and delivery tracking.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
