import { Link, useLocation, useParams } from 'react-router-dom'
import { useProject } from '@/hooks/useProjects'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  Settings,
  FlaskConical,
  HelpCircle,
  ChevronLeft,
} from 'lucide-react'

interface ProjectLayoutProps {
  children: React.ReactNode
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project } = useProject(projectId)
  const location = useLocation()

  const isActive = (path: string) => location.pathname.includes(path)

  const navItems = [
    {
      title: 'Documents',
      icon: FileText,
      path: `/projects/${projectId}/documents`,
    },
    {
      title: 'Configurations',
      icon: Settings,
      path: `/projects/${projectId}/configs`,
    },
    {
      title: 'Test Queries',
      icon: HelpCircle,
      path: `/projects/${projectId}/queries`,
    },
    {
      title: 'Experiments',
      icon: FlaskConical,
      path: `/projects/${projectId}/experiments/list`,
    },
  ]

  return (
    <SidebarProvider>
      <Sidebar className="bg-white">
        <SidebarHeader className="border-b">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/projects" className="flex items-center gap-2 mt-16">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="font-semibold">All Projects</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>
              {project?.name || 'Project'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.path)}
                    >
                      <Link to={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{project?.name}</span>
            {project?.description && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-muted-foreground">{project.description}</span>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
