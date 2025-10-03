import { useState } from 'react'
import { CONFIG_PRESETS, PRESET_CATEGORIES, type ConfigPreset } from '@/lib/config-presets'
import { useCreateConfig } from '@/hooks/useConfigs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface ConfigPresetsViewProps {
  projectId: string
}

export default function ConfigPresetsView({ projectId }: ConfigPresetsViewProps) {
  const [selectedPreset, setSelectedPreset] = useState<ConfigPreset | null>(null)
  const createConfig = useCreateConfig(projectId)
  const { toast } = useToast()

  const handleActivate = async (preset: ConfigPreset) => {
    try {
      await createConfig.mutateAsync(preset.config)
      toast({
        title: 'Preset activated',
        description: `${preset.name} has been added to your configurations`,
      })
      setSelectedPreset(null)
    } catch (error) {
      toast({
        title: 'Activation failed',
        description: error instanceof Error ? error.message : 'Failed to activate preset',
        variant: 'destructive',
      })
    }
  }

  const getCategoryBadgeVariant = (category: ConfigPreset['category']) => {
    switch (category) {
      case 'balanced':
        return 'default'
      case 'quality':
        return 'secondary'
      case 'speed':
        return 'outline'
      case 'experimental':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const groupedPresets = CONFIG_PRESETS.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = []
    }
    acc[preset.category].push(preset)
    return acc
  }, {} as Record<string, ConfigPreset[]>)

  return (
    <>
      <div className="space-y-8">
        {Object.entries(groupedPresets).map(([category, presets]) => {
          const categoryInfo = PRESET_CATEGORIES[category as keyof typeof PRESET_CATEGORIES]
          return (
            <div key={category}>
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{categoryInfo.label}</h3>
                <p className="text-sm text-muted-foreground">{categoryInfo.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {presets.map((preset) => (
                  <Card key={preset.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-base">{preset.name}</CardTitle>
                        <Badge variant={getCategoryBadgeVariant(preset.category)}>
                          {categoryInfo.label}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {preset.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Chunking:</span>
                          <span className="font-medium">
                            {preset.config.chunk_strategy} • {preset.config.chunk_size}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Embedding:</span>
                          <span className="font-medium truncate ml-2">
                            {preset.config.embedding_model}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Retrieval:</span>
                          <span className="font-medium">
                            {preset.config.retrieval_strategy} • K={preset.config.top_k}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedPreset(preset)}
                        >
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleActivate(preset)}
                          disabled={createConfig.isPending}
                        >
                          Activate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview Dialog */}
      {selectedPreset && (
        <Dialog open={!!selectedPreset} onOpenChange={() => setSelectedPreset(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{selectedPreset.name}</DialogTitle>
              <DialogDescription>{selectedPreset.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-semibold mb-2">Configuration Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Chunk Strategy:</span>
                    <span className="font-medium">{selectedPreset.config.chunk_strategy}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Chunk Size:</span>
                    <span className="font-medium">{selectedPreset.config.chunk_size} tokens</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Chunk Overlap:</span>
                    <span className="font-medium">
                      {selectedPreset.config.chunk_overlap || 0} tokens
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Embedding Model:</span>
                    <span className="font-medium">{selectedPreset.config.embedding_model}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Retrieval Strategy:</span>
                    <span className="font-medium">
                      {selectedPreset.config.retrieval_strategy}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Top K Results:</span>
                    <span className="font-medium">{selectedPreset.config.top_k}</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Category:</strong>{' '}
                  {PRESET_CATEGORIES[selectedPreset.category].label}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {PRESET_CATEGORIES[selectedPreset.category].description}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPreset(null)}>
                Close
              </Button>
              <Button
                onClick={() => handleActivate(selectedPreset)}
                disabled={createConfig.isPending}
              >
                {createConfig.isPending ? 'Activating...' : 'Activate Preset'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
