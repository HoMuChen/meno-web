export interface Project {
  _id: string
  name: string
  description?: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface ProjectsResponse {
  success: boolean
  data: {
    projects: Project[]
    pagination: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }
}
