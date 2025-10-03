import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProject } from '@/hooks/useProjects'
import { useExperiments } from '@/hooks/useExperiments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDistanceToNow } from 'date-fns'

export default function ExperimentsListPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { data: project } = useProject(projectId)
  const { data: experiments, isLoading, error } = useExperiments(projectId)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>
      case 'running':
        return <Badge variant="secondary">Running</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return dateString
    }
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Experiment History</h1>
            <p className="text-muted-foreground mt-1">View all experiments for this project</p>
          </div>
          <Button onClick={() => navigate(`/projects/${projectId}/experiments`)}>
            Run New Experiment
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-muted-foreground">Loading experiments...</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading experiments: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {experiments && experiments.length === 0 && !isLoading && (
        <Card className="text-center p-12">
          <CardHeader>
            <CardTitle>No experiments yet</CardTitle>
            <CardDescription>
              Run your first experiment to compare RAG configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/projects/${projectId}/experiments`)} size="lg">
              Run Your First Experiment
            </Button>
          </CardContent>
        </Card>
      )}

      {experiments && experiments.length > 0 && (
        <div className="space-y-4">
          {experiments.map((experiment) => (
            <Card
              key={experiment.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/projects/${projectId}/experiments/${experiment.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {experiment.name || `Experiment ${experiment.id.slice(0, 8)}`}
                      </CardTitle>
                      {getStatusBadge(experiment.status)}
                    </div>
                    <CardDescription className="mt-1">
                      Created {formatDate(experiment.created_at)}
                      {experiment.completed_at && ` • Completed ${formatDate(experiment.completed_at)}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Configurations:</span>
                    <span className="ml-2 font-medium">{experiment.config_ids.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Test Queries:</span>
                    <span className="ml-2 font-medium">{experiment.query_ids.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Tests:</span>
                    <span className="ml-2 font-medium">
                      {experiment.config_ids.length * experiment.query_ids.length}
                    </span>
                  </div>
                  {experiment.status === 'failed' && experiment.error_message && (
                    <div className="col-span-2">
                      <span className="text-destructive text-xs">{experiment.error_message}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/projects/${projectId}/experiments/${experiment.id}`)
                  }}
                >
                  View Results →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
