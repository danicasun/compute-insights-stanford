import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Go back home
        </Link>
      </div>
    </div>
  )
}
