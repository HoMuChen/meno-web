import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import api, { ApiException } from '@/lib/api'
import { setDefaultProjectFlag } from '@/lib/auth'
import type {
  Project,
  ProjectsResponse,
  CreateProjectRequest,
} from '@/types/project'

interface ProjectsContextType {
  projects: Project[]
  isLoading: boolean
  error: string | null
  fetchProjects: () => Promise<void>
  createDefaultProject: () => Promise<Project | null>
  ensureDefaultProject: () => Promise<Project | null>
  refreshProjects: () => Promise<void>
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined)

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  const fetchProjects = useCallback(async () => {
    // Prevent concurrent requests
    if (isFetching) return

    try {
      setIsFetching(true)
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
      setIsFetching(false)
    }
  }, [isFetching])

  const createDefaultProject = useCallback(async (): Promise<Project | null> => {
    try {
      const projectData: CreateProjectRequest = {
        name: 'My Meetings',
        description: 'Default project for all meetings',
      }

      const response = await api.post<{ success: boolean; data: Project }>(
        '/api/projects',
        projectData
      )

      if (response.success && response.data) {
        setProjects((prev) => [response.data, ...prev])
        return response.data
      }
      return null
    } catch (err) {
      console.error('Failed to create default project:', err)
      return null
    }
  }, [])

  const ensureDefaultProject = useCallback(async (): Promise<Project | null> => {
    try {
      // Fetch existing projects directly to avoid stale state
      const response = await api.get<ProjectsResponse>('/api/projects')

      if (response.success && response.data) {
        const existingProjects = response.data.projects

        if (existingProjects.length === 0) {
          // No projects exist, create default
          const defaultProject = await createDefaultProject()
          if (defaultProject) {
            setDefaultProjectFlag()
            return defaultProject
          }
        } else {
          // Projects exist, update state and use first one
          setProjects(existingProjects)
          setDefaultProjectFlag()
          return existingProjects[0]
        }
      }
      return null
    } catch (err) {
      console.error('Failed to ensure default project:', err)
      return null
    }
  }, [createDefaultProject])

  const refreshProjects = useCallback(async () => {
    await fetchProjects()
  }, [fetchProjects])

  // Initial fetch on mount
  useEffect(() => {
    fetchProjects()
  }, []) // Empty dependency array - only fetch once on mount

  const value: ProjectsContextType = {
    projects,
    isLoading,
    error,
    fetchProjects,
    createDefaultProject,
    ensureDefaultProject,
    refreshProjects,
  }

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  )
}

export function useProjectsContext() {
  const context = useContext(ProjectsContext)
  if (context === undefined) {
    throw new Error('useProjectsContext must be used within a ProjectsProvider')
  }
  return context
}
