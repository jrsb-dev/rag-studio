import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useProject } from '@/hooks/useProjects'
import { useConfigs } from '@/hooks/useConfigs'
import { useQueries } from '@/hooks/useQueries'
import { useCreateExperiment } from '@/hooks/useExperiments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import CreateExperimentModal from '@/components/CreateExperimentModal'

export default function ExperimentsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { data: project } = useProject(projectId)
  const { data: configs } = useConfigs(projectId)
  const { data: queries } = useQueries(projectId)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { toast } = useToast()

  const hasRequirements = configs && configs.length > 0 && queries && queries.length > 0

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Experiments</h1>
            <p className="text-muted-foreground mt-1">Compare RAG configurations</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!hasRequirements}
          >
            Run Experiment
          </Button>
        </div>
      </div>

        {!hasRequirements && (
          <Alert>
            <AlertDescription>
              {!configs || configs.length === 0 ? (
                <>
                  You need at least one configuration to run experiments.{' '}
                  <Link
                    to={`/projects/${projectId}/configs`}
                    className="underline font-medium"
                  >
                    Create a configuration
                  </Link>
                </>
              ) : (
                <>
                  You need at least one test query to run experiments.{' '}
                  <Link
                    to={`/projects/${projectId}/queries`}
                    className="underline font-medium"
                  >
                    Create a query
                  </Link>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {hasRequirements && (
          <Card className="text-center p-12">
            <CardHeader>
              <CardTitle>Ready to run experiments!</CardTitle>
              <CardDescription>
                Compare different RAG configurations to find the best approach
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{configs.length}</p>
                  <p className="text-sm text-muted-foreground">Configurations</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{queries.length}</p>
                  <p className="text-sm text-muted-foreground">Test Queries</p>
                </div>
              </div>
              <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
                Run Your First Experiment
              </Button>
            </CardContent>
          </Card>
        )}

        <CreateExperimentModal
          projectId={projectId!}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(experimentId) => {
            setIsCreateModalOpen(false)
            navigate(`/projects/${projectId}/experiments/${experimentId}`)
          }}
        />
    </div>
  )
}
