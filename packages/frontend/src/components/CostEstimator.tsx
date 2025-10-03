import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, DollarSign, AlertTriangle } from 'lucide-react'
import type { CostEstimateRequest, CostEstimateResponse } from '@/types/api'

interface Props {
  request: CostEstimateRequest
}

export default function CostEstimator({ request }: Props) {
  const [estimate, setEstimate] = useState<CostEstimateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEstimate = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/experiments/estimate-cost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        })

        if (!response.ok) {
          throw new Error('Failed to estimate cost')
        }

        const data = await response.json()
        setEstimate(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to estimate cost')
      } finally {
        setLoading(false)
      }
    }

    fetchEstimate()
  }, [request])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Calculating cost...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!estimate) {
    return null
  }

  const isExpensive = estimate.estimated_cost_usd > 10
  const hasLLMJudge = request.use_llm_judge

  return (
    <Alert
      variant={isExpensive ? 'destructive' : 'default'}
      className={!isExpensive ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : ''}
    >
      {isExpensive ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <DollarSign className="h-4 w-4 text-blue-600" />
      )}
      <AlertTitle className="text-sm font-medium">
        {isExpensive ? 'High Cost Warning' : 'Estimated Cost'}
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Total estimated cost:</span>
            <span className="font-mono font-medium">
              ${estimate.estimated_cost_usd.toFixed(4)}
            </span>
          </div>

          {hasLLMJudge && estimate.breakdown.llm_judge && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>LLM Judge ({request.llm_judge_model}):</span>
              <span className="font-mono">
                ${estimate.breakdown.llm_judge.toFixed(4)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>API calls:</span>
            <span className="font-mono">{estimate.num_api_calls}</span>
          </div>

          {isExpensive && (
            <p className="text-xs mt-2 pt-2 border-t border-destructive/20">
              This experiment will cost more than $10. Consider reducing the number of
              queries or disabling LLM judge evaluation.
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
