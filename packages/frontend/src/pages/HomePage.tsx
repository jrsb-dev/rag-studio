import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            RAG Studio
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            Open-source testing platform to discover what RAG approach works best for <span className="font-semibold">YOUR</span> corpus
          </p>

          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="text-2xl">The Problem</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Every corpus is different, but everyone uses the same "default" RAG settings because there's no way to test different approaches without hours of re-indexing.
              </p>

              <CardTitle className="text-2xl mb-4">The Solution</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="bg-blue-50/50">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl mb-2">📤</div>
                    <p className="text-sm">Upload YOUR documents</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50/50">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl mb-2">🔧</div>
                    <p className="text-sm">Test multiple configs</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50/50">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl mb-2">📊</div>
                    <p className="text-sm">Compare instantly</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/projects">
                Get Started
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/settings">
                Configure Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
