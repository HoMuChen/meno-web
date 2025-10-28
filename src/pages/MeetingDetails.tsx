import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Check, Circle, Trash2 } from 'lucide-react'
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
import { StatusBadge, StatusProgressBar } from '@/components/StatusBadge'
import api, { ApiException } from '@/lib/api'
import { formatDuration, formatTimeFromMs } from '@/lib/formatters'
import type { MeetingResponse, TranscriptionsResponse } from '@/types/meeting'
import type { Project } from '@/types/project'

type ContentTab = 'transcription' | 'summary' | 'events'

interface CategorizedActionItems {
  pastDue: typeof mockActionItems
  today: typeof mockActionItems
  thisWeek: typeof mockActionItems
  future: typeof mockActionItems
}

// Helper function to categorize action items by due date
const categorizeActionItems = (items: typeof mockActionItems): CategorizedActionItems => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const endOfWeek = new Date(today)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const categorized: CategorizedActionItems = {
    pastDue: [],
    today: [],
    thisWeek: [],
    future: []
  }

  items.forEach(item => {
    const dueDate = new Date(item.dueDate)
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

    if (dueDateOnly < today && !item.completed) {
      categorized.pastDue.push(item)
    } else if (dueDateOnly.getTime() === today.getTime()) {
      categorized.today.push(item)
    } else if (dueDateOnly >= tomorrow && dueDateOnly < endOfWeek) {
      categorized.thisWeek.push(item)
    } else {
      categorized.future.push(item)
    }
  })

  return categorized
}

// Mock action items data
const mockActionItems = [
  // Past Due
  {
    id: '1',
    assignee: 'Sarah Chen',
    dueDate: '2025-10-20',
    task: 'Submit expense reports for September',
    completed: false
  },
  {
    id: '2',
    assignee: 'Michael Rodriguez',
    dueDate: '2025-10-24',
    task: 'Review and approve pull requests',
    completed: false
  },
  {
    id: '3',
    assignee: 'David Kim',
    dueDate: '2025-10-25',
    task: 'Update security certificates',
    completed: true
  },
  // Today
  {
    id: '4',
    assignee: 'Emma Thompson',
    dueDate: '2025-10-27',
    task: 'Send Q4 sales report to stakeholders',
    completed: false
  },
  {
    id: '5',
    assignee: 'Lisa Park',
    dueDate: '2025-10-27',
    task: 'Finalize meeting agenda for tomorrow',
    completed: false
  },
  {
    id: '6',
    assignee: 'Sarah Chen',
    dueDate: '2025-10-27',
    task: 'Review design mockups',
    completed: true
  },
  // This Week
  {
    id: '7',
    assignee: 'Michael Rodriguez',
    dueDate: '2025-10-28',
    task: 'Fix critical bugs in production environment',
    completed: false
  },
  {
    id: '8',
    assignee: 'Emma Thompson',
    dueDate: '2025-10-29',
    task: 'Schedule follow-up meeting with design team',
    completed: false
  },
  {
    id: '9',
    assignee: 'David Kim',
    dueDate: '2025-10-31',
    task: 'Prepare technical documentation for new feature',
    completed: false
  },
  {
    id: '10',
    assignee: 'Lisa Park',
    dueDate: '2025-11-01',
    task: 'Update project timeline with Q4 milestones',
    completed: false
  },
  // Future
  {
    id: '11',
    assignee: 'Sarah Chen',
    dueDate: '2025-11-10',
    task: 'Conduct user interviews for product feedback',
    completed: false
  },
  {
    id: '12',
    assignee: 'Michael Rodriguez',
    dueDate: '2025-11-20',
    task: 'Update budget spreadsheet with Q4 figures',
    completed: false
  },
  {
    id: '13',
    assignee: 'Emma Thompson',
    dueDate: '2025-12-15',
    task: 'Create presentation for Q1 planning session',
    completed: false
  }
]

