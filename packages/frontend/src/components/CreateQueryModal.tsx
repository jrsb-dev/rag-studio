import { useState } from 'react'
import type { QueryCreate } from '@/types/api'
import { useCreateQuery } from '@/hooks/useQueries'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface CreateQueryModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export default function CreateQueryModal({
  projectId,
  isOpen,
  onClose,
}: CreateQueryModalProps) {
  const createQuery = useCreateQuery(projectId)
  const { toast } = useToast()

  const [formData, setFormData] = useState<QueryCreate>({
    query_text: '',
    ground_truth: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createQuery.mutateAsync({
        ...formData,
        ground_truth: formData.ground_truth || undefined,
      })
      toast({
        title: 'Query created',
        description: 'Test query was successfully created',
      })
      setFormData({
        query_text: '',
        ground_truth: '',
      })
      onClose()
    } catch (error) {
      toast({
        title: 'Creation failed',
        description: error instanceof Error ? error.message : 'Failed to create query',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Test Query</DialogTitle>
          <DialogDescription>
            Add a test query to evaluate your RAG configurations
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="query_text">
                Query Text <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="query_text"
                value={formData.query_text}
                onChange={(e) => setFormData({ ...formData, query_text: e.target.value })}
                required
                rows={3}
                placeholder="What is the main topic of the document?"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ground_truth">
                Expected Answer (for IR metrics)
              </Label>
              <Textarea
                id="ground_truth"
                value={formData.ground_truth}
                onChange={(e) => setFormData({ ...formData, ground_truth: e.target.value })}
                rows={4}
                placeholder="Provide the expected answer text. This enables MRR, NDCG, Precision, Recall, and F1 metrics by comparing retrieved chunks semantically."
              />
              <p className="text-sm text-muted-foreground">
                <strong>Recommended:</strong> Add expected answer to enable all IR metrics. The system will automatically match retrieved chunks using semantic similarity.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createQuery.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createQuery.isPending || !formData.query_text.trim()}
            >
              {createQuery.isPending ? 'Creating...' : 'Create Query'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
