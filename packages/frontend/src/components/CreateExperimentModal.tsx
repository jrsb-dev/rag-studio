import { useState, useMemo } from 'react'
import type { ExperimentCreate, CostEstimateRequest } from '@/types/api'
import { useConfigs } from '@/hooks/useConfigs'
import { useQueries } from '@/hooks/useQueries'
import { useCreateExperiment } from '@/hooks/useExperiments'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import CostEstimator from './CostEstimator'

interface CreateExperimentModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (experimentId: string) => void
}

export default function CreateExperimentModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: CreateExperimentModalProps) {
  const { data: configs } = useConfigs(projectId)
  const { data: queries } = useQueries(projectId)
  const createExperiment = useCreateExperiment(projectId)
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [selectedConfigs, setSelectedConfigs] = useState<Set<string>>(new Set())
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedConfigs.size === 0 || selectedQueries.size === 0) {
      toast({
        title: 'Selection required',
        description: 'Please select at least one configuration and one query',
        variant: 'destructive',
      })
      return
    }

    try {
      const result = await createExperiment.mutateAsync({
        name: name || undefined,
        config_ids: Array.from(selectedConfigs),
        query_ids: Array.from(selectedQueries),
      })
      toast({
        title: 'Experiment started',
        description: 'Your experiment is now running',
      })
      setName('')
      setSelectedConfigs(new Set())
      setSelectedQueries(new Set())
      onSuccess(result.id)
    } catch (error) {
      toast({
        title: 'Experiment failed',
        description: error instanceof Error ? error.message : 'Failed to create experiment',
        variant: 'destructive',
      })
    }
  }

  const toggleConfig = (configId: string) => {
    const newSet = new Set(selectedConfigs)
    if (newSet.has(configId)) {
      newSet.delete(configId)
    } else {
      newSet.add(configId)
    }
    setSelectedConfigs(newSet)
  }

  const toggleQuery = (queryId: string) => {
    const newSet = new Set(selectedQueries)
    if (newSet.has(queryId)) {
      newSet.delete(queryId)
    } else {
      newSet.add(queryId)
    }
    setSelectedQueries(newSet)
  }

  // Calculate cost estimate based on selected configs and queries
  const costEstimate = useMemo((): CostEstimateRequest | null => {
    if (selectedConfigs.size === 0 || selectedQueries.size === 0 || !configs) {
      return null
    }

    // Check if any selected config uses LLM judge
    const selectedConfigsArray = Array.from(selectedConfigs)
    const configsWithLLM = selectedConfigsArray
      .map((id) => configs.find((c) => c.id === id))
      .filter((c) => c?.evaluation_settings?.use_llm_judge)

    if (configsWithLLM.length === 0) {
      return null // No cost if no LLM judge
    }

    // Use the first LLM judge config for cost estimation
    const firstLLMConfig = configsWithLLM[0]!
    const avgTopK = configs.reduce((sum, c) => sum + c.top_k, 0) / configs.length

    return {
      num_queries: selectedQueries.size * configsWithLLM.length,
      chunks_per_query: Math.round(avgTopK),
      use_llm_judge: true,
      llm_judge_model: firstLLMConfig.evaluation_settings?.llm_judge_model || 'gpt-3.5-turbo',
    }
  }, [selectedConfigs, selectedQueries, configs])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Run Experiment</DialogTitle>
          <DialogDescription>
            Select configurations and queries to compare
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Experiment Name (Optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Chunking Strategy Comparison"
              />
            </div>

            {/* Select Configurations */}
            <div className="grid gap-2">
              <Label>
                Select Configurations <span className="text-destructive">*</span>
              </Label>
              <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {configs && configs.length > 0 ? (
                  configs.map((config) => (
                    <div key={config.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={`config-${config.id}`}
                        checked={selectedConfigs.has(config.id)}
                        onCheckedChange={() => toggleConfig(config.id)}
                      />
                      <label
                        htmlFor={`config-${config.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {config.name}
                        <span className="text-muted-foreground text-xs block">
                          {config.chunk_strategy} • {config.embedding_model} • {config.retrieval_strategy}
                        </span>
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No configurations available</p>
                )}
              </div>
            </div>

            {/* Select Queries */}
            <div className="grid gap-2">
              <Label>
                Select Test Queries <span className="text-destructive">*</span>
              </Label>
              <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {queries && queries.length > 0 ? (
                  queries.map((query) => (
                    <div key={query.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={`query-${query.id}`}
                        checked={selectedQueries.has(query.id)}
                        onCheckedChange={() => toggleQuery(query.id)}
                      />
                      <label
                        htmlFor={`query-${query.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {query.query_text}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No queries available</p>
                )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              This will run {selectedConfigs.size} configuration(s) against{' '}
              {selectedQueries.size} query(ies) = {selectedConfigs.size * selectedQueries.size}{' '}
              total tests
            </div>

            {/* Cost Estimate */}
            {costEstimate && <CostEstimator request={costEstimate} />}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createExperiment.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createExperiment.isPending ||
                selectedConfigs.size === 0 ||
                selectedQueries.size === 0
              }
            >
              {createExperiment.isPending ? 'Starting...' : 'Run Experiment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
