import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">RS</span>
                </div>
                <span className="font-bold text-xl">RAG Studio</span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                <Button
                  variant={isActive('/projects') ? 'secondary' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link to="/projects">Projects</Link>
                </Button>
                <Button
                  variant={isActive('/settings') ? 'secondary' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link to="/settings">Settings</Link>
                </Button>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://github.com/anthropics/rag-studio"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>RAG Studio - Open Source RAG Testing Platform</p>
            <p>Built with FastAPI + React</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
