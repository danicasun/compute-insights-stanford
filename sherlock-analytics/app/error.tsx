'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">Something went wrong!</h2>
        <p className="text-muted-foreground mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
