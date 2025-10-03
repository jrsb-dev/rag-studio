import { useState } from 'react'
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects'
import ProjectCard from '@/components/ProjectCard'
import CreateProjectModal from '@/components/CreateProjectModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ProjectsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: projects, isLoading, error } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()

  const handleCreate = async (data: { name: string; description?: string }) => {
    await createProject.mutateAsync(data)
    setIsCreateModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject.mutateAsync(id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Projects</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create Project
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-muted-foreground">Loading projects...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Error loading projects: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {projects && projects.length === 0 && (
          <Card className="p-12 text-center">
            <CardHeader>
              <CardTitle>No projects yet</CardTitle>
              <CardDescription>
                Create your first project to start testing RAG configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        )}

        {projects && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreate}
          isLoading={createProject.isPending}
        />
      </div>
    </div>
  )
}
