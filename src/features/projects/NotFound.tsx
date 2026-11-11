import { Link } from 'react-router'

export function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background text-foreground">
      <p className="text-lg">Page not found.</p>
      <Link to="/" className="text-link underline">
        Back to your projects
      </Link>
    </div>
  )
}
