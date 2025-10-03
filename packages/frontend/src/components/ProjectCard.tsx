import { Link } from 'react-router-dom'
import type { Project } from '@/types/api'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProjectCardProps {
  project: Project
  onDelete?: (id: string) => void
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        {project.description && (
          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            {project.document_count || 0} documents
          </Badge>
          <Badge variant="secondary">
            {project.config_count || 0} configs
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button asChild className="flex-1">
          <Link to={`/projects/${project.id}`}>
            Open Project
          </Link>
        </Button>
        {onDelete && (
          <Button
            variant="destructive"
            onClick={() => onDelete(project.id)}
          >
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
