import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useSettings, useUpdateSettings, useDeleteOpenAIKey } from '@/hooks/useSettings'

export default function SettingsPage() {
  const { toast } = useToast()
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const deleteOpenAIKey = useDeleteOpenAIKey()

  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'Invalid input',
        description: 'Please enter an API key',
        variant: 'destructive',
      })
      return
    }

    try {
      await updateSettings.mutateAsync({
        openai_api_key: apiKey,
      })
      toast({
        title: 'Settings saved',
        description: 'Your OpenAI API key has been saved successfully',
      })
      setApiKey('')
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      })
    }
  }

  const handleClear = async () => {
    if (confirm('Are you sure you want to remove the OpenAI API key?')) {
      try {
        await deleteOpenAIKey.mutateAsync()
        toast({
          title: 'API key removed',
          description: 'OpenAI API key has been removed',
        })
        setApiKey('')
      } catch (error) {
        toast({
          title: 'Delete failed',
          description: error instanceof Error ? error.message : 'Failed to remove API key',
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your RAG Studio settings and API keys
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-muted-foreground">Loading settings...</p>
          </div>
        ) : (
          <>
            <Alert className="mb-6">
              <AlertDescription>
                <strong>Security Note:</strong> API keys are encrypted and stored securely in the database. They are only used by the backend for API calls to OpenAI.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              {/* API Keys Section */}
              <Card>
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Configure API keys for external services
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="openai-key">OpenAI API Key</Label>
                      {settings?.openai_api_key_set && (
                        <span className="text-sm text-green-600 font-medium">✓ Configured</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="openai-key"
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={settings?.openai_api_key_set ? 'Enter new key to update...' : 'sk-...'}
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setShowKey(!showKey)}
                        className="shrink-0"
                      >
                        {showKey ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Required for generating embeddings and using OpenAI models.{' '}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        Get your API key
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>

          {/* Application Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Configure general application behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Additional settings will be added here (theme, defaults, etc.)
              </p>
            </CardContent>
          </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!apiKey.trim() || updateSettings.isPending}
                >
                  {updateSettings.isPending ? 'Saving...' : settings?.openai_api_key_set ? 'Update API Key' : 'Save API Key'}
                </Button>
                {settings?.openai_api_key_set && (
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    disabled={deleteOpenAIKey.isPending}
                  >
                    {deleteOpenAIKey.isPending ? 'Removing...' : 'Remove API Key'}
                  </Button>
                )}
              </div>
        </div>

        {/* Developer Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Developer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Endpoint:</span>
              <span className="font-mono">{import.meta.env.VITE_API_URL || 'http://localhost:8000'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Storage:</span>
              <span>PostgreSQL Database</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version:</span>
              <span>0.1.0</span>
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </div>
  )
}
