import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useConfig } from '@/hooks/useConfigs'
import { useQueries } from '@/hooks/useQueries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import api from '@/api/client'

interface QueryTimeResult {
  retrieved_chunks: Array<{
    id: string
    content: string
    chunk_index: number
    similarity_score: number | null
  }>
  score: number | null
  latency_ms: number
  metrics: Record<string, any>
  effective_params: {
    top_k: number
    dense_weight: number | null
    sparse_weight: number | null
    retrieval_strategy: string
    embedding_model: string
    chunk_strategy: string
    chunk_size: number
  }
}

interface RunComparison extends QueryTimeResult {
  id: string
  label: string
}

export default function QueryTimeExperimenterPage() {
  const { projectId, configId } = useParams<{ projectId: string; configId: string }>()
  const navigate = useNavigate()
  const { data: config, isLoading: configLoading } = useConfig(configId)
  const { data: queries } = useQueries(projectId)
  const { toast } = useToast()

  // Query selection
  const [selectedQueryId, setSelectedQueryId] = useState<string>('')
  const [customQueryText, setCustomQueryText] = useState('')
  const [useCustomQuery, setUseCustomQuery] = useState(false)

  // Parameters
  const [topK, setTopK] = useState(5)
  const [denseWeight, setDenseWeight] = useState(0.5)
  const [sparseWeight, setSparseWeight] = useState(0.5)

  // State
  const [isRunning, setIsRunning] = useState(false)
  const [currentResult, setCurrentResult] = useState<QueryTimeResult | null>(null)
  const [comparisons, setComparisons] = useState<RunComparison[]>([])

  // Initialize params from config
  useEffect(() => {
    if (config) {
      setTopK(config.top_k || 5)
    }
  }, [config])

  const runExperiment = async () => {
    if (!useCustomQuery && !selectedQueryId) {
      toast({
        title: 'No query selected',
        description: 'Please select or enter a query',
        variant: 'destructive',
      })
      return
    }

    setIsRunning(true)

    try {
      const requestBody = {
        config_id: configId,
        ...(useCustomQuery
          ? { query_text: customQueryText }
          : { query_id: selectedQueryId }
        ),
        overrides: {
          top_k: topK,
          ...(config?.retrieval_strategy === 'hybrid' && {
            dense_weight: denseWeight,
            sparse_weight: sparseWeight,
          }),
        },
      }

      const response = await api.post('/experiments/query-time', requestBody)
      setCurrentResult(response.data)

      toast({
        title: 'Experiment complete',
        description: `Retrieved ${response.data.retrieved_chunks.length} chunks in ${response.data.latency_ms}ms`,
      })
    } catch (error) {
      toast({
        title: 'Experiment failed',
        description: error instanceof Error ? error.message : 'Failed to run experiment',
        variant: 'destructive',
      })
    } finally {
      setIsRunning(false)
    }
  }

  const addToComparison = () => {
    if (!currentResult) return

    const newRun: RunComparison = {
      ...currentResult,
      id: Date.now().toString(),
      label: `Run ${comparisons.length + 1} (k=${topK}${
        config?.retrieval_strategy === 'hybrid'
          ? `, d=${denseWeight.toFixed(1)}`
          : ''
      })`,
    }

    setComparisons([...comparisons, newRun])
    toast({
      title: 'Added to comparison',
      description: 'Run added to comparison table',
    })
  }

  const clearComparisons = () => {
    setComparisons([])
  }

  const getScoreDelta = (score: number | null) => {
    if (!score || !config) return null

    // Compare with base config score (if we know it)
    // For now, just compare with first run in comparisons
    if (comparisons.length > 0 && comparisons[0].score) {
      const delta = score - comparisons[0].score
      return delta
    }

    return null
  }

  if (configLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!config) {
    return <div className="flex items-center justify-center h-screen">Config not found</div>
  }

  const isHybrid = config.retrieval_strategy === 'hybrid'

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/projects/${projectId}/configs`)}
          className="mb-2"
        >
          ← Back to Configs
        </Button>
        <h1 className="text-3xl font-bold">⚡ Query-Time Experimenter</h1>
        <p className="text-muted-foreground mt-1">
          Test parameter variations instantly without re-processing
        </p>
      </div>

      {/* Config Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{config.name}</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{config.retrieval_strategy}</Badge>
            <Badge variant="outline">{config.embedding_model}</Badge>
            <Badge variant="outline">{config.chunk_strategy} • {config.chunk_size} tokens</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Experiment Setup */}
        <div className="space-y-6">
          {/* Query Selection */}
          <Card>
            <CardHeader>
              <CardTitle>1. Select Query</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="existing-query"
                  checked={!useCustomQuery}
                  onChange={() => setUseCustomQuery(false)}
                />
                <Label htmlFor="existing-query">Use existing query</Label>
              </div>

              {!useCustomQuery && (
                <Select value={selectedQueryId} onValueChange={setSelectedQueryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a query..." />
                  </SelectTrigger>
                  <SelectContent>
                    {queries?.map((query) => (
                      <SelectItem key={query.id} value={query.id}>
                        {query.query_text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Separator />

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="custom-query"
                  checked={useCustomQuery}
                  onChange={() => setUseCustomQuery(true)}
                />
                <Label htmlFor="custom-query">Enter custom query</Label>
              </div>

              {useCustomQuery && (
                <Input
                  placeholder="Enter your query..."
                  value={customQueryText}
                  onChange={(e) => setCustomQueryText(e.target.value)}
                />
              )}
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>2. Adjust Parameters</CardTitle>
              <CardDescription>
                Slide to test different values instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Top K */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Top K Results</Label>
                  <span className="text-sm font-medium">{topK}</span>
                </div>
                <Slider
                  value={[topK]}
                  onValueChange={([value]) => setTopK(value)}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Number of chunks to retrieve
                </p>
              </div>

              {/* Hybrid Weights */}
              {isHybrid && (
                <>
                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Dense Weight (Semantic)</Label>
                      <span className="text-sm font-medium">{denseWeight.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[denseWeight]}
                      onValueChange={([value]) => {
                        setDenseWeight(value)
                        setSparseWeight(1 - value)
                      }}
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Sparse Weight (Keywords)</Label>
                      <span className="text-sm font-medium">{sparseWeight.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[sparseWeight]}
                      onValueChange={([value]) => {
                        setSparseWeight(value)
                        setDenseWeight(1 - value)
                      }}
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-full"
                    />
                  </div>

                  <Alert>
                    <AlertDescription className="text-xs">
                      Weights must sum to 1.0. Adjust one and the other updates automatically.
                    </AlertDescription>
                  </Alert>
                </>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={runExperiment}
                  disabled={isRunning || (!useCustomQuery && !selectedQueryId) || (useCustomQuery && !customQueryText.trim())}
                  className="flex-1"
                >
                  {isRunning ? 'Running...' : '🚀 Run Query'}
                </Button>

                {currentResult && (
                  <Button
                    variant="outline"
                    onClick={addToComparison}
                  >
                    Add to Comparison
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="space-y-6">
          {/* Current Result */}
          {currentResult && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>{currentResult.latency_ms}ms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Primary Score</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      {currentResult.score?.toFixed(3) || 'N/A'}
                      {(() => {
                        const delta = getScoreDelta(currentResult.score)
                        if (delta !== null) {
                          return (
                            <Badge variant={delta > 0 ? 'default' : 'destructive'} className="text-xs">
                              {delta > 0 ? '⬆' : '⬇'} {Math.abs(delta).toFixed(3)}
                            </Badge>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground">Chunks Retrieved</div>
                    <div className="text-2xl font-bold">
                      {currentResult.retrieved_chunks.length}
                    </div>
                  </div>
                </div>

                {/* Detailed Metrics */}
                {currentResult.metrics && Object.keys(currentResult.metrics).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-semibold mb-2">Detailed Metrics</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(currentResult.metrics).map(([key, value]) => {
                          // Skip nested objects
                          if (typeof value === 'object') return null

                          return (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="font-medium">
                                {typeof value === 'number' ? value.toFixed(3) : String(value)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Chunks Preview */}
                <Separator />
                <div>
                  <div className="text-sm font-semibold mb-2">Retrieved Chunks</div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {currentResult.retrieved_chunks.slice(0, 5).map((chunk, idx) => (
                      <div key={chunk.id} className="text-sm p-2 border rounded">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">#{idx + 1}</Badge>
                          {chunk.similarity_score && (
                            <span className="text-xs text-muted-foreground">
                              Similarity: {chunk.similarity_score.toFixed(3)}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground line-clamp-2">
                          {chunk.content}
                        </p>
                      </div>
                    ))}
                    {currentResult.retrieved_chunks.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        ... and {currentResult.retrieved_chunks.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!currentResult && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Configure parameters and click "Run Query" to see results
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      {comparisons.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Comparison ({comparisons.length} runs)</CardTitle>
                <CardDescription>Compare different parameter combinations</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={clearComparisons}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>Top K</TableHead>
                    {isHybrid && <TableHead>Dense</TableHead>}
                    {isHybrid && <TableHead>Sparse</TableHead>}
                    <TableHead>Score</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Chunks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisons.map((run, idx) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">{run.label}</TableCell>
                      <TableCell>{run.effective_params.top_k}</TableCell>
                      {isHybrid && (
                        <TableCell>
                          {run.effective_params.dense_weight?.toFixed(2)}
                        </TableCell>
                      )}
                      {isHybrid && (
                        <TableCell>
                          {run.effective_params.sparse_weight?.toFixed(2)}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {run.score?.toFixed(3) || 'N/A'}
                          {idx > 0 && (() => {
                            const delta = run.score && comparisons[0].score
                              ? run.score - comparisons[0].score
                              : null
                            if (delta !== null) {
                              return (
                                <Badge
                                  variant={delta > 0 ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {delta > 0 ? '⬆' : '⬇'} {Math.abs(delta).toFixed(3)}
                                </Badge>
                              )
                            }
                            return null
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>{run.latency_ms}ms</TableCell>
                      <TableCell>{run.retrieved_chunks.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
