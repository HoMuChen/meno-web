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
 * Response from speaker/person assignment operations
 */
export interface AssignmentResponse {
  success: boolean
  data: {
    modifiedCount: number
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

/**
 * Batch assign speaker to person
 * Assigns all transcriptions with a specific speaker name to a person
 */
export async function assignSpeakerToPerson(
  meetingId: string,
  speaker: string,
  personId: string
): Promise<AssignmentResponse> {
  return api.put<AssignmentResponse>(
    `/api/meetings/${meetingId}/transcriptions/speaker/${encodeURIComponent(speaker)}/assign`,
    { personId }
  )
}

/**
 * Reassign person's transcriptions to another person
 * Reassigns all transcriptions currently assigned to a person to a different person
 */
export async function reassignPersonTranscriptions(
  meetingId: string,
  currentPersonId: string,
  newPersonId: string
): Promise<AssignmentResponse> {
  return api.put<AssignmentResponse>(
    `/api/meetings/${meetingId}/transcriptions/people/${currentPersonId}/assign`,
    { newPersonId }
  )
}

/**
 * Search transcriptions using hybrid search (semantic + keyword)
 */
export async function searchTranscriptionsHybrid(
  meetingId: string,
  query: string,
  page = 1,
  limit = 20
) {
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    limit: limit.toString(),
  })

  return api.get(
    `/api/meetings/${meetingId}/transcriptions/hybrid-search?${params.toString()}`
  )
}

/**
 * Search transcriptions across all meetings in a project (cross-meeting search)
 */
export async function searchProjectTranscriptions(
  projectId: string,
  query: string,
  options?: {
    page?: number
    limit?: number
    scoreThreshold?: number
    from?: string
    to?: string
    speaker?: string
    groupByMeeting?: boolean
  }
) {
  const params = new URLSearchParams({
    q: query,
    page: (options?.page || 1).toString(),
    limit: (options?.limit || 20).toString(),
    groupByMeeting: (options?.groupByMeeting !== false).toString(), // Default to true
  })

  if (options?.scoreThreshold !== undefined) {
    params.append('scoreThreshold', options.scoreThreshold.toString())
  }
  if (options?.from) {
    params.append('from', options.from)
  }
  if (options?.to) {
    params.append('to', options.to)
  }
  if (options?.speaker) {
    params.append('speaker', options.speaker)
  }

  return api.get(
    `/api/projects/${projectId}/transcriptions/search-all?${params.toString()}`
  )
}

/**
 * Update a meeting (title or move to different project)
 */
export async function updateMeeting(
  projectId: string,
  meetingId: string,
  data: {
    title?: string
    projectId?: string
  }
) {
  return api.put(
    `/api/projects/${projectId}/meetings/${meetingId}`,
    data
  )
}

/**
 * Generate action items for a meeting
 */
export async function generateActionItems(projectId: string, meetingId: string) {
  return api.post(
    `/api/projects/${projectId}/meetings/${meetingId}/action-items/generate`
  )
}

/**
 * Fetch action items for a meeting
 */
export async function fetchActionItems(
  projectId: string,
  meetingId: string,
  page = 1,
  limit = 50
) {
  return api.get(
    `/api/projects/${projectId}/meetings/${meetingId}/action-items?page=${page}&limit=${limit}`
  )
}

/**
 * Update an action item
 */
export async function updateActionItem(
  projectId: string,
  meetingId: string,
  actionItemId: string,
  data: {
    task?: string
    assignee?: string
    personId?: string
    dueDate?: string
    context?: string
    status?: 'pending' | 'in_progress' | 'completed'
  }
) {
  return api.patch(
    `/api/projects/${projectId}/meetings/${meetingId}/action-items/${actionItemId}`,
    data
  )
}

/**
 * Delete an action item
 */
export async function deleteActionItem(
  projectId: string,
  meetingId: string,
  actionItemId: string
) {
  return api.delete(
    `/api/projects/${projectId}/meetings/${meetingId}/action-items/${actionItemId}`
  )
}

export default api
