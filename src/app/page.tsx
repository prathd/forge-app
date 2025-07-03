'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Try to navigate programmatically
    try {
      router.push('/dashboard')
    } catch (error) {
      console.error('Navigation error:', error)
      // Fallback to window.location if router fails
      window.location.href = '/dashboard'
    }
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Forge</h1>
        <div className="mt-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          If you&apos;re not redirected, <Link href="/dashboard" className="underline">click here</Link>
        </p>
      </div>
    </div>
  )
}