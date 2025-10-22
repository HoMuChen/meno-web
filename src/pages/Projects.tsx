import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api, { ApiException } from '@/lib/api'
import type { Project, ProjectsResponse, CreateProjectRequest } from '@/types/project'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Fetch projects
  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get<ProjectsResponse>('/api/projects')

      if (response.success && response.data) {
        setProjects(response.data.projects)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to load projects')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Load projects on mount
  useEffect(() => {
    fetchProjects()
  }, [])

  // Handle create project
  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setIsCreating(true)

    try {
      const projectData: CreateProjectRequest = {
        name: name.trim(),
        ...(description.trim() && { description: description.trim() }),
      }

      const response = await api.post<{ success: boolean; data: Project }>(
        '/api/projects',
        projectData
      )

      if (response.success) {
        // Close dialog and reset form
        setIsCreateDialogOpen(false)
        setName('')
        setDescription('')
        // Refresh projects list
        fetchProjects()
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setCreateError(err.message || 'Failed to create project')
      } else {
        setCreateError('Unable to connect to the server')
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:px-4 lg:px-6">
      {/* Header - Mobile-first responsive */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage your projects and their configurations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" size="default">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateProject}>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to organize your work
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {createError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {createError}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="My Awesome Project"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of your project"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    disabled={isCreating}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Project'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Skeleton Loading state - Mobile-first grid */}
      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="space-y-2 pb-3">
                <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
                <div className="flex items-center justify-between pt-2">
                  <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
                  <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error state - Mobile-first responsive */}
      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive sm:p-6">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Error loading projects</p>
              <p className="mt-1 text-xs opacity-90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Empty state - Mobile-first */}
      {!isLoading && !error && projects.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                aria-hidden="true"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold sm:text-xl">No projects yet</h3>
            <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground sm:text-base">
              Get started by creating your first project to organize your work
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="min-h-[44px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modern Projects Grid - Mobile-first responsive */}
      {!isLoading && !error && projects.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <Card
              key={project._id}
              className="group relative overflow-hidden transition-all duration-200 hover:border-primary/50 cursor-pointer"
              onClick={() => navigate(`/projects/${project._id}`)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="line-clamp-1 text-base sm:text-lg">
                  {project.name}
                </CardTitle>
                {project.description && (
                  <CardDescription className="line-clamp-2 text-sm">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent>
                {/* Project Stats */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                    <span>
                      {new Date(project.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
