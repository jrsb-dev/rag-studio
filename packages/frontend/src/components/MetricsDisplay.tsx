import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Card, CardContent, CardHeader, CardTitle , CardDescription} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChevronDown, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react'
import type { EvaluationMetrics } from '@/types/api'

interface Props {
  metrics: EvaluationMetrics
  cost?: number
  chunks?: Array<{ id: string; content: string; score?: number }>
  className?: string
}


export default function MetricsDisplay({ metrics, cost, chunks, className }: Props) {
  const hasBasic = metrics.basic && Object.keys(metrics.basic).length > 0
  const hasLLM = metrics.llm_judge && Object.keys(metrics.llm_judge).length > 0

  if (!hasBasic && !hasLLM) {
    return null
  }

  return (
    <div className={className}>
      {/* Basic Metrics - Always Open */}
      {hasBasic && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm font-medium">Basic IR Metrics</CardTitle>

              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Check if we have ground truth metrics */}
            {metrics.basic.mrr === undefined &&
             metrics.basic['ndcg@5'] === undefined &&
             metrics.basic['precision@5'] === undefined ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  {metrics.basic.diversity !== undefined && (
                    <MetricItem label="Diversity" value={metrics.basic.diversity} />
                  )}
                </div>
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-xs text-yellow-800">
                    <strong>Ground truth required:</strong> Add an expected answer to your test queries to enable MRR, NDCG, Precision, Recall, and F1 metrics. The system will match chunks semantically.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {metrics.basic.mrr !== undefined && (
                  <MetricItem label="MRR" value={metrics.basic.mrr} />
                )}
                {metrics.basic['ndcg@5'] !== undefined && (
                  <MetricItem label="NDCG@5" value={metrics.basic['ndcg@5']} />
                )}
                {metrics.basic['precision@5'] !== undefined && (
                  <MetricItem label="Precision@5" value={metrics.basic['precision@5']} />
                )}
                {metrics.basic['recall@5'] !== undefined && (
                  <MetricItem label="Recall@5" value={metrics.basic['recall@5']} />
                )}
                {metrics.basic['f1@5'] !== undefined && (
                  <MetricItem label="F1@5" value={metrics.basic['f1@5']} />
                )}
                {metrics.basic.diversity !== undefined && (
                  <MetricItem label="Diversity" value={metrics.basic.diversity} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Retrieved Chunks - Always Show */}
      {chunks && chunks.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Retrieved Chunks</CardTitle>
            <CardDescription className="text-xs">
              Top {chunks.length} chunks retrieved for this query (ranked by relevance)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chunks.map((chunk, idx) => (
                <div
                  key={chunk.id}
                  className={`p-3 rounded-lg border ${
                    idx === 0 ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20' : 'bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {idx === 0 && (
                        <Badge variant="default" className="bg-blue-600 text-xs">
                          🥇 Best Match
                        </Badge>
                      )}
                      {idx > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Rank #{idx + 1}
                        </Badge>
                      )}
                    </div>
                    {chunk.score !== undefined && chunk.score !== null && (
                      <span className="text-xs text-muted-foreground font-mono">
                        Score: {chunk.score.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs p-2 bg-muted/50 rounded border">
                    <p className="font-mono text-foreground leading-relaxed">
                      {chunk.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* LLM Judge - Collapsible */}
      {hasLLM && (
        <div className="mt-4">
          <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <CardTitle className="text-sm font-medium">LLM Judge Evaluation</CardTitle>
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                      {metrics.llm_judge.llm_judge_model || 'GPT'}
                    </Badge>
                    {cost !== undefined && cost > 0 && (
                      <Badge variant="outline" className="text-xs">
                        ${cost.toFixed(4)}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <div>
              <CardContent>
                <div className="space-y-4">
                  {/* Score Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    {metrics.llm_judge.llm_avg_score !== undefined && (
                      <MetricItem
                        label="Avg Score"
                        value={metrics.llm_judge.llm_avg_score}
                        format={(v) => `${v.toFixed(2)}/5`}
                      />
                    )}
                    {metrics.llm_judge.llm_max_score !== undefined && (
                      <MetricItem
                        label="Max Score"
                        value={metrics.llm_judge.llm_max_score}
                        format={(v) => `${v.toFixed(2)}/5`}
                      />
                    )}
                    {metrics.llm_judge.llm_min_score !== undefined && (
                      <MetricItem
                        label="Min Score"
                        value={metrics.llm_judge.llm_min_score}
                        format={(v) => `${v.toFixed(2)}/5`}
                      />
                    )}
                  </div>

                  {/* Chunk Evaluations */}
                  {metrics.llm_judge.llm_chunk_evaluations &&
                   metrics.llm_judge.llm_chunk_evaluations.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase">
                        Per-Chunk Analysis
                      </h4>
                      <div className="space-y-3">
                        {metrics.llm_judge.llm_chunk_evaluations.map((evaluation, idx) => {
                          const chunk = chunks?.find(c => c.id === evaluation.chunk_id)
                          return (
                            <div
                              key={evaluation.chunk_id}
                              className="p-3 bg-background rounded-lg border space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <Badge variant="outline" className="shrink-0">
                                  Score: {evaluation.score}/5
                                </Badge>
                                {chunk && (
                                  <span className="text-xs text-muted-foreground">
                                    Chunk #{idx + 1}
                                  </span>
                                )}
                              </div>

                              {chunk && (
                                <div className="text-xs p-2 bg-muted/50 rounded border">
                                  <p className="font-mono text-foreground">{chunk.content}</p>
                                </div>
                              )}

                              <div className="text-xs">
                                <span className="font-medium">Reasoning: </span>
                                <span className="text-muted-foreground">{evaluation.reasoning}</span>
                              </div>

                              {evaluation.key_points && evaluation.key_points.length > 0 && (
                                <div className="text-xs">
                                  <span className="font-medium">Key Points:</span>
                                  <ul className="list-disc list-inside text-muted-foreground ml-2">
                                    {evaluation.key_points.map((point, i) => (
                                      <li key={i}>{point}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// Metric descriptions for tooltips
const METRIC_DESCRIPTIONS: Record<string, { title: string; description: string; range: string }> = {
  'MRR': {
    title: 'Mean Reciprocal Rank',
    description: 'Measures how high the first relevant result appears in the ranking. Higher is better.',
    range: '0.0 (worst) to 1.0 (best)',
  },
  'NDCG@5': {
    title: 'Normalized Discounted Cumulative Gain',
    description: 'Evaluates ranking quality, giving higher weight to relevant results at top positions.',
    range: '0.0 (worst) to 1.0 (perfect ranking)',
  },
  'Precision@5': {
    title: 'Precision at 5',
    description: 'Percentage of top 5 results that are relevant. Measures accuracy of retrieval.',
    range: '0.0 (none relevant) to 1.0 (all relevant)',
  },
  'Recall@5': {
    title: 'Recall at 5',
    description: 'Percentage of all relevant documents found in top 5. Measures completeness.',
    range: '0.0 (missed all) to 1.0 (found all)',
  },
  'F1@5': {
    title: 'F1 Score at 5',
    description: 'Harmonic mean of Precision and Recall. Balances accuracy and completeness.',
    range: '0.0 (worst) to 1.0 (best)',
  },
  'Diversity': {
    title: 'Result Diversity',
    description: 'Measures how different the retrieved chunks are from each other. Higher means less redundancy.',
    range: '0.0 (identical) to 1.0 (completely different)',
  },
  'Avg Score': {
    title: 'Average LLM Score',
    description: 'Average relevance rating from LLM judge across all chunks.',
    range: '1 (not relevant) to 5 (highly relevant)',
  },
  'Max Score': {
    title: 'Maximum LLM Score',
    description: 'Highest relevance rating given by LLM judge.',
    range: '1 to 5',
  },
  'Min Score': {
    title: 'Minimum LLM Score',
    description: 'Lowest relevance rating given by LLM judge.',
    range: '1 to 5',
  },
}

function MetricItem({
  label,
  value,
  format,
}: {
  label: string
  value: number
  format?: (v: number) => string
}) {
  const displayValue = format ? format(value) : value.toFixed(3)
  const metricInfo = METRIC_DESCRIPTIONS[label]

  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{displayValue}</div>
      <div className="flex items-center justify-center gap-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        {metricInfo && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex">
                <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">{metricInfo.title}</h4>
                <p className="text-xs text-muted-foreground">{metricInfo.description}</p>
                <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  Range: {metricInfo.range}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}
