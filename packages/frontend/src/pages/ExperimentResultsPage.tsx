import { useParams, Link } from 'react-router-dom'
import { useExperiment, useExperimentResults } from '@/hooks/useExperiments'
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

export default function ExperimentResultsPage() {
  const { experimentId } = useParams<{ experimentId: string }>()
  const { data: experiment, isLoading: experimentLoading } = useExperiment(experimentId)
  const { data: results, isLoading: resultsLoading } = useExperimentResults(experimentId)

  const isLoading = experimentLoading || resultsLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-muted-foreground">Loading experiment results...</p>
        </div>
      </div>
    )
  }

  if (!experiment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
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

        {/* Summary Cards */}
        {sortedConfigs && sortedConfigs.length > 0 && (
          <>
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

            {/* Results by Configuration */}
            <div className="space-y-6">
              {sortedConfigs.map((config, index) => (
                <Card key={config.config_id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
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
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Query</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Latency</TableHead>
                          <TableHead>Chunks Retrieved</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.results.map((result) => (
                          <TableRow key={result.query_id}>
                            <TableCell className="font-medium">
                              {result.query_text}
                            </TableCell>
                            <TableCell>
                              {result.score !== null && result.score !== undefined
                                ? result.score.toFixed(3)
                                : 'N/A'}
                            </TableCell>
                            <TableCell>{result.latency_ms}ms</TableCell>
                            <TableCell>{result.chunks.length}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

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
