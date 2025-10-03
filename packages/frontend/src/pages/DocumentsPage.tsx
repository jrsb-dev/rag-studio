import { useParams, Link } from 'react-router-dom'
import { useRef, useState } from 'react'
import { useProject } from '@/hooks/useProjects'
import { useDocuments, useUploadDocuments, useDeleteDocument } from '@/hooks/useDocuments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function DocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project } = useProject(projectId)
  const { data: documents, isLoading, error } = useDocuments(projectId)
  const uploadDocuments = useUploadDocuments(projectId!)
  const deleteDocument = useDeleteDocument(projectId!)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleUpload(Array.from(files))
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await handleUpload(Array.from(files))
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleUpload = async (files: File[]) => {
    try {
      const result = await uploadDocuments.mutateAsync(files)
      toast({
        title: 'Upload complete',
        description: `Successfully uploaded ${result.uploaded} document(s)${
          result.failed > 0 ? `, ${result.failed} failed` : ''
        }`,
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload documents',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteDocument.mutateAsync(documentId)
        toast({
          title: 'Document deleted',
          description: 'Document was successfully deleted',
        })
      } catch (error) {
        toast({
          title: 'Delete failed',
          description: error instanceof Error ? error.message : 'Failed to delete document',
          variant: 'destructive',
        })
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="link" asChild className="mb-2 pl-0">
            <Link to={`/projects/${projectId}`}>
              ← Back to Project
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Documents</h1>
          {project && (
            <p className="text-muted-foreground mt-1">{project.name}</p>
          )}
        </div>

        {/* Upload Area */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              Upload PDF, TXT, or Markdown files to test your RAG configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-muted-foreground mb-4">
                Drag and drop files here, or click to select
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadDocuments.isPending}
              >
                {uploadDocuments.isPending ? 'Uploading...' : 'Select Files'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-muted-foreground">Loading documents...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Error loading documents: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {documents && documents.length === 0 && !isLoading && (
          <Card className="text-center p-12">
            <CardHeader>
              <CardTitle>No documents yet</CardTitle>
              <CardDescription>
                Upload your first document to get started
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {documents && documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{document.filename}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <Badge variant="outline">
                          {document.file_type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(document.file_size)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(document.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(document.id)}
                      disabled={deleteDocument.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
