import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useProject } from '@/hooks/useProjects'
import { useConfigs, useDeleteConfig } from '@/hooks/useConfigs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import CreateConfigModal from '@/components/CreateConfigModal'
import ConfigPresetsView from '@/components/ConfigPresetsView'

export default function ConfigsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project } = useProject(projectId)
  const { data: configs, isLoading, error } = useConfigs(projectId)
  const deleteConfig = useDeleteConfig(projectId!)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { toast } = useToast()

  const handleDelete = async (configId: string) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      try {
        await deleteConfig.mutateAsync(configId)
        toast({
          title: 'Configuration deleted',
          description: 'Configuration was successfully deleted',
        })
      } catch (error) {
        toast({
          title: 'Delete failed',
          description: error instanceof Error ? error.message : 'Failed to delete configuration',
          variant: 'destructive',
        })
      }
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="default">Ready</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
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
              <h1 className="text-3xl font-bold">RAG Configurations</h1>
              {project && (
                <p className="text-muted-foreground mt-1">{project.name}</p>
              )}
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Configuration
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-muted-foreground">Loading configurations...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Error loading configurations: {error.message}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue={configs && configs.length > 0 ? 'my-configs' : 'presets'} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="my-configs">
              My Configurations {configs && configs.length > 0 && `(${configs.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="mt-6">
            <ConfigPresetsView projectId={projectId!} />
          </TabsContent>

          <TabsContent value="my-configs" className="mt-6">
            {configs && configs.length === 0 && !isLoading && (
              <Card className="text-center p-12">
                <CardHeader>
                  <CardTitle>No configurations yet</CardTitle>
                  <CardDescription>
                    Use a preset or create a custom configuration to start testing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
                    Create Custom Configuration
                  </Button>
                </CardContent>
              </Card>
            )}

            {configs && configs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {configs.map((config) => (
                  <Card key={config.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle>{config.name}</CardTitle>
                        {getStatusBadge(config.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Chunking</p>
                        <p className="text-sm">
                          {config.chunk_strategy} • {config.chunk_size} tokens
                          {config.chunk_overlap && ` • ${config.chunk_overlap} overlap`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Embedding</p>
                        <p className="text-sm">{config.embedding_model}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Retrieval</p>
                        <p className="text-sm">
                          {config.retrieval_strategy} • Top {config.top_k}
                        </p>
                      </div>
                      {config.chunk_count !== undefined && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Chunks</p>
                          <p className="text-sm">{config.chunk_count} generated</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                          disabled={deleteConfig.isPending}
                          className="flex-1"
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CreateConfigModal
          projectId={projectId!}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    </div>
  )
}
