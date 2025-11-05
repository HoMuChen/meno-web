import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge, StatusProgressBar } from '@/components/StatusBadge'
import api, { ApiException, updateTranscription, deleteTranscription, searchTranscriptionsHybrid, assignSpeakerToPerson, reassignPersonTranscriptions, generateActionItems, fetchActionItems, updateActionItem, deleteActionItem } from '@/lib/api'
import { formatDuration, formatTimeFromMs } from '@/lib/formatters'
import type { Meeting, MeetingResponse, Transcription, TranscriptionsResponse, HybridSearchResponse, ActionItem, ActionItemsResponse } from '@/types/meeting'
import type { Project } from '@/types/project'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActionsDropdown } from '@/components/ActionsDropdown'
import { ActionItemCard } from '@/components/ActionItemCard'
import { usePeopleContext } from '@/contexts/PeopleContext'
import { usePolling } from '@/hooks/usePolling'
import {
  TRANSCRIPTION_PAGE_LIMIT,
  INFINITE_SCROLL_THRESHOLD_PX,
  AUTO_LOAD_MORE_DELAY_MS,
} from '@/config/constants'

type ContentTab = 'transcription' | 'summary' | 'events'

export function MeetingDetailsPage() {
  const { projectId, meetingId } = useParams<{ projectId: string; meetingId: string }>()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [hasMoreTranscriptions, setHasMoreTranscriptions] = useState(true)
  const [isLoadingTranscriptions, setIsLoadingTranscriptions] = useState(false)
  const [activeContentTab, setActiveContentTab] = useState<ContentTab>('transcription')

  // Refs for stable infinite scroll
  const isLoadingRef = useRef(false)
  const transcriptionPageRef = useRef(1)
  const hasMoreTranscriptionsRef = useRef(true)
  const initialLoadCompleteRef = useRef(false)
  const [streamingSummary, setStreamingSummary] = useState<string>('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Transcription edit/delete state
  const [editingTranscriptionId, setEditingTranscriptionId] = useState<string | null>(null)
  const [editedText, setEditedText] = useState<string>('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [deletingTranscriptionId, setDeletingTranscriptionId] = useState<string | null>(null)
  const [showDeleteTranscriptionDialog, setShowDeleteTranscriptionDialog] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchResults, setSearchResults] = useState<Transcription[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchMetadata, setSearchMetadata] = useState<{
    searchType: string
    components?: { semantic: number; keyword: number }
    total: number
  } | null>(null)

  // Speaker assignment state
  const { people, createPerson } = usePeopleContext()
  const [isAssigning, setIsAssigning] = useState(false)
  const [showAssignConfirmDialog, setShowAssignConfirmDialog] = useState(false)
  const [pendingAssignment, setPendingAssignment] = useState<{
    speaker: string
    currentPersonId: string | { _id: string; name: string; company?: string } | undefined
    newPersonId: string
  } | null>(null)

  // Add person dialog state
  const [showAddPersonDialog, setShowAddPersonDialog] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonCompany, setNewPersonCompany] = useState('')
  const [isCreatingPerson, setIsCreatingPerson] = useState(false)
  const [pendingSpeakerForNewPerson, setPendingSpeakerForNewPerson] = useState<{
    speaker: string
    currentPersonId: string | { _id: string; name: string; company?: string } | undefined
  } | null>(null)

  // Action items state
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [isLoadingActionItems, setIsLoadingActionItems] = useState(false)
  const [isGeneratingActionItems, setIsGeneratingActionItems] = useState(false)
  const [actionItemsError, setActionItemsError] = useState<string | null>(null)
  const actionItemsLoadedRef = useRef(false)
  const [deletingActionItemId, setDeletingActionItemId] = useState<string | null>(null)
  const [showDeleteActionItemDialog, setShowDeleteActionItemDialog] = useState(false)

  // Fetch meeting data
  const fetchMeetingData = async (showLoading = true) => {
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
  }

  // Fetch transcriptions when completed
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } finally {
      isLoadingRef.current = false
      setIsLoadingTranscriptions(false)
    }
  }, [meetingId])

  // Load more transcriptions - uses refs for stable callback
  const loadMoreTranscriptions = useCallback(() => {
    if (isLoadingRef.current || !hasMoreTranscriptionsRef.current) {
      return
    }

    const nextPage = transcriptionPageRef.current + 1
    fetchTranscriptions(nextPage, true)
  }, [fetchTranscriptions])

  // Generate summary with SSE streaming
  const generateSummary = async () => {
    if (!projectId || !meetingId) return

    setIsGeneratingSummary(true)
    setSummaryError(null)
    setStreamingSummary('')

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/api/projects/${projectId}/meetings/${meetingId}/summary/stream`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Response body is not readable')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const event = JSON.parse(data)

              if (event.type === 'chunk') {
                setStreamingSummary((prev) => prev + event.content)
              } else if (event.type === 'complete') {
                // Update meeting with the complete summary
                if (event.meeting) {
                  setMeeting(event.meeting)
                }
                setIsGeneratingSummary(false)
              } else if (event.type === 'error') {
                setSummaryError(event.message)
                setIsGeneratingSummary(false)
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError)
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate summary:', err)
      setSummaryError(err instanceof Error ? err.message : 'Failed to generate summary')
      setIsGeneratingSummary(false)
    }
  }

  // Handle delete meeting
  const handleDeleteMeeting = async () => {
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
  }

  // Handle edit transcription
  const handleEditTranscription = (transcriptionId: string, currentText: string) => {
    setEditingTranscriptionId(transcriptionId)
    setEditedText(currentText)
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingTranscriptionId(null)
    setEditedText('')
  }

  // Handle save edit
  const handleSaveEdit = async (transcriptionId: string) => {
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

      if (err instanceof ApiException) {
        setError(err.message || 'Failed to update transcription')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Handle delete transcription
  const handleDeleteTranscription = async () => {
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

      if (err instanceof ApiException) {
        setError(err.message || 'Failed to delete transcription')
      } else {
        setError('Unable to connect to the server')
      }
      setShowDeleteTranscriptionDialog(false)
      setDeletingTranscriptionId(null)
    }
  }

  // Handle show delete confirmation
  const handleShowDeleteTranscription = (transcriptionId: string) => {
    setDeletingTranscriptionId(transcriptionId)
    setShowDeleteTranscriptionDialog(true)
  }

  // Handle assign speaker to person - show confirmation dialog or add person dialog
  const handleAssignSpeaker = (
    speaker: string,
    currentPersonId: string | { _id: string; name: string; company?: string } | undefined,
    newPersonId: string
  ) => {
    // Check if user wants to add a new person
    if (newPersonId === 'add-new-person') {
      setPendingSpeakerForNewPerson({ speaker, currentPersonId })
      setShowAddPersonDialog(true)
      return
    }

    setPendingAssignment({ speaker, currentPersonId, newPersonId })
    setShowAssignConfirmDialog(true)
  }

  // Confirm and execute speaker assignment
  const confirmAssignment = async () => {
    if (!meetingId || !pendingAssignment) return

    setShowAssignConfirmDialog(false)
    setIsAssigning(true)
    try {
      let response

      // Check if already assigned to a person
      if (pendingAssignment.currentPersonId && typeof pendingAssignment.currentPersonId === 'object') {
        // Reassign from current person to new person
        response = await reassignPersonTranscriptions(meetingId, pendingAssignment.currentPersonId._id, pendingAssignment.newPersonId)
        console.log(`Reassigned transcriptions from '${pendingAssignment.currentPersonId.name}' to new person (${response.data.modifiedCount} transcriptions updated)`)
      } else {
        // Assign speaker to person for the first time
        response = await assignSpeakerToPerson(meetingId, pendingAssignment.speaker, pendingAssignment.newPersonId)
        console.log(`Assigned '${pendingAssignment.speaker}' to person (${response.data.modifiedCount} transcriptions updated)`)
      }

      if (response.success) {
        // Refresh transcriptions to show updated personId
        await fetchTranscriptions(1, false)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to assign speaker to person')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setIsAssigning(false)
      setPendingAssignment(null)
    }
  }

  // Handle create person and assign speaker
  const handleCreatePersonAndAssign = async () => {
    if (!meetingId || !pendingSpeakerForNewPerson || !newPersonName.trim()) return

    setIsCreatingPerson(true)
    try {
      // Create new person
      const newPerson = await createPerson({
        name: newPersonName.trim(),
        company: newPersonCompany.trim() || undefined,
      })

      if (!newPerson) {
        setError('Failed to create person')
        return
      }

      // Close add person dialog
      setShowAddPersonDialog(false)
      setNewPersonName('')
      setNewPersonCompany('')

      // Now assign the speaker to the newly created person
      setIsAssigning(true)
      let response

      // Check if already assigned to a person
      if (pendingSpeakerForNewPerson.currentPersonId && typeof pendingSpeakerForNewPerson.currentPersonId === 'object') {
        // Reassign from current person to new person
        response = await reassignPersonTranscriptions(
          meetingId,
          pendingSpeakerForNewPerson.currentPersonId._id,
          newPerson._id
        )
        console.log(`Reassigned transcriptions from '${pendingSpeakerForNewPerson.currentPersonId.name}' to '${newPerson.name}' (${response.data.modifiedCount} transcriptions updated)`)
      } else {
        // Assign speaker to person for the first time
        response = await assignSpeakerToPerson(
          meetingId,
          pendingSpeakerForNewPerson.speaker,
          newPerson._id
        )
        console.log(`Assigned '${pendingSpeakerForNewPerson.speaker}' to '${newPerson.name}' (${response.data.modifiedCount} transcriptions updated)`)
      }

      if (response.success) {
        // Refresh transcriptions to show updated personId
        await fetchTranscriptions(1, false)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to create person and assign speaker')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setIsCreatingPerson(false)
      setIsAssigning(false)
      setPendingSpeakerForNewPerson(null)
    }
  }

  // Handle search
  const handleSearch = async () => {
    if (!meetingId || !searchQuery.trim()) return

    try {
      setIsSearching(true)
      setSearchError(null)

      const response = await searchTranscriptionsHybrid(
        meetingId,
        searchQuery.trim()
      ) as HybridSearchResponse

      if (response.success && response.data) {
        setSearchResults(response.data.transcriptions)
        setIsSearchMode(true)
        setSearchMetadata({
          searchType: response.data.searchType,
          components: response.data.components,
          total: response.data.pagination.total,
        })
      }
    } catch (err) {
      console.error('Search failed:', err)
      if (err instanceof ApiException) {
        setSearchError(err.message || 'Search failed')
      } else {
        setSearchError('Unable to perform search')
      }
    } finally {
      setIsSearching(false)
    }
  }

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setIsSearchMode(false)
    setSearchError(null)
    setSearchMetadata(null)
  }

  // Handle search on Enter key
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Generate consistent color for speaker dot
  const getSpeakerDotColor = (speaker: string) => {
    // Hash function to generate consistent color from string
    let hash = 0
    for (let i = 0; i < speaker.length; i++) {
      hash = speaker.charCodeAt(i) + ((hash << 5) - hash)
    }

    // Generate colors for speaker dots
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-cyan-500',
      'bg-amber-500',
      'bg-indigo-500',
    ]

    return colors[Math.abs(hash) % colors.length]
  }

  // Handle generate action items
  const handleGenerateActionItems = async () => {
    if (!projectId || !meetingId) return

    try {
      setIsGeneratingActionItems(true)
      setActionItemsError(null)

      await generateActionItems(projectId, meetingId)

      // Start polling for updates
      fetchMeetingData(false)
    } catch (err) {
      console.error('Failed to generate action items:', err)
      if (err instanceof ApiException) {
        setActionItemsError(err.message || 'Failed to generate action items')
      } else {
        setActionItemsError('Unable to generate action items')
      }
      setIsGeneratingActionItems(false)
    }
  }

  // Fetch action items
  const fetchActionItemsData = useCallback(async () => {
    if (!projectId || !meetingId || actionItemsLoadedRef.current) return

    try {
      setIsLoadingActionItems(true)
      setActionItemsError(null)

      const response = await fetchActionItems(projectId, meetingId) as ActionItemsResponse

      if (response.actionItems) {
        // Sort action items: pending first, completed last
        const sortedItems = response.actionItems.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1
          if (a.status !== 'completed' && b.status === 'completed') return -1
          return 0
        })
        setActionItems(sortedItems)
        actionItemsLoadedRef.current = true
      }
    } catch (err) {
      console.error('Failed to fetch action items:', err)
      if (err instanceof ApiException) {
        setActionItemsError(err.message || 'Failed to load action items')
      } else {
        setActionItemsError('Unable to load action items')
      }
    } finally {
      setIsLoadingActionItems(false)
    }
  }, [projectId, meetingId])

  // Handle update action item status
  const handleUpdateActionItemStatus = async (
    actionItemId: string,
    statusProjectId: string,
    statusMeetingId: string,
    newStatus: 'pending' | 'completed'
  ) => {
    try {
      // Optimistic update - move to bottom if completed, to top if pending
      setActionItems(prev => {
        const updated = prev.map(item =>
          item._id === actionItemId
            ? { ...item, status: newStatus }
            : item
        )
        // Sort: pending items first, completed items last
        return updated.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1
          if (a.status !== 'completed' && b.status === 'completed') return -1
          return 0
        })
      })

      await updateActionItem(statusProjectId, statusMeetingId, actionItemId, { status: newStatus })
    } catch (err) {
      // Revert optimistic update on error
      if (projectId && meetingId) {
        const response = await fetchActionItems(projectId, meetingId) as ActionItemsResponse
        if (response.actionItems) {
          const sortedItems = response.actionItems.sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1
            if (a.status !== 'completed' && b.status === 'completed') return -1
            return 0
          })
          setActionItems(sortedItems)
        }
      }

      if (err instanceof ApiException) {
        setActionItemsError(err.message || 'Failed to update action item')
      } else {
        setActionItemsError('Unable to update action item')
      }
    }
  }

  // Handle delete action item
  const handleDeleteActionItem = async () => {
    if (!projectId || !meetingId || !deletingActionItemId) return

    try {
      // Optimistic update
      setActionItems(prev =>
        prev.filter(item => item._id !== deletingActionItemId)
      )

      await deleteActionItem(projectId, meetingId, deletingActionItemId)

      setShowDeleteActionItemDialog(false)
      setDeletingActionItemId(null)
    } catch (err) {
      // Revert optimistic update on error
      const response = await fetchActionItems(projectId, meetingId) as ActionItemsResponse
      if (response.actionItems) {
        const sortedItems = response.actionItems.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1
          if (a.status !== 'completed' && b.status === 'completed') return -1
          return 0
        })
        setActionItems(sortedItems)
      }

      if (err instanceof ApiException) {
        setActionItemsError(err.message || 'Failed to delete action item')
      } else {
        setActionItemsError('Unable to delete action item')
      }
      setShowDeleteActionItemDialog(false)
      setDeletingActionItemId(null)
    }
  }

  // Handle show delete action item confirmation
  const handleShowDeleteActionItem = (actionItemId: string) => {
    setDeletingActionItemId(actionItemId)
    setShowDeleteActionItemDialog(true)
  }

  // Handle save action item edits
  const handleSaveActionItemEdit = async (
    actionItemId: string,
    editProjectId: string,
    editMeetingId: string,
    updates: { task: string; context: string; dueDate?: string }
  ) => {
    try {
      // Optimistic update
      setActionItems(prev =>
        prev.map(item =>
          item._id === actionItemId
            ? { ...item, ...updates }
            : item
        )
      )

      await updateActionItem(editProjectId, editMeetingId, actionItemId, updates)
    } catch (err) {
      // Revert optimistic update on error
      if (projectId && meetingId) {
        const response = await fetchActionItems(projectId, meetingId) as ActionItemsResponse
        if (response.actionItems) {
          const sortedItems = response.actionItems.sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1
            if (a.status !== 'completed' && b.status === 'completed') return -1
            return 0
          })
          setActionItems(sortedItems)
        }
      }

      if (err instanceof ApiException) {
        setActionItemsError(err.message || 'Failed to update action item')
      } else {
        setActionItemsError('Unable to update action item')
      }
    }
  }

  // Download summary as text
  const downloadSummaryAsTxt = () => {
    if (!meeting?.summary && !streamingSummary) return

    const content = meeting?.summary || streamingSummary
    const fileName = `${meeting?.title || 'meeting'}-summary.txt`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Download summary as markdown
  const downloadSummaryAsMarkdown = () => {
    if (!meeting?.summary && !streamingSummary) return

    const content = meeting?.summary || streamingSummary
    const fileName = `${meeting?.title || 'meeting'}-summary.md`
    const markdownContent = `# ${meeting?.title || 'Meeting'} - Summary\n\n${content}`
    const blob = new Blob([markdownContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Download action items as text
  const downloadActionItemsAsTxt = () => {
    if (actionItems.length === 0) return

    let content = `${meeting?.title || 'Meeting'} - Action Items\n\n`
    actionItems.forEach((item, index) => {
      const displayName = item.personId
        ? typeof item.personId === 'object'
          ? item.personId.company
            ? `${item.personId.name} - ${item.personId.company}`
            : item.personId.name
          : item.assignee
        : item.assignee

      content += `${index + 1}. ${item.task}\n`
      content += `   Assignee: ${displayName}\n`
      content += `   Status: ${item.status === 'in_progress' ? 'In Progress' : item.status === 'pending' ? 'Pending' : 'Completed'}\n`
      if (item.context) {
        content += `   Context: ${item.context}\n`
      }
      if (item.dueDate) {
        content += `   Due Date: ${new Date(item.dueDate).toLocaleString()}\n`
      }
      content += '\n'
    })

    const fileName = `${meeting?.title || 'meeting'}-action-items.txt`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Download action items as markdown
  const downloadActionItemsAsMarkdown = () => {
    if (actionItems.length === 0) return

    let content = `# ${meeting?.title || 'Meeting'} - Action Items\n\n`
    actionItems.forEach((item, index) => {
      const displayName = item.personId
        ? typeof item.personId === 'object'
          ? item.personId.company
            ? `${item.personId.name} - ${item.personId.company}`
            : item.personId.name
          : item.assignee
        : item.assignee

      const statusIcon = item.status === 'completed' ? '✅' : item.status === 'in_progress' ? '🔄' : '⏳'
      content += `${index + 1}. **${item.task}** ${statusIcon}\n`
      content += `   - **Assignee:** ${displayName}\n`
      content += `   - **Status:** ${item.status === 'in_progress' ? 'In Progress' : item.status === 'pending' ? 'Pending' : 'Completed'}\n`
      if (item.context) {
        content += `   - **Context:** ${item.context}\n`
      }
      if (item.dueDate) {
        content += `   - **Due Date:** ${new Date(item.dueDate).toLocaleString()}\n`
      }
      content += '\n'
    })

    const fileName = `${meeting?.title || 'meeting'}-action-items.md`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Initial data fetch
  useEffect(() => {
    fetchMeetingData(true)
  }, [projectId, meetingId])

  // Determine if we should poll for meeting updates
  const isProcessing = meeting?.transcriptionStatus === 'pending' ||
                       meeting?.transcriptionStatus === 'processing' ||
                       meeting?.actionItemsStatus === 'processing'

  // Poll for meeting updates when processing
  usePolling({
    enabled: isProcessing,
    onPoll: () => fetchMeetingData(false),
  })

  // Fetch action items when completed - only once
  useEffect(() => {
    if (meeting?.actionItemsStatus === 'completed' && !actionItemsLoadedRef.current) {
      fetchActionItemsData()
    }
  }, [meeting?.actionItemsStatus, fetchActionItemsData])

  // Stop generating state when action items status changes
  useEffect(() => {
    if (meeting?.actionItemsStatus === 'completed' || meeting?.actionItemsStatus === 'failed') {
      setIsGeneratingActionItems(false)
    }
  }, [meeting?.actionItemsStatus])

  // Fetch transcriptions when completed - only once
  useEffect(() => {
    if (meeting?.transcriptionStatus === 'completed' && !initialLoadCompleteRef.current && transcriptions.length === 0) {
      fetchTranscriptions(1, false)
    }
  }, [meeting?.transcriptionStatus, transcriptions.length, fetchTranscriptions])

  // Infinite scroll effect
  useEffect(() => {
    if (activeContentTab !== 'transcription') {
      return
    }

    // Don't attach scroll listener until initial load completes
    if (!initialLoadCompleteRef.current) {
      return
    }

    // Find the scrollable container (main element)
    const scrollContainer = document.querySelector('main')
    if (!scrollContainer) {
      return
    }

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop
      const scrollHeight = scrollContainer.scrollHeight
      const clientHeight = scrollContainer.clientHeight
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      // Load more when user scrolls to bottom (within threshold)
      if (distanceFromBottom < INFINITE_SCROLL_THRESHOLD_PX) {
        loadMoreTranscriptions()
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [activeContentTab, loadMoreTranscriptions, initialLoadCompleteRef.current])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-4 text-destructive"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <h3 className="mb-2 text-lg font-semibold text-destructive">{error}</h3>
            <Button variant="outline" onClick={() => navigate('/')}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:px-4 lg:px-6">
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => navigate('/')}
                className="cursor-pointer"
              >
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => navigate('/projects')}
                className="cursor-pointer"
              >
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => navigate(`/projects/${projectId}`)}
                className="cursor-pointer"
              >
                {project?.name || 'Project'}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{meeting?.title || 'Meeting'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Meeting Info */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg text-primary">{meeting?.title || 'Untitled Meeting'}</CardTitle>
              <CardDescription className="text-xs">
                Created on {meeting?.createdAt ? new Date(meeting.createdAt).toLocaleString() : 'Unknown date'}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
              aria-label="Delete meeting"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Transcription Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <StatusBadge
                status={meeting?.transcriptionStatus || 'pending'}
                showSpinner
              />
              {(meeting?.transcriptionStatus === 'pending' || meeting?.transcriptionStatus === 'processing') && (
                <span className="text-xs text-muted-foreground">Processing...</span>
              )}
            </div>

            {/* Progress Bar for Processing */}
            {(meeting?.transcriptionStatus === 'pending' || meeting?.transcriptionStatus === 'processing') && meeting?.transcriptionProgress !== undefined && (
              <StatusProgressBar progress={meeting.transcriptionProgress} />
            )}

            {/* Duration */}
            {meeting?.duration && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Duration:</span>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(meeting.duration)}
                </span>
              </div>
            )}

            {/* Content Types */}
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium pt-1">Content:</span>
              <div className="flex flex-wrap gap-2">
                <span
                  onClick={() => setActiveContentTab('transcription')}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    activeContentTab === 'transcription'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  Transcription
                </span>
                <span
                  onClick={() => setActiveContentTab('summary')}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    activeContentTab === 'summary'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  Summary
                </span>
                <span
                  onClick={() => setActiveContentTab('events')}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    activeContentTab === 'events'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  Action Items
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcription Content */}
      {activeContentTab === 'transcription' && (
        <>
          {/* Display search results or normal transcriptions */}
          {(isSearchMode ? searchResults : transcriptions).length > 0 || meeting?.transcriptionStatus === 'completed' ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-primary">
                  {isSearchMode ? 'Search Results' : 'Transcription'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isSearchMode
                    ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} found`
                    : `${transcriptions.length} segment${transcriptions.length !== 1 ? 's' : ''} loaded`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search Input */}
                {meeting?.transcriptionStatus === 'completed' && (
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.3-4.3" />
                        </svg>
                        <Input
                          type="text"
                          placeholder="Search transcriptions..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={handleSearchKeyPress}
                          className="pl-10"
                          disabled={isSearching}
                        />
                      </div>
                      <Button
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        size="sm"
                      >
                        {isSearching ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                            Searching...
                          </>
                        ) : (
                          'Search'
                        )}
                      </Button>
                      {isSearchMode && (
                        <Button
                          variant="outline"
                          onClick={handleClearSearch}
                          size="sm"
                        >
                          Clear
                        </Button>
                      )}
                    </div>

                    {/* Search Error */}
                    {searchError && (
                      <div className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {searchError}
                      </div>
                    )}

                    {/* Search Metadata */}
                    {isSearchMode && searchMetadata && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Found {searchMetadata.total} result{searchMetadata.total !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}

                {(isSearchMode ? searchResults : transcriptions).length > 0 ? (
                  <div className="space-y-3">
                  {(isSearchMode ? searchResults : transcriptions).map((segment) => {
                    const isEditing = editingTranscriptionId === segment._id
                    const speakerName = typeof segment.personId === 'object' && segment.personId !== null
                      ? segment.personId.name
                      : segment.speaker
                    const speakerDotColor = speakerName ? getSpeakerDotColor(speakerName) : ''
                    return (
                      <div
                        key={segment._id}
                        className="rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {segment.speaker && (
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${speakerDotColor}`} />
                                <Select
                                  value={typeof segment.personId === 'object' && segment.personId !== null ? segment.personId._id : ''}
                                  onValueChange={(newPersonId) => handleAssignSpeaker(segment.speaker, segment.personId, newPersonId)}
                                  disabled={isAssigning}
                                >
                                  <SelectTrigger className="h-7 w-auto min-w-[120px] text-sm font-medium gap-3 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50">
                                    <SelectValue placeholder={segment.speaker}>
                                      {typeof segment.personId === 'object' && segment.personId !== null
                                        ? `${segment.personId.name}${segment.personId.company ? ` - ${segment.personId.company}` : ''}`
                                        : segment.speaker}
                                    </SelectValue>
                                  </SelectTrigger>
                                <SelectContent>
                                  {people.map((person) => (
                                    <SelectItem key={person._id} value={person._id} className="pl-6">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-block min-w-[100px]">{person.name}</span>
                                        {person.company && (
                                          <>
                                            <span className="text-muted-foreground">-</span>
                                            <span className="text-muted-foreground">{person.company}</span>
                                          </>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                  <SelectSeparator />
                                  <SelectItem value="add-new-person" className="pl-6 text-primary font-medium">
                                    + Add Person
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              </div>
                            )}
                            {segment.startTime !== undefined && segment.endTime !== undefined && (
                              <span className="text-muted-foreground">
                                {formatTimeFromMs(segment.startTime)} - {formatTimeFromMs(segment.endTime)}
                              </span>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEditTranscription(segment._id, segment.text)}
                                aria-label="Edit transcription"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleShowDeleteTranscription(segment._id)}
                                aria-label="Delete transcription"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                              </Button>
                            </div>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editedText}
                              onChange={(e) => setEditedText(e.target.value)}
                              className="min-h-[100px] text-sm"
                              placeholder="Edit transcription text..."
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(segment._id)}
                                disabled={isSavingEdit || !editedText.trim()}
                              >
                                {isSavingEdit ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={isSavingEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed">{segment.text}</p>
                        )}
                      </div>
                    )
                  })}

                  {/* Loading Indicator */}
                  {!isSearchMode && isLoadingTranscriptions && (
                    <div className="mt-4 flex items-center justify-center py-4">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  )}

                  {/* End of results message */}
                  {!isSearchMode && !hasMoreTranscriptions && transcriptions.length > 0 && (
                    <div className="mt-4 flex justify-center py-4">
                      <p className="text-sm text-muted-foreground">
                        No more transcriptions to load
                      </p>
                    </div>
                  )}
                  </div>
                ) : null}

                {/* No results found for search */}
                {isSearchMode && searchResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mb-3 text-muted-foreground"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    <h3 className="mb-1 text-base font-semibold">No Results Found</h3>
                    <p className="text-xs text-muted-foreground">
                      Try adjusting your search query or clear the search to see all transcriptions.
                    </p>
                  </div>
                )}

                {/* No transcriptions available */}
                {!isSearchMode && transcriptions.length === 0 && meeting?.transcriptionStatus === 'completed' && !isLoadingTranscriptions && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mb-3 text-muted-foreground"
                      aria-hidden="true"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <h3 className="mb-1 text-base font-semibold">No Transcription Available</h3>
                    <p className="text-xs text-muted-foreground">
                      The transcription is completed but no content was found.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {/* Summary Content */}
      {activeContentTab === 'summary' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg text-primary">Summary</CardTitle>
                <CardDescription className="text-xs">
                  AI-generated meeting summary
                </CardDescription>
              </div>
              {(meeting?.summary || streamingSummary) && (
                <ActionsDropdown
                  actions={[
                    {
                      label: 'Download as TXT',
                      icon: (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                      ),
                      onClick: downloadSummaryAsTxt,
                    },
                    {
                      label: 'Download as Markdown',
                      icon: (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                      ),
                      onClick: downloadSummaryAsMarkdown,
                    },
                  ]}
                  aria-label="Download options"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {meeting?.summary || streamingSummary ? (
              <>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      code: (props) => {
                        const { inline, className, children, ...rest } = props as any
                        return inline ? (
                          <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm" {...rest}>
                            {children}
                          </code>
                        ) : (
                          <code className="block bg-muted text-foreground p-3 rounded text-sm overflow-x-auto" {...rest}>
                            {children}
                          </code>
                        )
                      },
                      pre: ({ children, ...props }) => (
                        <pre className="bg-muted text-foreground border border-border rounded p-3 overflow-x-auto my-4" {...props}>
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {meeting?.summary || streamingSummary}
                  </ReactMarkdown>
                </div>
                {isGeneratingSummary && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Generating summary...</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                {summaryError ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mb-3 text-destructive"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" x2="12" y1="8" y2="12" />
                      <line x1="12" x2="12.01" y1="16" y2="16" />
                    </svg>
                    <h3 className="mb-2 text-base font-semibold text-destructive">Failed to Generate Summary</h3>
                    <p className="mb-4 text-xs text-muted-foreground">{summaryError}</p>
                    <Button onClick={generateSummary} disabled={isGeneratingSummary}>
                      Try Again
                    </Button>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mb-3 text-muted-foreground"
                      aria-hidden="true"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      <line x1="9" x2="15" y1="10" y2="10" />
                      <line x1="12" x2="12" y1="7" y2="13" />
                    </svg>
                    <h3 className="mb-2 text-base font-semibold">No Summary Available</h3>
                    <p className="mb-4 text-xs text-muted-foreground">
                      Generate an AI summary of this meeting's transcription.
                    </p>
                    <Button onClick={generateSummary} disabled={isGeneratingSummary}>
                      {isGeneratingSummary ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          Generating...
                        </>
                      ) : (
                        'Generate Summary'
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Events Content (Action Items) */}
      {activeContentTab === 'events' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg text-primary">Action Items</CardTitle>
                <CardDescription className="text-xs">
                  Tasks and follow-ups from this meeting
                </CardDescription>
              </div>
              {meeting?.actionItemsStatus === 'completed' && actionItems.length > 0 && (
                <ActionsDropdown
                  actions={[
                    {
                      label: 'Download as TXT',
                      icon: (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                      ),
                      onClick: downloadActionItemsAsTxt,
                    },
                    {
                      label: 'Download as Markdown',
                      icon: (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                      ),
                      onClick: downloadActionItemsAsMarkdown,
                    },
                  ]}
                  aria-label="Download options"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Not Started State */}
            {meeting?.actionItemsStatus === 'not_started' && (
              <div className="flex flex-col items-center justify-center py-12">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mb-4 text-muted-foreground/60"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" x2="15" y1="15" y2="15" />
                </svg>
                <h3 className="mb-2 text-lg font-semibold">No Action Items Yet</h3>
                <p className="mb-4 text-sm text-muted-foreground text-center max-w-md">
                  Generate AI-powered action items from this meeting's transcription.
                </p>
                <Button onClick={handleGenerateActionItems} disabled={isGeneratingActionItems}>
                  {isGeneratingActionItems ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    'Generate Action Items'
                  )}
                </Button>
              </div>
            )}

            {/* Processing State */}
            {meeting?.actionItemsStatus === 'processing' && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <h3 className="mb-2 text-lg font-semibold">Generating Action Items</h3>
                <p className="mb-4 text-sm text-muted-foreground text-center max-w-md">
                  Please wait while we analyze the meeting and extract action items...
                </p>
                {meeting?.actionItemsProgress !== undefined && (
                  <div className="w-full max-w-md">
                    <StatusProgressBar progress={meeting.actionItemsProgress} />
                  </div>
                )}
              </div>
            )}

            {/* Completed State */}
            {meeting?.actionItemsStatus === 'completed' && (
              <>
                {isLoadingActionItems ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading action items...</p>
                  </div>
                ) : actionItems.length > 0 ? (
                  <div className="space-y-3">
                    {actionItems.map((item) => (
                      <ActionItemCard
                        key={item._id}
                        item={item}
                        onStatusChange={handleUpdateActionItemStatus}
                        onEdit={handleSaveActionItemEdit}
                        onDelete={handleShowDeleteActionItem}
                        showDelete={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mb-3 text-muted-foreground"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <h3 className="mb-1 text-base font-semibold">No Action Items Found</h3>
                    <p className="text-xs text-muted-foreground">
                      No action items were identified in this meeting.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Failed State */}
            {meeting?.actionItemsStatus === 'failed' && (
              <div className="flex flex-col items-center justify-center py-12">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mb-3 text-destructive"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <h3 className="mb-2 text-base font-semibold text-destructive">Failed to Generate Action Items</h3>
                <p className="mb-4 text-xs text-muted-foreground text-center max-w-md">
                  {actionItemsError || meeting?.metadata?.actionItems?.errorMessage || 'An error occurred while generating action items'}
                </p>
                <Button onClick={handleGenerateActionItems} disabled={isGeneratingActionItems}>
                  Try Again
                </Button>
              </div>
            )}

            {/* Error State */}
            {actionItemsError && meeting?.actionItemsStatus !== 'failed' && (
              <div className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {actionItemsError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Meeting Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Meeting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{meeting?.title}"? This action cannot be undone and will permanently remove the meeting, audio file, and all transcriptions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMeeting}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Transcription Confirmation Dialog */}
      <Dialog open={showDeleteTranscriptionDialog} onOpenChange={(open) => !open && setShowDeleteTranscriptionDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transcription</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transcription segment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteTranscriptionDialog(false)
                setDeletingTranscriptionId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTranscription}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Speaker Confirmation Dialog */}
      <Dialog open={showAssignConfirmDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAssignConfirmDialog(false)
          setPendingAssignment(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Speaker to Person</DialogTitle>
            <DialogDescription>
              All transcriptions with this speaker will be updated. This will affect multiple segments in this meeting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignConfirmDialog(false)
                setPendingAssignment(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAssignment}
              disabled={isAssigning}
            >
              {isAssigning ? 'Assigning...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Person Dialog */}
      <Dialog open={showAddPersonDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddPersonDialog(false)
          setNewPersonName('')
          setNewPersonCompany('')
          setPendingSpeakerForNewPerson(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Person</DialogTitle>
            <DialogDescription>
              Create a new person and assign the speaker to them. All transcriptions with this speaker will be updated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="person-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="person-name"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Enter person name"
                disabled={isCreatingPerson}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="person-company" className="text-sm font-medium">
                Company
              </label>
              <Input
                id="person-company"
                value={newPersonCompany}
                onChange={(e) => setNewPersonCompany(e.target.value)}
                placeholder="Enter company name (optional)"
                disabled={isCreatingPerson}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddPersonDialog(false)
                setNewPersonName('')
                setNewPersonCompany('')
                setPendingSpeakerForNewPerson(null)
              }}
              disabled={isCreatingPerson}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePersonAndAssign}
              disabled={isCreatingPerson || !newPersonName.trim()}
            >
              {isCreatingPerson ? 'Creating...' : 'Create & Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Action Item Confirmation Dialog */}
      <Dialog open={showDeleteActionItemDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteActionItemDialog(false)
          setDeletingActionItemId(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Action Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this action item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteActionItemDialog(false)
                setDeletingActionItemId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteActionItem}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
