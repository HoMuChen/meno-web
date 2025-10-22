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

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || !meetingId) return

      try {
        setIsLoading(true)
        setError(null)

        // Fetch project details
        const projectResponse = await api.get<{ success: boolean; data: Project }>(
          `/api/projects/${projectId}`
        )

        if (projectResponse.success && projectResponse.data) {
          setProject(projectResponse.data)
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
        setIsLoading(false)
      }
    }

    fetchData()
  }, [projectId, meetingId])

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
              <span className="text-sm font-medium">Transcription Status:</span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  meeting?.transcriptionStatus === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : meeting?.transcriptionStatus === 'processing'
                    ? 'bg-blue-100 text-blue-800'
                    : meeting?.transcriptionStatus === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {meeting?.transcriptionStatus || 'Unknown'}
              </span>
            </div>

            {/* Recording Type */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Recording Type:</span>
              <span className="text-sm text-muted-foreground">
                {meeting?.recordingType === 'upload' ? 'Uploaded' : 'Direct Recording'}
              </span>
            </div>

            {/* Duration */}
            {meeting?.duration && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Duration:</span>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(meeting.duration / 60)} minutes
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Placeholder Content */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10">
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
            className="mb-4 text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h3 className="mb-2 text-xl font-semibold">Meeting Details Coming Soon</h3>
          <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
            Full meeting details with audio playback and transcription will be available in the next update.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/')}>
              Upload Another Meeting
            </Button>
            <Button variant="outline" onClick={() => navigate('/projects')}>
              View Projects
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
