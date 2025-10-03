import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ChevronDown, AlertTriangle, CheckCircle, Trophy, DollarSign, FileText } from 'lucide-react'
import HallucinationHighlight, { AnswerQualityBadge } from './HallucinationHighlight'
import type { ConfigResult, QueryResult, AnswerMetrics } from '@/types/api'

interface Props {
  configs: ConfigResult[]
  className?: string
}

export default function AnswerComparisonView({ configs, className }: Props) {
  // Group results by query
  const queriesMap = new Map<string, Array<{ config: ConfigResult; result: QueryResult }>>()

  configs.forEach((config) => {
    config.results.forEach((result) => {
      // Only include results with generated answers
      if (!result.generated_answer) return

      const existing = queriesMap.get(result.query_id) || []
      existing.push({ config, result })
      queriesMap.set(result.query_id, existing)
    })
  })

  // Check if any configs have answers
  const hasAnyAnswers = Array.from(queriesMap.values()).some(
    (results) => results.length > 0
  )

  if (!hasAnyAnswers) {
    return (
      <div className={className}>
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">No generated answers found</p>
              <p className="text-sm text-muted-foreground">
                To enable answer generation:
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 ml-2">
                <li>Edit your config</li>
                <li>Enable "Generate Answers" in evaluation settings</li>
                <li>Run a new experiment</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`${className} space-y-6`}>
      {Array.from(queriesMap.entries()).map(([queryId, results]) => {
        const firstResult = results[0].result

        // Sort by answer quality (if available)
        const sortedResults = [...results].sort((a, b) => {
          const aQuality = a.result.answer_metrics?.overall_quality || 0
          const bQuality = b.result.answer_metrics?.overall_quality || 0
          return bQuality - aQuality // Descending
        })

        const winner = sortedResults[0]
        const hasWinner =
          winner.result.answer_metrics?.overall_quality &&
          winner.result.answer_metrics.overall_quality > 0

        return (
          <Card key={queryId} className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">💬 Query Comparison</CardTitle>
              <CardDescription className="text-base">
                "{firstResult.query_text}"
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x">
                {sortedResults.map(({ config, result }, idx) => {
                  const isWinner =
                    hasWinner && idx === 0 && sortedResults.length > 1
                  const metrics = result.answer_metrics

                  return (
                    <div
                      key={`${config.config_id}-${result.query_id}`}
                      className={`p-6 ${
                        isWinner ? 'bg-green-50/50 dark:bg-green-950/20' : ''
                      }`}
                    >
                      {/* Header */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            {isWinner && <Trophy className="h-4 w-4 text-yellow-600" />}
                            {config.config_name}
                          </h3>
                          {isWinner && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                              Winner
                            </Badge>
                          )}
                        </div>

                        {/* Quality Metrics */}
                        {metrics && (
                          <div className="flex flex-wrap items-center gap-2">
                            {metrics.overall_quality !== undefined && (
                              <AnswerQualityBadge quality={metrics.overall_quality} />
                            )}

                            {metrics.has_hallucinations ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {metrics.hallucination_count} Hallucination
                                {metrics.hallucination_count !== 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-100 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                No Hallucinations
                              </Badge>
                            )}

                            {result.generation_cost_usd && (
                              <Badge variant="outline" className="text-xs">
                                <DollarSign className="h-3 w-3 mr-1" />
                                ${result.generation_cost_usd.toFixed(4)}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Answer Text */}
                      <div className="mb-4">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Generated Answer:
                        </div>
                        <div className="p-3 bg-background rounded-lg border text-sm">
                          {metrics?.hallucinations &&
                          metrics.hallucinations.length > 0 ? (
                            <HallucinationHighlight
                              answer={result.generated_answer || ''}
                              hallucinations={metrics.hallucinations}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {result.generated_answer}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Detailed Metrics (Collapsible) */}
                      {metrics && (
                        <AnswerMetricsDetails
                          metrics={metrics}
                          queryText={result.query_text}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function AnswerMetricsDetails({ metrics, queryText }: { metrics: AnswerMetrics; queryText: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
          <span>View Detailed Metrics</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3">
        {/* View Prompt Button */}
        {metrics.prompt_sent && (
          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <FileText className="h-3 w-3 mr-2" />
                  View Full Prompt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Prompt Sent to LLM</DialogTitle>
                  <DialogDescription>
                    Query: "{queryText}"
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Metadata */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {metrics.generation_model && (
                      <div>
                        <span className="text-muted-foreground">Model:</span>
                        <div className="font-medium">{metrics.generation_model}</div>
                      </div>
                    )}
                    {metrics.temperature !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Temperature:</span>
                        <div className="font-medium">{metrics.temperature}</div>
                      </div>
                    )}
                    {metrics.prompt_tokens && (
                      <div>
                        <span className="text-muted-foreground">Prompt Tokens:</span>
                        <div className="font-medium">{metrics.prompt_tokens.toLocaleString()}</div>
                      </div>
                    )}
                  </div>

                  {/* Full Prompt */}
                  <div>
                    <div className="text-sm font-medium mb-2">Full Prompt:</div>
                    <div className="p-4 bg-muted rounded-lg border">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {metrics.prompt_sent}
                      </pre>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
        {/* Score Breakdown */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Score Breakdown:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {metrics.faithfulness !== undefined && (
              <MetricBar label="Faithfulness" value={metrics.faithfulness} />
            )}
            {metrics.answer_relevance !== undefined && (
              <MetricBar label="Relevance" value={metrics.answer_relevance} />
            )}
            {metrics.completeness !== undefined && (
              <MetricBar label="Completeness" value={metrics.completeness} />
            )}
            {metrics.conciseness !== undefined && (
              <MetricBar label="Conciseness" value={metrics.conciseness} />
            )}
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        {(metrics.strengths?.length || metrics.weaknesses?.length) && (
          <div className="space-y-2">
            {metrics.strengths && metrics.strengths.length > 0 && (
              <div>
                <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                  ✅ Strengths:
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  {metrics.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {metrics.weaknesses && metrics.weaknesses.length > 0 && (
              <div>
                <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                  ⚠️ Weaknesses:
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  {metrics.weaknesses.map((weakness, idx) => (
                    <li key={idx}>{weakness}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Reasoning */}
        {metrics.reasoning && (
          <div>
            <div className="text-xs font-medium mb-1">Evaluation Reasoning:</div>
            <p className="text-xs text-muted-foreground italic">
              {metrics.reasoning}
            </p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100)
  const getColor = (v: number) => {
    if (v >= 0.8) return 'bg-green-500'
    if (v >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(value)} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
