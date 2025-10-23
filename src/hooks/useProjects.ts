import { useState, useEffect, useCallback } from 'react'
import api, { ApiException } from '@/lib/api'
import {
  hasDefaultProject,
  setDefaultProjectFlag,
} from '@/lib/auth'
import type {
  Project,
  ProjectsResponse,
  CreateProjectRequest,
} from '@/types/project'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
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
  }, [])

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
      // Check if we've already created a default project
      if (hasDefaultProject()) {
        // Still fetch projects to get the actual project
        await fetchProjects()
        return projects.length > 0 ? projects[0] : null
      }

      // Fetch existing projects
      const response = await api.get<ProjectsResponse>('/api/projects')

      if (response.success && response.data) {
        if (response.data.projects.length === 0) {
          // No projects exist, create default
          const defaultProject = await createDefaultProject()
          if (defaultProject) {
            setDefaultProjectFlag()
            return defaultProject
          }
        } else {
          // Projects exist, use first one
          setProjects(response.data.projects)
          setDefaultProjectFlag()
          return response.data.projects[0]
        }
      }
      return null
    } catch (err) {
      console.error('Failed to ensure default project:', err)
      return null
    }
  }, [fetchProjects, createDefaultProject, projects])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    createDefaultProject,
    ensureDefaultProject,
  }
}
