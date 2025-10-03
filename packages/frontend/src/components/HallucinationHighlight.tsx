import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Hallucination } from '@/types/api'

interface Props {
  answer: string
  hallucinations: Hallucination[]
  className?: string
}

/**
 * Highlights hallucinations in generated answers with red underlines.
 * Clicking on a hallucination shows why it was flagged.
 */
export default function HallucinationHighlight({ answer, hallucinations, className }: Props) {
  // If no hallucinations, render answer as-is
  if (!hallucinations || hallucinations.length === 0) {
    return (
      <div className={className}>
        <p className="whitespace-pre-wrap leading-relaxed">{answer}</p>
      </div>
    )
  }

  // Parse answer and highlight hallucinations
  const parts: JSX.Element[] = []
  let currentIndex = 0

  // Sort hallucinations by position in answer (approximate)
  const sortedHallucinations = [...hallucinations].sort((a, b) => {
    const aPos = answer.toLowerCase().indexOf(a.text.toLowerCase())
    const bPos = answer.toLowerCase().indexOf(b.text.toLowerCase())
    return aPos - bPos
  })

  sortedHallucinations.forEach((hallucination, idx) => {
    // Find hallucination text in answer (case-insensitive)
    const hallucinationIndex = answer.toLowerCase().indexOf(
      hallucination.text.toLowerCase(),
      currentIndex
    )

    if (hallucinationIndex === -1) {
      // Hallucination text not found exactly - this can happen if evaluator paraphrased
      return
    }

    // Add text before hallucination
    if (hallucinationIndex > currentIndex) {
      const beforeText = answer.substring(currentIndex, hallucinationIndex)
      parts.push(
        <span key={`before-${idx}`} className="text-foreground">
          {beforeText}
        </span>
      )
    }

    // Add highlighted hallucination with popover
    const hallucinationText = answer.substring(
      hallucinationIndex,
      hallucinationIndex + hallucination.text.length
    )

    parts.push(
      <Popover key={`hallucination-${idx}`}>
        <PopoverTrigger asChild>
          <span
            className="bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100 underline decoration-red-500 decoration-wavy decoration-2 cursor-help px-0.5 rounded"
            title="Click to see why this is flagged as a hallucination"
          >
            {hallucinationText}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h4 className="font-semibold text-sm text-red-600">Hallucination Detected</h4>
            </div>
            <div className="text-xs space-y-2">
              <div>
                <span className="font-medium">Flagged text:</span>
                <p className="mt-1 p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800">
                  "{hallucination.text}"
                </p>
              </div>
              <div>
                <span className="font-medium">Reason:</span>
                <p className="mt-1 text-muted-foreground">{hallucination.reason}</p>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )

    currentIndex = hallucinationIndex + hallucination.text.length
  })

  // Add remaining text
  if (currentIndex < answer.length) {
    const remainingText = answer.substring(currentIndex)
    parts.push(
      <span key="remaining" className="text-foreground">
        {remainingText}
      </span>
    )
  }

  return (
    <div className={className}>
      <div className="whitespace-pre-wrap leading-relaxed">{parts}</div>
    </div>
  )
}

/**
 * Answer Quality Badge - Shows overall quality with color coding
 */
export function AnswerQualityBadge({ quality }: { quality: number }) {
  const getColorClass = (q: number) => {
    if (q >= 0.8) return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-100 dark:border-green-800'
    if (q >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-800'
    return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-100 dark:border-red-800'
  }

  const getLabel = (q: number) => {
    if (q >= 0.8) return 'Excellent'
    if (q >= 0.6) return 'Good'
    if (q >= 0.4) return 'Fair'
    return 'Poor'
  }

  return (
    <Badge className={`${getColorClass(quality)} text-xs font-medium`}>
      ⭐ {quality.toFixed(2)} - {getLabel(quality)}
    </Badge>
  )
}
