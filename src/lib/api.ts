/**
 * API Client Configuration
 *
 * Provides a centralized fetch wrapper for HTTP communication with the backend.
 * Uses environment variables to configure the API base URL.
 */

import { getAuthToken } from '@/lib/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/'

export interface ApiError {
  message: string
  status: number
  data?: unknown
}

export class ApiException extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiException'
    this.status = status
    this.data = data
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  // Get auth token from centralized auth module
  const token = getAuthToken()

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiException(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      )
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiException) {
      throw error
    }

    // Network or other errors
    throw new ApiException(
      error instanceof Error ? error.message : 'An unknown error occurred',
      0
    )
  }
}

/**
 * HTTP methods
 */
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  /**
   * POST request with FormData (for file uploads)
   */
  postFormData: async <T>(
    endpoint: string,
    formData: FormData,
    options?: RequestInit
  ): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint}`
    const token = getAuthToken()

    const config: RequestInit = {
      ...options,
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiException(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        )
      }

      if (response.status === 204) {
        return {} as T
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiException) {
        throw error
      }

      throw new ApiException(
        error instanceof Error ? error.message : 'An unknown error occurred',
        0
      )
    }
  },
}

/**
 * Get current month usage statistics for authenticated user
 */
export async function getCurrentMonthUsage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return api.get(`/api/users/me/usage?year=${year}&month=${month}`)
}

export default api
