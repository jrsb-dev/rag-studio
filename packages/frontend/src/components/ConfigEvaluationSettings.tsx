import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { CheckCircle2, ChevronDown, Info } from 'lucide-react'
import type { EvaluationSettings } from '@/types/api'

interface Props {
  settings: EvaluationSettings
  onChange: (settings: EvaluationSettings) => void
}

export default function ConfigEvaluationSettings({ settings, onChange }: Props) {
  return (
    <Collapsible className="space-y-4">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
        <ChevronDown className="h-4 w-4" />
        Evaluation Settings
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 pt-2">
        {/* Basic Metrics - Always Enabled */}
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">Basic IR Metrics</span>

            </div>
            <p className="text-xs text-muted-foreground">
              MRR, NDCG@K, Precision@K, Recall@K, F1@K, Diversity
            </p>
          </AlertDescription>
        </Alert>

        {/* LLM Judge */}
        <div className="space-y-3 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="llm-judge">LLM Judge Evaluation</Label>
              <Info className="h-3 w-3 text-muted-foreground" />
            </div>
            <Switch
              id="llm-judge"
              checked={settings.use_llm_judge || false}
              onCheckedChange={(checked) =>
                onChange({ ...settings, use_llm_judge: checked })
              }
            />
          </div>

          {settings.use_llm_judge && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="llm-model" className="text-sm">
                Model
              </Label>
              <Select
                value={settings.llm_judge_model || 'gpt-3.5-turbo'}
                onValueChange={(value) =>
                  onChange({ ...settings, llm_judge_model: value })
                }
              >
                <SelectTrigger id="llm-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">
                    GPT-3.5 Turbo (Recommended) - ~$0.01/query
                  </SelectItem>
                  <SelectItem value="gpt-4-turbo">
                    GPT-4 Turbo (More accurate) - ~$0.05/query
                  </SelectItem>
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground mt-2">
                Uses GPT to rate chunk relevance on 1-5 scale. Works without ground truth.
              </p>
            </div>
          )}
        </div>

        {/* RAGAS - Future */}
        <div className="space-y-3 border rounded-lg p-4 opacity-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="ragas" className="text-sm">
                RAGAS Evaluation
              </Label>
              <span className="text-xs text-muted-foreground">(Coming soon)</span>
            </div>
            <Switch id="ragas" disabled checked={false} />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
