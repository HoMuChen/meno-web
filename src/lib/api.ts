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
 * Build headers for API requests
 */
function buildHeaders(customHeaders: HeadersInit = {}, includeContentType = true): HeadersInit {
  const token = getAuthToken()

  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  }
}

/**
 * Handle API response and errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
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
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const config: RequestInit = {
    ...options,
    headers: buildHeaders(options.headers),
  }

  try {
    const response = await fetch(url, config)
    return await handleResponse<T>(response)
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
   * Don't set Content-Type header - browser will set it with boundary
   */
  postFormData: async <T>(
    endpoint: string,
    formData: FormData,
    options?: RequestInit
  ): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint}`

    const config: RequestInit = {
      ...options,
      method: 'POST',
      headers: buildHeaders(options?.headers, false), // Don't include Content-Type for FormData
      body: formData,
    }

    try {
      const response = await fetch(url, config)
      return await handleResponse<T>(response)
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

/**
 * Update a transcription segment
 */
export async function updateTranscription(
  meetingId: string,
  transcriptionId: string,
  data: { text: string }
) {
  return api.patch(
    `/api/meetings/${meetingId}/transcriptions/${transcriptionId}`,
    data
  )
}

/**
 * Delete a transcription segment
 */
export async function deleteTranscription(
  meetingId: string,
  transcriptionId: string
) {
  return api.delete(
    `/api/meetings/${meetingId}/transcriptions/${transcriptionId}`
  )
}

export default api
