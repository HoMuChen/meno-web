import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { ApiException } from '@/lib/api'
import type { Meeting, MeetingResponse } from '@/types/meeting'
import type { Project } from '@/types/project'

interface UseMeetingDataOptions {
  projectId: string | undefined
  meetingId: string | undefined
}

export function useMeetingData({ projectId, meetingId }: UseMeetingDataOptions) {
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch meeting data
  const fetchMeetingData = useCallback(async (showLoading = true) => {
    if (!projectId || !meetingId) return

    try {
      if (showLoading) {
        setIsLoading(true)
      }
      setError(null)

      // Fetch project details (only on first load)
      if (!project) {
        const projectResponse = await api.get<{ success: boolean; data: Project }>(
          `/api/projects/${projectId}`
        )

        if (projectResponse.success && projectResponse.data) {
          setProject(projectResponse.data)
        }
      }

      // Fetch meeting details
      const meetingResponse = await api.get<MeetingResponse>(
        `/api/projects/${projectId}/meetings/${meetingId}`
      )

      if (meetingResponse.success && meetingResponse.data) {
        setMeeting(meetingResponse.data)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 404) {
          setError('Meeting not found')
        } else {
          setError(err.message || 'Failed to load meeting')
        }
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [projectId, meetingId])

  // Handle delete meeting
  const handleDeleteMeeting = useCallback(async () => {
    if (!projectId || !meetingId) return

    try {
      setIsDeleting(true)
      await api.delete(`/api/projects/${projectId}/meetings/${meetingId}`)

      // Navigate back to project detail page after successful deletion
      navigate(`/projects/${projectId}`)
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to delete meeting')
      } else {
        setError('Unable to connect to the server')
      }
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }, [projectId, meetingId, navigate])

  return {
    // State
    meeting,
    project,
    isLoading,
    error,
    showDeleteDialog,
    isDeleting,

    // Actions
    fetchMeetingData,
    handleDeleteMeeting,
    setMeeting,
    setError,
    setShowDeleteDialog,
  }
}
