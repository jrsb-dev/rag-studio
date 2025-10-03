import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SimilarityMatrixData {
  document_id: string
  config_id: string
  chunk_ids: string[]
  similarity_matrix: number[][]
  avg_similarity: number
  min_similarity: number
  max_similarity: number
  discontinuities: Array<{
    chunk_a_index: number
    chunk_b_index: number
    chunk_a_id: string
    chunk_b_id: string
    similarity: number
    severity: 'high' | 'medium'
  }>
}

interface Props {
  data: SimilarityMatrixData
  onChunkHover?: (chunkIndex: number | null) => void
}

export default function SimilarityHeatmap({ data, onChunkHover }: Props) {
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number } | null>(null)

  // Get color for similarity score
  const getColor = (similarity: number) => {
    if (similarity >= 0.8) return 'bg-green-600'
    if (similarity >= 0.6) return 'bg-green-400'
    if (similarity >= 0.4) return 'bg-yellow-400'
    if (similarity >= 0.2) return 'bg-orange-400'
    return 'bg-red-500'
  }

  const getSeverityColor = (severity: string) => {
    return severity === 'high' ? 'bg-red-500' : 'bg-orange-500'
  }

  const n = data.chunk_ids.length

  // Limit display size for large matrices
  const maxDisplay = 20
  const displayMatrix = n > maxDisplay

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Similarity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avg_similarity.toFixed(3)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Min Similarity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.min_similarity.toFixed(3)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Max Similarity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.max_similarity.toFixed(3)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      {displayMatrix && (
        <Alert>
          <AlertDescription>
            Matrix too large to display ({n}x{n}). Showing first {maxDisplay} chunks.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Similarity Heatmap</CardTitle>
          <CardDescription>
            Hover over cells to see similarity scores. Darker = more similar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Legend */}
              <div className="flex items-center gap-4 mb-4 text-xs">
                <span className="text-muted-foreground">Legend:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>0.0-0.2</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-orange-400 rounded"></div>
                  <span>0.2-0.4</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span>0.4-0.6</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-400 rounded"></div>
                  <span>0.6-0.8</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span>0.8-1.0</span>
                </div>
              </div>

              {/* Heatmap Grid */}
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(n, maxDisplay) + 1}, minmax(0, 1fr))` }}>
                {/* Header row */}
                <div className="text-center text-xs font-medium py-1"></div>
                {Array.from({ length: Math.min(n, maxDisplay) }).map((_, j) => (
                  <div key={`header-${j}`} className="text-center text-xs font-medium py-1">
                    #{j}
                  </div>
                ))}

                {/* Data rows */}
                {Array.from({ length: Math.min(n, maxDisplay) }).map((_, i) => (
                  <>
                    {/* Row header */}
                    <div key={`row-label-${i}`} className="text-right text-xs font-medium pr-2 flex items-center justify-end">
                      #{i}
                    </div>

                    {/* Cells */}
                    {Array.from({ length: Math.min(n, maxDisplay) }).map((_, j) => {
                      const similarity = data.similarity_matrix[i][j]
                      const isHovered = hoveredCell?.i === i && hoveredCell?.j === j
                      const isDiagonal = i === j

                      return (
                        <div
                          key={`cell-${i}-${j}`}
                          className={`aspect-square ${getColor(similarity)} ${
                            isDiagonal ? 'border-2 border-blue-500' : ''
                          } ${
                            isHovered ? 'ring-2 ring-blue-500 z-10' : ''
                          } transition-all cursor-pointer flex items-center justify-center text-xs font-mono`}
                          onMouseEnter={() => {
                            setHoveredCell({ i, j })
                            if (onChunkHover) onChunkHover(i)
                          }}
                          onMouseLeave={() => {
                            setHoveredCell(null)
                            if (onChunkHover) onChunkHover(null)
                          }}
                          title={`Chunk ${i} ↔ Chunk ${j}: ${similarity.toFixed(3)}`}
                        >
                          {isHovered && <span className="text-white text-[10px]">{similarity.toFixed(2)}</span>}
                        </div>
                      )
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>

          {hoveredCell && (
            <div className="mt-4 p-3 bg-muted rounded-lg border text-sm">
              <div className="font-medium">
                Chunk #{hoveredCell.i} ↔ Chunk #{hoveredCell.j}
              </div>
              <div className="text-muted-foreground mt-1">
                Similarity: {data.similarity_matrix[hoveredCell.i][hoveredCell.j].toFixed(4)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discontinuities */}
      {data.discontinuities.length > 0 && (
        <Card className="border-orange-300 dark:border-orange-700">
          <CardHeader>
            <CardTitle>⚠️ Semantic Discontinuities ({data.discontinuities.length})</CardTitle>
            <CardDescription>
              Adjacent chunks with low similarity (potential chunking issues)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.discontinuities.map((disc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getSeverityColor(disc.severity)}>
                      {disc.severity === 'high' ? '🔴 High' : '🟡 Medium'}
                    </Badge>
                    <div className="text-sm">
                      <span className="font-medium">Chunk #{disc.chunk_a_index}</span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-medium">Chunk #{disc.chunk_b_index}</span>
                    </div>
                  </div>
                  <div className="text-sm font-mono">
                    Similarity: {disc.similarity.toFixed(3)}
                  </div>
                </div>
              ))}
            </div>
            <Alert className="mt-4">
              <AlertDescription className="text-xs">
                💡 <strong>Tip:</strong> Low similarity between adjacent chunks may indicate poor chunking strategy.
                Consider adjusting chunk size or using semantic chunking.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
