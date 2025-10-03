import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface RetrievedChunkInfo {
  chunk_id: string
  chunk_index: number
  rank: number
  score: number | null
  start_pos: number
  end_pos: number
  content: string
}

interface DocumentContextData {
  document_id: string
  document_filename: string
  full_text: string
  config_id: string
  config_name: string
  query_id: string | null
  query_text: string | null
  retrieved_chunks: RetrievedChunkInfo[]
  all_chunks: Array<{
    chunk_id: string
    chunk_index: number
    start_pos: number
    end_pos: number
    is_retrieved: boolean
  }>
  total_chunks: number
  retrieved_count: number
}

export default function DocumentContextPage() {
  const { resultId, projectId, experimentId } = useParams<{
    resultId: string
    projectId: string
    experimentId: string
  }>()

  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null)

  const { data: context, isLoading, error } = useQuery({
    queryKey: ['document-context', resultId],
    queryFn: async () => {
      const response = await api.get<DocumentContextData>(
        `/api/results/${resultId}/document-context`
      )
      return response.data
    },
    enabled: !!resultId,
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-muted-foreground">Loading document context...</p>
        </div>
      </div>
    )
  }

  if (error || !context) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Error loading document context: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Helper to get rank color
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-green-500 dark:bg-green-600'
    if (rank === 2) return 'bg-blue-500 dark:bg-blue-600'
    if (rank === 3) return 'bg-purple-500 dark:bg-purple-600'
    if (rank <= 5) return 'bg-orange-500 dark:bg-orange-600'
    return 'bg-gray-500 dark:bg-gray-600'
  }

  // Helper to get rank label
  const getRankLabel = (rank: number) => {
    if (rank === 1) return '🥇 #1'
    if (rank === 2) return '🥈 #2'
    if (rank === 3) return '🥉 #3'
    return `#${rank}`
  }

  // Render document with chunks
  const renderDocumentWithHighlighting = () => {
    const elements: JSX.Element[] = []
    let currentPos = 0

    // Sort all chunks by position
    const sortedChunks = [...context.all_chunks].sort((a, b) => a.start_pos - b.start_pos)

    sortedChunks.forEach((chunk, idx) => {
      // Add text before chunk if any
      if (chunk.start_pos > currentPos) {
        const beforeText = context.full_text.substring(currentPos, chunk.start_pos)
        if (beforeText.trim()) {
          elements.push(
            <span key={`gap-${currentPos}`} className="text-muted-foreground/70">
              {beforeText}
            </span>
          )
        }
      }

      // Check if this chunk was retrieved
      const retrievedInfo = context.retrieved_chunks.find((r) => r.chunk_id === chunk.chunk_id)
      const isRetrieved = chunk.is_retrieved
      const isSelected = chunk.chunk_id === selectedChunkId

      // Get chunk text
      const chunkText = context.full_text.substring(chunk.start_pos, chunk.end_pos)

      if (isRetrieved && retrievedInfo) {
        // Retrieved chunk: highlighted
        elements.push(
          <span
            key={chunk.chunk_id}
            className={`inline-block px-2 py-1 rounded border-2 cursor-pointer transition-all ${getRankColor(
              retrievedInfo.rank
            )} text-white font-medium ${isSelected ? 'ring-4 ring-blue-400' : ''}`}
            onClick={() => setSelectedChunkId(chunk.chunk_id)}
            title={`${getRankLabel(retrievedInfo.rank)} | Score: ${retrievedInfo.score?.toFixed(3) || 'N/A'}`}
          >
            <span className="text-xs font-bold mr-1">{getRankLabel(retrievedInfo.rank)}</span>
            {chunkText}
          </span>
        )
      } else {
        // Non-retrieved chunk: dimmed
        elements.push(
          <span
            key={chunk.chunk_id}
            className={`inline px-1 py-0.5 rounded border cursor-pointer transition-all bg-muted/30 border-muted text-muted-foreground/60 ${
              isSelected ? 'ring-2 ring-gray-400' : ''
            }`}
            onClick={() => setSelectedChunkId(chunk.chunk_id)}
            title={`Chunk #${chunk.chunk_index} (not retrieved)`}
          >
            {chunkText}
          </span>
        )
      }

      currentPos = chunk.end_pos
    })

    // Add remaining text
    if (currentPos < context.full_text.length) {
      const remainingText = context.full_text.substring(currentPos)
      if (remainingText.trim()) {
        elements.push(
          <span key={`remaining-${currentPos}`} className="text-muted-foreground/70">
            {remainingText}
          </span>
        )
      }
    }

    return elements
  }

  const selectedChunk = context.retrieved_chunks.find((c) => c.chunk_id === selectedChunkId)

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to={`/projects/${projectId}/experiments/${experimentId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Results
          </Link>
        </Button>

        <h1 className="text-3xl font-bold">Document Context View</h1>
        <p className="text-muted-foreground mt-1">
          {context.document_filename} • {context.config_name}
        </p>
        {context.query_text && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Query:</div>
            <div className="text-sm text-blue-700 dark:text-blue-300">{context.query_text}</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Retrieved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{context.retrieved_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Chunks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{context.total_chunks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((context.retrieved_count / context.total_chunks) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Document Length</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{context.full_text.length.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">characters</div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded bg-green-500 text-white font-medium">🥇 #1</div>
              <span>Top result</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded bg-blue-500 text-white font-medium">🥈 #2</div>
              <span>Second</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded bg-purple-500 text-white font-medium">🥉 #3</div>
              <span>Third</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded bg-orange-500 text-white font-medium">#4-5</div>
              <span>Top 5</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded bg-muted/30 border border-muted text-muted-foreground/60">
                Not retrieved
              </div>
              <span>Not selected</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document */}
      <Card>
        <CardHeader>
          <CardTitle>Document with Retrieved Chunks Highlighted</CardTitle>
          <CardDescription>Click on chunks to see details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-y-auto p-4 bg-muted/20 rounded-lg border">
            <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {renderDocumentWithHighlighting()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Chunk Details */}
      {selectedChunk && (
        <Card className="mt-6 border-blue-300 dark:border-blue-700">
          <CardHeader>
            <CardTitle>
              {getRankLabel(selectedChunk.rank)} Chunk Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Rank</div>
                  <Badge className={getRankColor(selectedChunk.rank)}>
                    {getRankLabel(selectedChunk.rank)}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Score</div>
                  <div className="text-lg font-bold">
                    {selectedChunk.score?.toFixed(3) || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Chunk Index</div>
                  <div className="text-lg font-bold">#{selectedChunk.chunk_index}</div>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="text-sm font-medium mb-2">Content:</div>
                <div className="p-3 bg-muted/30 rounded border font-mono text-sm">
                  {selectedChunk.content}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
