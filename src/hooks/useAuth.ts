import { useState, useEffect } from 'react'
import api, { ApiException } from '@/lib/api'
import type {
  ProjectsResponse,
  CreateProjectRequest,
  Project,
} from '@/types/project'

interface User {
  _id: string
  email: string
  name: string
  avatar?: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
  })

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('user')

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        setAuthState({
          isAuthenticated: true,
          user,
          token,
        })
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
      }
    }
  }, [])

  const ensureDefaultProject = async () => {
    try {
      // Check if we've already created a default project
      const hasDefaultProject = localStorage.getItem('has_default_project')

      if (hasDefaultProject === 'true') {
        return // Already have a default project
      }

      // Fetch existing projects
      const response = await api.get<ProjectsResponse>('/api/projects')

      if (response.success && response.data) {
        if (response.data.projects.length === 0) {
          // No projects exist, create default
          const projectData: CreateProjectRequest = {
            name: 'My Meetings',
            description: 'Default project for all meetings',
          }

          await api.post<{ success: boolean; data: Project }>(
            '/api/projects',
            projectData
          )

          localStorage.setItem('has_default_project', 'true')
        } else {
          // Projects exist, mark as having default project
          localStorage.setItem('has_default_project', 'true')
        }
      }
    } catch (err) {
      if (err instanceof ApiException) {
        console.error('Failed to ensure default project:', err.message)
      } else {
        console.error('Failed to ensure default project:', err)
      }
    }
  }

  const login = async (token: string, user: User) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setAuthState({
      isAuthenticated: true,
      user,
      token,
    })

    // Ensure default project exists after login
    await ensureDefaultProject()
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    localStorage.removeItem('has_default_project')
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
    })
  }

  return {
    ...authState,
    login,
    logout,
  }
}
