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
import { CheckCircle2, ChevronDown, Info, Sparkles } from 'lucide-react'
import type { EvaluationSettings, GenerationSettings } from '@/types/api'

interface Props {
  settings: EvaluationSettings
  onChange: (settings: EvaluationSettings) => void
  generationSettings: GenerationSettings
  onGenerationChange: (settings: GenerationSettings) => void
}

export default function ConfigEvaluationSettings({
  settings,
  onChange,
  generationSettings,
  onGenerationChange
}: Props) {
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

        {/* Answer Generation - NEW */}
        <div className="space-y-3 border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/30 dark:bg-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <Label htmlFor="generate-answers">Generate Answers</Label>
              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                NEW
              </span>
            </div>
            <Switch
              id="generate-answers"
              checked={generationSettings.enabled || false}
              onCheckedChange={(checked) =>
                onGenerationChange({ ...generationSettings, enabled: checked })
              }
            />
          </div>

          {generationSettings.enabled && (
            <div className="space-y-3 ml-6">
              <div className="space-y-2">
                <Label htmlFor="gen-model" className="text-sm">
                  Model
                </Label>
                <Select
                  value={generationSettings.model || 'gpt-4o-mini'}
                  onValueChange={(value) =>
                    onGenerationChange({ ...generationSettings, model: value })
                  }
                >
                  <SelectTrigger id="gen-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">
                      GPT-4o Mini (Recommended) - ~$0.002/answer
                    </SelectItem>
                    <SelectItem value="gpt-4o">
                      GPT-4o (Best quality) - ~$0.015/answer
                    </SelectItem>
                    <SelectItem value="gpt-3.5-turbo">
                      GPT-3.5 Turbo (Fastest) - ~$0.001/answer
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <p className="font-medium mb-1">What this does:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Generates full answers from retrieved chunks</li>
                    <li>Detects hallucinations automatically</li>
                    <li>Evaluates answer quality (faithfulness, relevance, etc.)</li>
                    <li>Compare answers side-by-side in experiment results</li>
                  </ul>
                </AlertDescription>
              </Alert>
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
