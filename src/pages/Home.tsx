import { useState, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { useProjects } from '@/hooks/useProjects'
import { useMeetings } from '@/hooks/useMeetings'
import { useAuth } from '@/hooks/useAuth'
import api, { ApiException } from '@/lib/api'
import type { CreateMeetingResponse } from '@/types/meeting'

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { projects, isLoading: isLoadingProjects } = useProjects()
  const { meetings, isLoading: isLoadingMeetings, error: meetingsError } = useMeetings({
    userId: user?._id || null,
    limit: 5,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)

  const ALLOWED_AUDIO_TYPES = [
    'audio/mpeg', // MP3
    'audio/wav', // WAV
    'audio/x-m4a', // M4A
    'audio/m4a', // M4A alternative
    'audio/webm', // WebM
    'audio/ogg', // OGG
  ]

  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB in bytes

  const generateMeetingTitle = () => {
    const now = new Date()
    return `Meeting - ${now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} ${now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A'
    const totalSeconds = Math.floor(duration)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    }
  }

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload MP3, WAV, M4A, WebM, or OGG audio files.'
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 100MB limit. Please upload a smaller file.'
    }

    return null
  }

  const handleUploadClick = () => {
    setIsProjectModalOpen(true)
  }

  const handleProjectSelect = (projectId: string) => {
    setError(null)
    setIsProjectModalOpen(false)
    fileInputRef.current?.setAttribute('data-project-id', projectId)
    fileInputRef.current?.click()
  }

  const handleRecordClick = () => {
    // Placeholder for record audio - coming soon
    alert('Audio recording feature coming soon!')
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const projectId = e.target.getAttribute('data-project-id')

    if (!file || !projectId) return

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)

    // Start upload immediately
    await uploadMeeting(file, projectId)
  }

  const uploadMeeting = async (file: File, projectId: string) => {
    if (!projectId) return

    try {
      setIsUploading(true)
      setUploadProgress(0)
      setError(null)

      const formData = new FormData()
      formData.append('audioFile', file)
      formData.append('title', generateMeetingTitle())
      formData.append('recordingType', 'upload')

      // Simulate progress (in real implementation, use XMLHttpRequest for real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await api.postFormData<CreateMeetingResponse>(
        `/api/projects/${projectId}/meetings`,
        formData
      )

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.success && response.data) {
        // Redirect to meeting details page
        setTimeout(() => {
          navigate(`/projects/${projectId}/meetings/${response.data._id}`)
        }, 500)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 400) {
          setError('Invalid file or meeting data. Please try again.')
        } else if (err.status === 404) {
          setError('Project not found. Please select a different project.')
        } else {
          setError(err.message || 'Failed to upload meeting')
        }
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Recent Meetings Section */}
      {!isLoadingMeetings && meetings.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Meetings</h2>
            <div className="hidden sm:flex gap-2">
              <Button
                size="sm"
                onClick={handleUploadClick}
                disabled={isLoadingProjects || projects.length === 0}
              >
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
                  className="mr-2"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                Upload
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRecordClick}
                disabled
              >
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
                  className="mr-2"
                  aria-hidden="true"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
                Record
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meetings.map((meeting) => (
              <Card
                key={meeting._id}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => navigate(`/projects/${meeting.projectId}/meetings/${meeting._id}`)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{meeting.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {formatDate(meeting.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                          meeting.transcriptionStatus
                        )}`}
                      >
                        {meeting.transcriptionStatus}
                      </span>
                      {meeting.duration && (
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(meeting.duration)}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {meeting.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {meeting.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Loading State for Meetings */}
      {isLoadingMeetings && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Recent Meetings</h2>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="ml-3 text-sm text-muted-foreground">Loading recent meetings...</span>
          </div>
        </div>
      )}

      {/* Error State for Meetings */}
      {meetingsError && !isLoadingMeetings && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Recent Meetings</h2>
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="flex items-start gap-2">
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
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              <p>{meetingsError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State for Meetings */}
      {!isLoadingMeetings && meetings.length === 0 && !meetingsError && (
        <div className="mb-8">
          <div className="rounded-lg border border-dashed p-6 text-center">
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
              className="mx-auto mb-3 text-muted-foreground"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h3 className="mb-1 text-base font-semibold">No meetings yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload your first audio file to get started!
            </p>
          </div>
        </div>
      )}

      {/* Project Selection Modal */}
      <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
        <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none p-0">
          <div className="flex flex-col items-center gap-3 py-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Select Project
            </h2>
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              {projects.map((project) => (
                <Button
                  key={project._id}
                  variant="outline"
                  size="default"
                  className="justify-center py-3.5 px-6 text-center bg-white text-foreground shadow-lg hover:shadow-xl hover:bg-white transition-all duration-150 border-0 rounded-xl font-semibold text-sm"
                  onClick={() => handleProjectSelect(project._id)}
                >
                  {project.name}
                </Button>
              ))}

              {/* Create New Project Button */}
              <Button
                variant="outline"
                size="default"
                className="justify-center items-center gap-1.5 py-3.5 px-6 text-center bg-white/10 text-white border border-white/20 shadow-lg hover:shadow-xl hover:bg-white/15 transition-all duration-150 rounded-xl font-medium text-sm"
                onClick={() => navigate('/projects')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                <span>Create New Project</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Progress */}
      {isUploading && (
        <Card className="w-full max-w-md mx-auto mt-8">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mb-2 text-lg font-semibold">Uploading Meeting...</p>
            <div className="w-full max-w-xs">
              <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {uploadProgress}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && !isUploading && (
        <div className="mt-4 w-full max-w-md mx-auto rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-start gap-2">
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
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/x-m4a,audio/m4a,audio/webm,audio/ogg"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload audio file"
      />
    </div>
  )
}
