import { useState, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProjects } from '@/hooks/useProjects'
import api, { ApiException } from '@/lib/api'
import type { CreateMeetingResponse } from '@/types/meeting'

export function HomePage() {
  const navigate = useNavigate()
  const { projects, isLoading: isLoadingProjects } = useProjects()
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        {/* Hero Section */}
        <div className="mb-6 max-w-3xl space-y-3">
          <p className="text-sm text-muted-foreground sm:text-base">
            Upload audio or record directly to get instant transcriptions
          </p>
        </div>

        {/* CTA Buttons */}
        {!isUploading && (
          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <Button
              size="default"
              className="h-10 flex-1 text-sm font-semibold"
              disabled={isLoadingProjects || projects.length === 0}
              onClick={handleUploadClick}
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
              Upload Audio
            </Button>

            <Button
              size="default"
              variant="secondary"
              className="h-10 flex-1 text-sm font-semibold"
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
              Record Audio
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                Coming Soon
              </span>
            </Button>
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
          <Card className="w-full max-w-md">
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
          <div className="mt-4 w-full max-w-md rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
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
    </div>
  )
}
