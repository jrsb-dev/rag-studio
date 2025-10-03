import { useParams, Link } from 'react-router-dom'
import { useProject } from '@/hooks/useProjects'
import { useDocuments } from '@/hooks/useDocuments'
import { useConfigs } from '@/hooks/useConfigs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: documents } = useDocuments(projectId)
  const { data: configs } = useConfigs(projectId)

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>Project not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/projects">
                Back to Projects
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="link" asChild className="mb-2 pl-0">
            <Link to="/projects">
              ← Back to Projects
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-2">{project.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {documents?.length || 0}
              </p>
              <Button variant="link" asChild className="mt-2 pl-0">
                <Link to={`/projects/${projectId}/documents`}>
                  Manage documents →
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {configs?.length || 0}
              </p>
              <Button variant="link" asChild className="mt-2 pl-0">
                <Link to={`/projects/${projectId}/configs`}>
                  Manage configs →
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Experiments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">0</p>
              <Button variant="link" asChild className="mt-2 pl-0">
                <Link to={`/projects/${projectId}/experiments`}>
                  Run experiments →
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Follow these steps to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              <li>Upload documents to test (PDF, TXT, or Markdown)</li>
              <li>Create RAG configurations with different settings</li>
              <li>Add test queries to evaluate</li>
              <li>Run experiments to compare configurations</li>
              <li>Export the winning configuration</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
