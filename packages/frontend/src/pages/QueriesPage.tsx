import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useProject } from '@/hooks/useProjects'
import { useQueries, useDeleteQuery } from '@/hooks/useQueries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import CreateQueryModal from '@/components/CreateQueryModal'

export default function QueriesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project } = useProject(projectId)
  const { data: queries, isLoading, error } = useQueries(projectId)
  const deleteQuery = useDeleteQuery(projectId!)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { toast } = useToast()

  const handleDelete = async (queryId: string) => {
    if (confirm('Are you sure you want to delete this query?')) {
      try {
        await deleteQuery.mutateAsync(queryId)
        toast({
          title: 'Query deleted',
          description: 'Query was successfully deleted',
        })
      } catch (error) {
        toast({
          title: 'Delete failed',
          description: error instanceof Error ? error.message : 'Failed to delete query',
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="link" asChild className="mb-2 pl-0">
            <Link to={`/projects/${projectId}`}>
              ← Back to Project
            </Link>
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Test Queries</h1>
              {project && (
                <p className="text-muted-foreground mt-1">{project.name}</p>
              )}
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Query
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-muted-foreground">Loading queries...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Error loading queries: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {queries && queries.length === 0 && !isLoading && (
          <Card className="text-center p-12">
            <CardHeader>
              <CardTitle>No queries yet</CardTitle>
              <CardDescription>
                Create test queries to evaluate your RAG configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
                Create Your First Query
              </Button>
            </CardContent>
          </Card>
        )}

        {queries && queries.length > 0 && (
          <div className="space-y-4">
            {queries.map((query) => (
              <Card key={query.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{query.query_text}</CardTitle>
                      {query.ground_truth && (
                        <CardDescription className="mt-2">
                          <span className="font-medium">Expected answer:</span> {query.ground_truth}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(query.id)}
                      disabled={deleteQuery.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        <CreateQueryModal
          projectId={projectId!}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    </div>
  )
}
