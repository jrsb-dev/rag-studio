import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useExperiment, useExperimentResults } from '@/hooks/useExperiments'
import { useConfigs } from '@/hooks/useConfigs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronDown, Settings, FileText, BarChart3, MessageSquare } from 'lucide-react'
import MetricsDisplay from '@/components/MetricsDisplay'
import AnswerComparisonView from '@/components/AnswerComparisonView'

export default function ExperimentResultsPage() {
  const { experimentId, projectId } = useParams<{ experimentId: string; projectId: string }>()
  const navigate = useNavigate()
  const { data: experiment, isLoading: experimentLoading } = useExperiment(experimentId)
  const { data: results, isLoading: resultsLoading } = useExperimentResults(experimentId)
  const { data: configs } = useConfigs(projectId)

  const isLoading = experimentLoading || resultsLoading

  if (isLoading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-muted-foreground">Loading experiment results...</p>
        </div>
      </div>
    )
  }

  if (!experiment) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>Experiment not found</CardTitle>
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

  const getStatusBadge = () => {
    switch (experiment.status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>
      case 'running':
        return <Badge variant="secondary">Running</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const sortedConfigs = results?.configs.sort((a, b) => {
    if (a.avg_score === null || a.avg_score === undefined) return 1
    if (b.avg_score === null || b.avg_score === undefined) return -1
    return b.avg_score - a.avg_score
  })

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            {experiment.name || 'Experiment Results'}
          </h1>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {experiment.status === 'running' && (
              <span className="text-sm text-muted-foreground">
                Results update automatically...
              </span>
            )}
          </div>
        </div>

        {experiment.error_message && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{experiment.error_message}</AlertDescription>
          </Alert>
        )}

        {experiment.status === 'running' && (
          <Alert className="mb-6">
            <AlertDescription>
              Experiment is still running. Results will appear as they become available.
            </AlertDescription>
          </Alert>
        )}

        {/* Check if any configs have answers */}
        {sortedConfigs && sortedConfigs.length > 0 && (() => {
          const hasAnyAnswers = sortedConfigs.some(config =>
            config.results.some(result => result.generated_answer)
          )

          return (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Configurations Tested</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{sortedConfigs.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Best Average Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    {sortedConfigs[0].avg_score?.toFixed(3) || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sortedConfigs[0].config_name}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fastest Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">
                    {Math.min(
                      ...sortedConfigs
                        .map((c) => c.avg_latency_ms)
                        .filter((l): l is number => l !== null && l !== undefined)
                    )}
                    ms
                  </p>
                </CardContent>
              </Card>
              </div>

              {/* Tabs for different views */}
              <Tabs defaultValue="metrics" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="metrics" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Metrics Overview
                  </TabsTrigger>
                  <TabsTrigger value="answers" className="flex items-center gap-2" disabled={!hasAnyAnswers}>
                    <MessageSquare className="h-4 w-4" />
                    Answer Comparison
                  </TabsTrigger>
                </TabsList>

                {/* Metrics Overview Tab */}
                <TabsContent value="metrics" className="mt-6">
                  <div className="space-y-6">
                    {sortedConfigs.map((config, index) => {
                const configDetails = configs?.find(c => c.id === config.config_id)
                return (
                  <Card key={config.config_id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle>
                            {index === 0 && '🏆 '}
                            {config.config_name}
                          </CardTitle>
                          <CardDescription>
                            Avg Score: {config.avg_score?.toFixed(3) || 'N/A'} • Avg Latency:{' '}
                            {config.avg_latency_ms}ms
                          </CardDescription>
                        </div>
                      </div>

                      {/* Config Details Collapsible */}
                      {configDetails && (
                        <Collapsible className="mt-3">
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                            <Settings className="h-3 w-3" />
                            <span>View Configuration Details</span>
                            <ChevronDown className="h-3 w-3" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs bg-muted/50 p-3 rounded-lg border">
                              <div>
                                <span className="text-muted-foreground">Strategy:</span>
                                <span className="ml-2 font-medium">{configDetails.chunk_strategy}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Chunk Size:</span>
                                <span className="ml-2 font-medium">{configDetails.chunk_size} tokens</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Overlap:</span>
                                <span className="ml-2 font-medium">{configDetails.chunk_overlap || 0} tokens</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Embedding:</span>
                                <span className="ml-2 font-medium">{configDetails.embedding_model}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Retrieval:</span>
                                <span className="ml-2 font-medium">{configDetails.retrieval_strategy}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Top K:</span>
                                <span className="ml-2 font-medium">{configDetails.top_k}</span>
                              </div>
                              {configDetails.evaluation_settings?.use_llm_judge && (
                                <>
                                  <div className="col-span-2 border-t pt-2 mt-1">
                                    <span className="text-purple-600 font-semibold text-xs">Evaluation</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">LLM Judge:</span>
                                    <span className="ml-2 font-medium">
                                      {configDetails.evaluation_settings.llm_judge_model || 'gpt-3.5-turbo'}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Query</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Latency</TableHead>
                          <TableHead>Chunks</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.results.map((result) => (
                          <QueryResultRow
                            key={result.query_id}
                            result={result}
                            projectId={projectId!}
                            experimentId={experimentId!}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                )
                    })}
                  </div>
                </TabsContent>

                {/* Answer Comparison Tab */}
                <TabsContent value="answers" className="mt-6">
                  <AnswerComparisonView configs={sortedConfigs} />
                </TabsContent>
              </Tabs>
            </>
          )
        })()}

        {(!sortedConfigs || sortedConfigs.length === 0) && experiment.status !== 'running' && (
          <Card className="text-center p-12">
            <CardHeader>
              <CardTitle>No results available</CardTitle>
              <CardDescription>
                This experiment has not produced any results yet
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}

function QueryResultRow({ result, projectId, experimentId }: { result: any; projectId: string; experimentId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const hasMetrics = result.metrics && (result.metrics.basic || result.metrics.llm_judge)

  // Debug: log result to see if result_id exists
  console.log('Result data:', { result_id: result.result_id, query_text: result.query_text })

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{result.query_text}</TableCell>
        <TableCell>
          {result.score !== null && result.score !== undefined
            ? result.score.toFixed(3)
            : 'N/A'}
        </TableCell>
        <TableCell>{result.latency_ms}ms</TableCell>
        <TableCell>{result.chunks.length}</TableCell>
        <TableCell>
          {result.evaluation_cost_usd ? `$${result.evaluation_cost_usd.toFixed(4)}` : '-'}
        </TableCell>
				
        <TableCell>
          <div className="flex items-center gap-2">
            {result.result_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projects/${projectId}/experiments/${experimentId}/results/${result.result_id}/context`)}
              >
                <FileText className="h-3 w-3 mr-1" />
                Context
              </Button>
            )}
            {hasMetrics && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
                Metrics
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {isOpen && hasMetrics && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/50">
            <MetricsDisplay
              metrics={result.metrics}
              cost={result.evaluation_cost_usd}
              chunks={result.chunks}
              className="p-4"
            />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
