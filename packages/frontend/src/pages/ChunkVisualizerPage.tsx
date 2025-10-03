import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useProject } from '@/hooks/useProjects'
import SimilarityHeatmap from '@/components/SimilarityHeatmap'

interface ChunkBoundary {
  chunk_id: string
  start_pos: number
  end_pos: number
  chunk_index: number
  content_preview: string
  token_count: number
  metadata: Record<string, any>
}

interface OverlapRegion {
  chunk_a_id: string
  chunk_b_id: string
  start_pos: number
  end_pos: number
  overlap_text: string
}

interface ChunkStatistics {
  total_chunks: number
  avg_chunk_size: number
  min_chunk_size: number
  max_chunk_size: number
  total_overlap_chars: number
  avg_overlap_size: number
  coverage: number
}

interface ChunkVisualizationData {
  document_id: string
  document_filename: string
  config_id: string
  config_name: string
  full_text: string
  total_length: number
  chunks: ChunkBoundary[]
  overlaps: OverlapRegion[]
  statistics: ChunkStatistics
  chunk_strategy: string
  chunk_size: number | null
  chunk_overlap: number | null
}

export default function ChunkVisualizerPage() {
  const { projectId, configId, documentId } = useParams<{
    projectId: string
    configId: string
    documentId: string
  }>()
  const { data: project } = useProject(projectId)

  const [showOverlaps, setShowOverlaps] = useState(true)
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null)
  const [hoveredChunkIndex, setHoveredChunkIndex] = useState<number | null>(null)

  const { data: visualization, isLoading, error } = useQuery({
    queryKey: ['chunk-visualization', projectId, configId, documentId],
    queryFn: async () => {
      const response = await api.get<ChunkVisualizationData>(
        `/api/projects/${projectId}/configs/${configId}/documents/${documentId}/chunks/visualization`
      )
      return response.data
    },
    enabled: !!projectId && !!configId && !!documentId,
  })

  // Fetch similarity matrix
  const { data: similarityData, isLoading: similarityLoading } = useQuery({
    queryKey: ['chunk-similarity', projectId, configId, documentId],
    queryFn: async () => {
      const response = await api.get(
        `/api/projects/${projectId}/configs/${configId}/documents/${documentId}/chunks/similarity-matrix`
      )
      return response.data
    },
    enabled: !!projectId && !!configId && !!documentId && !!visualization,
  })

	console.log(similarityData)

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-muted-foreground">Loading chunk visualization...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Error loading visualization: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!visualization) {
    return null
  }

  // Helper to get chunk color based on index
  const getChunkColor = (index: number) => {
    const colors = [
      'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-700',
      'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-700',
      'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-700',
      'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-700',
      'bg-pink-100 dark:bg-pink-950 border-pink-300 dark:border-pink-700',
    ]
    return colors[index % colors.length]
  }

  // Helper to split chunk into overlap and non-overlap segments
  const splitChunkByOverlaps = (chunk: ChunkBoundary, idx: number) => {
    const segments: Array<{ start: number; end: number; isOverlap: boolean }> = []

    // Check if this chunk overlaps with the PREVIOUS chunk
    const prevChunk = visualization.chunks[idx - 1]

    if (prevChunk && chunk.start_pos < prevChunk.end_pos) {
      // There IS an overlap
      const overlapEnd = prevChunk.end_pos

      // Segment 1: Overlapping part (from chunk start to end of previous chunk)
      segments.push({
        start: chunk.start_pos,
        end: overlapEnd,
        isOverlap: true,
      })

      // Segment 2: Non-overlapping part (rest of chunk)
      if (overlapEnd < chunk.end_pos) {
        segments.push({
          start: overlapEnd,
          end: chunk.end_pos,
          isOverlap: false,
        })
      }
    } else {
      // No overlap, entire chunk is one segment
      segments.push({
        start: chunk.start_pos,
        end: chunk.end_pos,
        isOverlap: false,
      })
    }

    return segments
  }

  // Render document with chunk boundaries
  const renderDocumentWithChunks = () => {
    const elements: JSX.Element[] = []
    let currentPos = 0

    visualization.chunks.forEach((chunk, idx) => {
      // Add text before chunk if any
      if (chunk.start_pos > currentPos) {
        const beforeText = visualization.full_text.substring(currentPos, chunk.start_pos)
        if (beforeText.trim()) {
          elements.push(
            <span key={`gap-${currentPos}`} className="text-muted-foreground/50">
              {beforeText}
            </span>
          )
        }
      }

      const isSelected = chunk.chunk_id === selectedChunkId
      const chunkColor = getChunkColor(idx)
      const segments = splitChunkByOverlaps(chunk, idx)

      // Render each segment of the chunk
      segments.forEach((segment, segIdx) => {
        const segmentText = visualization.full_text.substring(segment.start, segment.end)

        elements.push(
          <span
            key={`${chunk.chunk_id}-${segIdx}`}
            className={`inline px-1 py-0.5 border-2 cursor-pointer transition-all ${chunkColor} ${
              isSelected ? 'ring-2 ring-blue-500' : ''
            } ${
              segment.isOverlap && showOverlaps
                ? '[background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(234,179,8,0.3)_4px,rgba(234,179,8,0.3)_8px)] dark:[background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(202,138,4,0.4)_4px,rgba(202,138,4,0.4)_8px)]'
                : ''
            }`}
            onClick={() => setSelectedChunkId(chunk.chunk_id)}
            title={`Chunk #${chunk.chunk_index + 1}${segment.isOverlap ? ' (Overlap)' : ''} | ${chunk.token_count} tokens`}
          >
            {segmentText}
          </span>
        )
      })

      currentPos = chunk.end_pos
    })

    // Add remaining text
    if (currentPos < visualization.full_text.length) {
      const remainingText = visualization.full_text.substring(currentPos)
      if (remainingText.trim()) {
        elements.push(
          <span key={`remaining-${currentPos}`} className="text-muted-foreground/50">
            {remainingText}
          </span>
        )
      }
    }

    return elements
  }

  const selectedChunk = visualization.chunks.find((c) => c.chunk_id === selectedChunkId)

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Chunk Visualizer</h1>
        <p className="text-muted-foreground mt-1">
          {project?.name} / {visualization.config_name} / {visualization.document_filename}
        </p>
      </div>

      {/* Statistics Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Chunking Statistics</CardTitle>
          <CardDescription>
            Strategy: {visualization.chunk_strategy} | Size: {visualization.chunk_size || 'N/A'} tokens | Overlap:{' '}
            {visualization.chunk_overlap || 0} tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{visualization.statistics.total_chunks}</div>
              <div className="text-xs text-muted-foreground">Total Chunks</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{Math.round(visualization.statistics.avg_chunk_size)}</div>
              <div className="text-xs text-muted-foreground">Avg Size (chars)</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{Math.round(visualization.statistics.avg_overlap_size)}</div>
              <div className="text-xs text-muted-foreground">Avg Overlap (chars)</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{visualization.statistics.coverage.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Coverage</div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch id="show-overlaps" checked={showOverlaps} onCheckedChange={setShowOverlaps} />
              <Label htmlFor="show-overlaps">Show Overlaps</Label>
            </div>
            <div className="text-sm text-muted-foreground">
              Document: {visualization.total_length.toLocaleString()} characters
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Text */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Document with Chunk Boundaries</CardTitle>
              <CardDescription>Click on a chunk to see details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-y-auto p-4 bg-muted/30 rounded-lg border">
                <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
                  {renderDocumentWithChunks()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chunk List Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Chunks ({visualization.chunks.length})</CardTitle>
              <CardDescription>Click to highlight in document</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-y-auto space-y-2">
                {visualization.chunks.map((chunk, idx) => {
                  const isSelected = chunk.chunk_id === selectedChunkId
                  return (
                    <div
                      key={chunk.chunk_id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        getChunkColor(idx)
                      } ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      onClick={() => setSelectedChunkId(chunk.chunk_id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Chunk #{chunk.chunk_index + 1}</Badge>
                        <span className="text-xs text-muted-foreground">{chunk.token_count} tokens</span>
                      </div>
                      <div className="text-xs font-mono bg-background/50 p-2 rounded">
                        {chunk.content_preview}...
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Position: {chunk.start_pos} - {chunk.end_pos}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Chunk Details */}
      {selectedChunk && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Chunk #{selectedChunk.chunk_index + 1} Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-sm font-medium">Token Count</div>
                <div className="text-2xl font-bold">{selectedChunk.token_count}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Start Position</div>
                <div className="text-2xl font-bold">{selectedChunk.start_pos}</div>
              </div>
              <div>
                <div className="text-sm font-medium">End Position</div>
                <div className="text-2xl font-bold">{selectedChunk.end_pos}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Length (chars)</div>
                <div className="text-2xl font-bold">{selectedChunk.end_pos - selectedChunk.start_pos}</div>
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <h4 className="font-medium mb-2">Full Content:</h4>
              <div className="p-4 bg-muted/30 rounded-lg border font-mono text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                {visualization.full_text.substring(selectedChunk.start_pos, selectedChunk.end_pos)}
              </div>
            </div>

            {Object.keys(selectedChunk.metadata).length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="font-medium mb-2">Metadata:</h4>
                  <pre className="text-xs bg-muted/30 p-3 rounded-lg border overflow-x-auto">
                    {JSON.stringify(selectedChunk.metadata, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}



      {/* Similarity Heatmap */}
      {similarityData ? (
        <Card className="mt-6 border-purple-300 dark:border-purple-700">
          <CardHeader>
            <CardTitle>📊 Embedding Similarity Matrix</CardTitle>
            <CardDescription>
              Semantic similarity between chunks based on embeddings (cosine similarity)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {similarityLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading similarity data...</div>
            ) : (
              <SimilarityHeatmap
                data={similarityData}
                onChunkHover={(index) => setHoveredChunkIndex(index)}
              />
            )}
          </CardContent>
        </Card>
      ) : (
				<Card className="mt-6 border-purple-300 dark:border-purple-700">
					<CardHeader>
						<CardTitle>📊 Embedding Similarity Matrix</CardTitle>
						<CardDescription>
							Semantic similarity between chunks based on embeddings (cosine similarity)
						</CardDescription>
					</CardHeader>
					<CardContent>
						No similiary data ...
					</CardContent>
				</Card>
			)}

      {/* Overlap Regions */}
      {showOverlaps && visualization.overlaps.length > 0 && (
        <Card className="mt-6 border-yellow-300 dark:border-yellow-700">
          <CardHeader>
            <CardTitle>Overlap Regions ({visualization.overlaps.length})</CardTitle>
            <CardDescription>Areas where consecutive chunks overlap</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visualization.overlaps.map((overlap, idx) => {
                const chunkA = visualization.chunks.find((c) => c.chunk_id === overlap.chunk_a_id)
                const chunkB = visualization.chunks.find((c) => c.chunk_id === overlap.chunk_b_id)
                return (
                  <div key={idx} className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge>Chunk #{chunkA?.chunk_index}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge>Chunk #{chunkB?.chunk_index}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {overlap.end_pos - overlap.start_pos} chars
                      </span>
                    </div>
                    <div className="text-sm font-mono bg-background/50 p-3 rounded border">
                      {overlap.overlap_text}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
