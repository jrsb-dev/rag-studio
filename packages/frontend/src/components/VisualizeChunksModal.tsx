import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocuments } from '@/hooks/useDocuments'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Props {
  isOpen: boolean
  onClose: () => void
  projectId: string
  configId: string
}

export default function VisualizeChunksModal({ isOpen, onClose, projectId, configId }: Props) {
  const navigate = useNavigate()
  const { data: documents, isLoading } = useDocuments(projectId)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('')

  const handleVisualize = () => {
    if (selectedDocumentId) {
      navigate(`/projects/${projectId}/configs/${configId}/documents/${selectedDocumentId}/visualize`)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Visualize Chunks</DialogTitle>
          <DialogDescription>
            Select a document to visualize how it's been chunked with this configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="document">Document</Label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading documents...</div>
            ) : documents && documents.length > 0 ? (
              <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
                <SelectTrigger id="document">
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground">
                No documents found. Please upload documents first.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleVisualize} disabled={!selectedDocumentId}>
              Visualize
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
