import { useState } from 'react'
import type { ConfigCreate, EvaluationSettings } from '@/types/api'
import { useCreateConfig } from '@/hooks/useConfigs'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import ConfigEvaluationSettings from './ConfigEvaluationSettings'

interface CreateConfigModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export default function CreateConfigModal({
  projectId,
  isOpen,
  onClose,
}: CreateConfigModalProps) {
  const createConfig = useCreateConfig(projectId)
  const { toast } = useToast()

  const [formData, setFormData] = useState<ConfigCreate>({
    name: '',
    chunk_strategy: 'fixed',
    chunk_size: 512,
    chunk_overlap: 50,
    embedding_model: 'text-embedding-ada-002',
    retrieval_strategy: 'dense',
    top_k: 5,
    evaluation_settings: {
      use_llm_judge: false,
      llm_judge_model: 'gpt-3.5-turbo',
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createConfig.mutateAsync(formData)
      toast({
        title: 'Configuration created',
        description: `${formData.name} was successfully created`,
      })
      setFormData({
        name: '',
        chunk_strategy: 'fixed',
        chunk_size: 512,
        chunk_overlap: 50,
        embedding_model: 'text-embedding-ada-002',
        retrieval_strategy: 'dense',
        top_k: 5,
        evaluation_settings: {
          use_llm_judge: false,
          llm_judge_model: 'gpt-3.5-turbo',
        },
      })
      onClose()
    } catch (error) {
      toast({
        title: 'Creation failed',
        description: error instanceof Error ? error.message : 'Failed to create configuration',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create RAG Configuration</DialogTitle>
          <DialogDescription>
            Configure chunking, embedding, and retrieval strategies
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Configuration Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Small Chunks Dense"
              />
            </div>

            {/* Chunk Strategy */}
            <div className="grid gap-2">
              <Label htmlFor="chunk_strategy">
                Chunk Strategy <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.chunk_strategy}
                onValueChange={(value) =>
                  setFormData({ ...formData, chunk_strategy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Size</SelectItem>
                  <SelectItem value="semantic">Semantic</SelectItem>
                  <SelectItem value="recursive">Recursive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chunk Size */}
            <div className="grid gap-2">
              <Label htmlFor="chunk_size">
                Chunk Size (tokens) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="chunk_size"
                type="number"
                min={1}
                max={8192}
                value={formData.chunk_size || ''}
                onChange={(e) =>
                  setFormData({ ...formData, chunk_size: parseInt(e.target.value) })
                }
                required
              />
            </div>

            {/* Chunk Overlap */}
            <div className="grid gap-2">
              <Label htmlFor="chunk_overlap">Chunk Overlap (tokens)</Label>
              <Input
                id="chunk_overlap"
                type="number"
                min={0}
                max={1000}
                value={formData.chunk_overlap || ''}
                onChange={(e) =>
                  setFormData({ ...formData, chunk_overlap: parseInt(e.target.value) })
                }
              />
            </div>

            {/* Embedding Model */}
            <div className="grid gap-2">
              <Label htmlFor="embedding_model">
                Embedding Model <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.embedding_model}
                onValueChange={(value) =>
                  setFormData({ ...formData, embedding_model: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text-embedding-ada-002">
                    OpenAI Ada-002
                  </SelectItem>
                  <SelectItem value="text-embedding-3-small">
                    OpenAI Embedding-3-Small
                  </SelectItem>
                  <SelectItem value="text-embedding-3-large">
                    OpenAI Embedding-3-Large
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Retrieval Strategy */}
            <div className="grid gap-2">
              <Label htmlFor="retrieval_strategy">
                Retrieval Strategy <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.retrieval_strategy}
                onValueChange={(value) =>
                  setFormData({ ...formData, retrieval_strategy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dense">Dense (Vector Similarity)</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Dense + BM25)</SelectItem>
                  <SelectItem value="bm25">BM25 (Keyword)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Top K */}
            <div className="grid gap-2">
              <Label htmlFor="top_k">
                Top K Results <span className="text-destructive">*</span>
              </Label>
              <Input
                id="top_k"
                type="number"
                min={1}
                max={20}
                value={formData.top_k}
                onChange={(e) =>
                  setFormData({ ...formData, top_k: parseInt(e.target.value) })
                }
                required
              />
            </div>

            {/* Evaluation Settings */}
            <ConfigEvaluationSettings
              settings={formData.evaluation_settings || {}}
              onChange={(evaluation_settings) =>
                setFormData({ ...formData, evaluation_settings })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createConfig.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createConfig.isPending || !formData.name.trim()}>
              {createConfig.isPending ? 'Creating...' : 'Create Configuration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
