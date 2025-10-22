import { useState, useEffect, useCallback } from 'react'
import api, { ApiException } from '@/lib/api'
import type { Meeting } from '@/types/meeting'

interface MeetingsResponse {
  success: boolean
  data: {
    meetings: Meeting[]
  }
}

interface UseMeetingsOptions {
  userId: string | null
  limit?: number
}

export function useMeetings({ userId, limit = 5 }: UseMeetingsOptions) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMeetings = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get<MeetingsResponse>(
        `/api/users/${userId}/meetings?limit=${limit}`
      )

      if (response.success && response.data) {
        setMeetings(response.data.meetings)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to load meetings')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId, limit])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  return {
    meetings,
    isLoading,
    error,
    refetchMeetings: fetchMeetings,
  }
}
