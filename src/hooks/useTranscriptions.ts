import { useState, useCallback, useRef } from 'react'
import { updateTranscription, deleteTranscription } from '@/lib/api'
import api, { ApiException } from '@/lib/api'
import type { Transcription, TranscriptionsResponse } from '@/types/meeting'
import {
  TRANSCRIPTION_PAGE_LIMIT,
  AUTO_LOAD_MORE_DELAY_MS,
} from '@/config/constants'

interface UseTranscriptionsOptions {
  meetingId: string | undefined
  onError?: (error: string) => void
}

export function useTranscriptions({ meetingId, onError }: UseTranscriptionsOptions) {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [hasMoreTranscriptions, setHasMoreTranscriptions] = useState(true)
  const [isLoadingTranscriptions, setIsLoadingTranscriptions] = useState(false)

  // Transcription edit/delete state
  const [editingTranscriptionId, setEditingTranscriptionId] = useState<string | null>(null)
  const [editedText, setEditedText] = useState<string>('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deletingTranscriptionId, setDeletingTranscriptionId] = useState<string | null>(null)
  const [showDeleteTranscriptionDialog, setShowDeleteTranscriptionDialog] = useState(false)

  // Refs for stable infinite scroll
  const isLoadingRef = useRef(false)
  const transcriptionPageRef = useRef(1)
  const hasMoreTranscriptionsRef = useRef(true)
  const initialLoadCompleteRef = useRef(false)

  // Fetch transcriptions when completed
  const fetchTranscriptions = useCallback(async (page = 1, append = false) => {
    if (!meetingId || isLoadingRef.current) {
      return
    }

    try {
      isLoadingRef.current = true
      setIsLoadingTranscriptions(true)

      const response = await api.get<TranscriptionsResponse>(
        `/api/meetings/${meetingId}/transcriptions?page=${page}&limit=${TRANSCRIPTION_PAGE_LIMIT}`
      )

      if (response.success && response.data) {
        const newTranscriptions = response.data.transcriptions
        const pagination = response.data.pagination

        if (append) {
          setTranscriptions(prev => [...prev, ...newTranscriptions])
        } else {
          setTranscriptions(newTranscriptions)
        }

        // Update both state and refs for stable callbacks
        const newPage = pagination.page
        const hasMore = pagination.page < pagination.pages

        setHasMoreTranscriptions(hasMore)
        transcriptionPageRef.current = newPage
        hasMoreTranscriptionsRef.current = hasMore

        // Mark initial load as complete after first successful fetch
        if (!initialLoadCompleteRef.current) {
          initialLoadCompleteRef.current = true
        }

        // After loading, check if page is scrollable, if not, load more automatically
        // Only auto-load after initial load is complete
        setTimeout(() => {
          if (!initialLoadCompleteRef.current || isLoadingRef.current) {
            return
          }

          // Find the scrollable container (main element)
          const scrollContainer = document.querySelector('main')
          if (!scrollContainer) {
            return
          }

          const scrollHeight = scrollContainer.scrollHeight
          const clientHeight = scrollContainer.clientHeight
          const isScrollable = scrollHeight > clientHeight

          if (!isScrollable && hasMore && !isLoadingRef.current) {
            fetchTranscriptions(newPage + 1, true)
          }
        }, AUTO_LOAD_MORE_DELAY_MS)
      }
    } catch (err) {
      console.error('Failed to fetch transcriptions:', err)
      if (onError && err instanceof ApiException) {
        onError(err.message || 'Failed to fetch transcriptions')
      }
    } finally {
      isLoadingRef.current = false
      setIsLoadingTranscriptions(false)
    }
  }, [meetingId, onError])

  // Load more transcriptions - uses refs for stable callback
  const loadMoreTranscriptions = useCallback(() => {
    if (isLoadingRef.current || !hasMoreTranscriptionsRef.current) {
      return
    }

    const nextPage = transcriptionPageRef.current + 1
    fetchTranscriptions(nextPage, true)
  }, [fetchTranscriptions])

  // Handle edit transcription
  const handleEditTranscription = useCallback((transcriptionId: string, currentText: string) => {
    setEditingTranscriptionId(transcriptionId)
    setEditedText(currentText)
  }, [])

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingTranscriptionId(null)
    setEditedText('')
  }, [])

  // Handle save edit
  const handleSaveEdit = useCallback(async (transcriptionId: string) => {
    if (!meetingId || !editedText.trim()) return

    try {
      setIsSavingEdit(true)

      // Optimistic update
      setTranscriptions(prev =>
        prev.map(t =>
          t._id === transcriptionId
            ? { ...t, text: editedText, isEdited: true }
            : t
        )
      )

      // API call
      await updateTranscription(meetingId, transcriptionId, { text: editedText })

      // Reset edit state
      setEditingTranscriptionId(null)
      setEditedText('')
    } catch (err) {
      // Revert optimistic update on error
      fetchTranscriptions(1, false)

      if (onError) {
        if (err instanceof ApiException) {
          onError(err.message || 'Failed to update transcription')
        } else {
          onError('Unable to connect to the server')
        }
      }
    } finally {
      setIsSavingEdit(false)
    }
  }, [meetingId, editedText, onError, fetchTranscriptions])

  // Handle delete transcription
  const handleDeleteTranscription = useCallback(async () => {
    if (!meetingId || !deletingTranscriptionId) return

    try {
      // Optimistic update
      setTranscriptions(prev =>
        prev.filter(t => t._id !== deletingTranscriptionId)
      )

      // API call
      await deleteTranscription(meetingId, deletingTranscriptionId)

      // Close dialog
      setShowDeleteTranscriptionDialog(false)
      setDeletingTranscriptionId(null)
    } catch (err) {
      // Revert optimistic update on error
      fetchTranscriptions(1, false)

      if (onError) {
        if (err instanceof ApiException) {
          onError(err.message || 'Failed to delete transcription')
        } else {
          onError('Unable to connect to the server')
        }
      }
      setShowDeleteTranscriptionDialog(false)
      setDeletingTranscriptionId(null)
    }
  }, [meetingId, deletingTranscriptionId, onError, fetchTranscriptions])

  // Handle show delete confirmation
  const handleShowDeleteTranscription = useCallback((transcriptionId: string) => {
    setDeletingTranscriptionId(transcriptionId)
    setShowDeleteTranscriptionDialog(true)
  }, [])

  // Reset transcriptions (useful when switching modes)
  const resetTranscriptions = useCallback(() => {
    setTranscriptions([])
    transcriptionPageRef.current = 1
    hasMoreTranscriptionsRef.current = true
    initialLoadCompleteRef.current = false
  }, [])

  return {
    // State
    transcriptions,
    isLoadingTranscriptions,
    hasMoreTranscriptions,
    initialLoadComplete: initialLoadCompleteRef.current,

    // Edit state
    editingTranscriptionId,
    editedText,
    isSavingEdit,
    setEditedText,

    // Delete state
    deletingTranscriptionId,
    showDeleteTranscriptionDialog,
    setShowDeleteTranscriptionDialog,

    // Actions
    fetchTranscriptions,
    loadMoreTranscriptions,
    handleEditTranscription,
    handleCancelEdit,
    handleSaveEdit,
    handleDeleteTranscription,
    handleShowDeleteTranscription,
    resetTranscriptions,
  }
}
