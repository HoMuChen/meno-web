import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import api, { ApiException } from '@/lib/api'
import type { MeetingResponse } from '@/types/meeting'
import type { Project } from '@/types/project'

export function MeetingDetailsPage() {
  const { projectId, meetingId } = useParams<{ projectId: string; meetingId: string }>()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<any>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transcriptions, setTranscriptions] = useState<any>(null)

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
  const fetchTranscriptions = async () => {
    if (!meetingId) return

    try {
      const response = await api.get<any>(
        `/api/meetings/${meetingId}/transcriptions`
      )

      if (response.success && response.data && response.data.transcriptions) {
        setTranscriptions(response.data.transcriptions)
      }
    } catch (err) {
      console.error('Failed to fetch transcriptions:', err)
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

    // Fetch transcriptions when completed
    if (meeting.transcriptionStatus === 'completed' && !transcriptions) {
      fetchTranscriptions()
    }
  }, [meeting?.transcriptionStatus, transcriptions])

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
          <CardTitle className="text-lg">{meeting?.title || 'Untitled Meeting'}</CardTitle>
          <CardDescription className="text-xs">
            Created on {meeting?.createdAt ? new Date(meeting.createdAt).toLocaleString() : 'Unknown date'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Transcription Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  meeting?.transcriptionStatus === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : meeting?.transcriptionStatus === 'processing'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : meeting?.transcriptionStatus === 'failed'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}
              >
                {meeting?.transcriptionStatus || 'Unknown'}
              </span>
              {(meeting?.transcriptionStatus === 'pending' || meeting?.transcriptionStatus === 'processing') && (
                <div className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Processing...</span>
                </div>
              )}
            </div>

            {/* Progress Bar for Processing */}
            {(meeting?.transcriptionStatus === 'pending' || meeting?.transcriptionStatus === 'processing') && meeting?.transcriptionProgress !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Transcription Progress</span>
                  <span className="font-medium">{meeting.transcriptionProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${meeting.transcriptionProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Duration */}
            {meeting?.duration && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Duration:</span>
                <span className="text-sm text-muted-foreground">
                  {(() => {
                    const totalSeconds = Math.floor(meeting.duration)
                    const minutes = Math.floor(totalSeconds / 60)
                    const seconds = totalSeconds % 60
                    return `${minutes}:${seconds.toString().padStart(2, '0')}`
                  })()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcription Content */}
      {transcriptions && transcriptions.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Transcription</CardTitle>
            <CardDescription className="text-xs">
              {transcriptions.length} segment{transcriptions.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transcriptions.map((segment: any) => {
                // Format time from milliseconds to mm:ss
                const formatTime = (ms: number) => {
                  const totalSeconds = Math.floor(ms / 1000)
                  const minutes = Math.floor(totalSeconds / 60)
                  const seconds = totalSeconds % 60
                  return `${minutes}:${seconds.toString().padStart(2, '0')}`
                }

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
                          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{segment.text}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : meeting?.transcriptionStatus === 'completed' ? (
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
    </div>
  )
}
