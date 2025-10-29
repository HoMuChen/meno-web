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
import api, { ApiException, updateTranscription, deleteTranscription } from '@/lib/api'
import { formatDuration, formatTimeFromMs } from '@/lib/formatters'
import type { Meeting, MeetingResponse, Transcription, TranscriptionsResponse } from '@/types/meeting'
import type { Project } from '@/types/project'
import { Textarea } from '@/components/ui/textarea'
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

  // Initial data fetch
  useEffect(() => {
    fetchMeetingData(true)
  }, [projectId, meetingId])

  // Determine if we should poll for meeting updates
  const isProcessing = meeting?.transcriptionStatus === 'pending' ||
                       meeting?.transcriptionStatus === 'processing'

  // Poll for meeting updates when processing
  usePolling({
    enabled: isProcessing,
    onPoll: () => fetchMeetingData(false),
  })

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
          {transcriptions.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-primary">Transcription</CardTitle>
                <CardDescription className="text-xs">
                  {transcriptions.length} segment{transcriptions.length !== 1 ? 's' : ''} loaded
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transcriptions.map((segment) => {
                    const isEditing = editingTranscriptionId === segment._id
                    return (
                      <div
                        key={segment._id}
                        className="rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {segment.speaker && (
                              <span className="font-medium text-foreground">{segment.speaker}</span>
                            )}
                            {segment.startTime !== undefined && segment.endTime !== undefined && (
                              <span className="text-muted-foreground">
                                {formatTimeFromMs(segment.startTime)} - {formatTimeFromMs(segment.endTime)}
                              </span>
                            )}
                            {segment.isEdited && (
                              <span className="text-xs text-muted-foreground italic">
                                (edited)
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
                </div>

                {/* Loading Indicator */}
                {isLoadingTranscriptions && (
                  <div className="mt-4 flex items-center justify-center py-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                )}

                {/* End of results message */}
                {!hasMoreTranscriptions && transcriptions.length > 0 && (
                  <div className="mt-4 flex justify-center py-4">
                    <p className="text-sm text-muted-foreground">
                      No more transcriptions to load
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : meeting?.transcriptionStatus === 'completed' && !isLoadingTranscriptions ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
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
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {/* Summary Content */}
      {activeContentTab === 'summary' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-primary">Summary</CardTitle>
            <CardDescription className="text-xs">
              AI-generated meeting summary
            </CardDescription>
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
            <CardTitle className="text-lg text-primary">Action Items</CardTitle>
            <CardDescription className="text-xs">
              Tasks and follow-ups from this meeting
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h3 className="mb-2 text-lg font-semibold">Coming Soon</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Action items tracking is currently under development. Stay tuned for this feature!
              </p>
            </div>
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
    </div>
  )
}