export function MeetingDetailsPage() {
  const { projectId, meetingId } = useParams<{ projectId: string; meetingId: string }>()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<any>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transcriptions, setTranscriptions] = useState<any[]>([])
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
  const [actionItems, setActionItems] = useState(mockActionItems)

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
        `/api/meetings/${meetingId}/transcriptions?page=${page}&limit=50`
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
        }, 300)
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

  // Toggle action item completion
  const toggleActionItemCompletion = (itemId: string) => {
    setActionItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    )
  }

  // Delete action item
  const deleteActionItem = (itemId: string) => {
    setActionItems(items => items.filter(item => item.id !== itemId))
  }

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

  // Initial data fetch
  useEffect(() => {
    fetchMeetingData(true)
  }, [projectId, meetingId])

  // Polling for incomplete transcriptions
  useEffect(() => {
    if (!meeting) return

    const isProcessing = meeting.transcriptionStatus === 'pending' ||
                        meeting.transcriptionStatus === 'processing'

    if (isProcessing) {
      const interval = setInterval(() => {
        fetchMeetingData(false)
      }, 3000)

      return () => clearInterval(interval)
    }

    // Fetch transcriptions when completed - only once
    if (meeting.transcriptionStatus === 'completed' && !initialLoadCompleteRef.current && transcriptions.length === 0) {
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

      // Load more when user scrolls to bottom (within 200px)
      if (distanceFromBottom < 200) {
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
          <CardTitle className="text-lg text-primary">{meeting?.title || 'Untitled Meeting'}</CardTitle>
          <CardDescription className="text-xs">
            Created on {meeting?.createdAt ? new Date(meeting.createdAt).toLocaleString() : 'Unknown date'}
          </CardDescription>
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
                <span className="group relative inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground cursor-pointer hover:bg-muted/70 transition-colors">
                  People
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border">
                    Coming Soon
                  </span>
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
                  {transcriptions.map((segment: any) => {
                    return (
                      <div
                        key={segment._id}
                        className="rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                          {segment.speaker && (
                            <span className="font-medium text-foreground">{segment.speaker}</span>
                          )}
                          {segment.startTime !== undefined && segment.endTime !== undefined && (
                            <span className="text-muted-foreground">
                              {formatTimeFromMs(segment.startTime)} - {formatTimeFromMs(segment.endTime)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed">{segment.text}</p>
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
                      code: ({ node, inline, className, children, ...props }: any) => {
                        return inline ? (
                          <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm" {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className="block bg-muted text-foreground p-3 rounded text-sm overflow-x-auto" {...props}>
                            {children}
                          </code>
                        )
                      },
                      pre: ({ children, ...props }: any) => (
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
            {actionItems.length > 0 ? (
              (() => {
                const categorized = categorizeActionItems(actionItems)
                const renderActionItem = (item: typeof actionItems[0], isPastDue = false) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 transition-all ${
                      item.completed
                        ? 'bg-muted/50 opacity-75'
                        : isPastDue
                        ? 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10'
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleActionItemCompletion(item.id)}
                        className="flex-shrink-0 mt-0.5 rounded-sm hover:bg-accent transition-colors p-0.5"
                        aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {item.completed ? (
                          <div className="h-5 w-5 rounded-sm bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm mb-1 ${
                            item.completed
                              ? 'line-through text-muted-foreground'
                              : isPastDue
                              ? 'text-destructive'
                              : 'text-foreground'
                          }`}
                        >
                          {item.task}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-medium">{item.assignee}</span>
                          <span>•</span>
                          <span className={isPastDue && !item.completed ? 'text-destructive' : ''}>
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => deleteActionItem(item.id)}
                        className="flex-shrink-0 rounded-sm p-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Delete action item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )

                return (
                  <div className="space-y-6">
                    {/* Past Due */}
                    {categorized.pastDue.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-sm font-semibold text-destructive">Past Due</h3>
                          <span className="text-xs text-muted-foreground">
                            ({categorized.pastDue.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {categorized.pastDue.map((item) => renderActionItem(item, true))}
                        </div>
                      </div>
                    )}

                    {/* Today */}
                    {categorized.today.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-sm font-semibold text-foreground">Today</h3>
                          <span className="text-xs text-muted-foreground">
                            ({categorized.today.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {categorized.today.map((item) => renderActionItem(item))}
                        </div>
                      </div>
                    )}

                    {/* This Week */}
                    {categorized.thisWeek.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-sm font-semibold text-foreground">This Week</h3>
                          <span className="text-xs text-muted-foreground">
                            ({categorized.thisWeek.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {categorized.thisWeek.map((item) => renderActionItem(item))}
                        </div>
                      </div>
                    )}

                    {/* Future */}
                    {categorized.future.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-sm font-semibold text-foreground">Future</h3>
                          <span className="text-xs text-muted-foreground">
                            ({categorized.future.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {categorized.future.map((item) => renderActionItem(item))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()
            ) : (
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
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                  <path d="M3 6h18" />
                </svg>
                <h3 className="mb-1 text-base font-semibold">No Action Items</h3>
                <p className="text-xs text-muted-foreground">
                  No tasks or follow-ups have been created for this meeting yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
