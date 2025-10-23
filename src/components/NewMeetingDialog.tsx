import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AudioRecorder } from '@/components/AudioRecorder'
import api, { ApiException } from '@/lib/api'
import type { CreateMeetingResponse } from '@/types/meeting'

type TabMode = 'record' | 'upload'

interface NewMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess: (meetingId: string) => void
}

export function NewMeetingDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: NewMeetingDialogProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('record')
  const [title, setTitle] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedDuration, setRecordedDuration] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a']
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|webm|ogg|m4a|mp4)$/i)) {
        setError('Invalid file type. Please select an audio file (MP3, WAV, WebM, OGG, M4A).')
        return
      }

      // Validate file size (100MB)
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        setError('File size exceeds 100MB. Please select a smaller file.')
        return
      }

      setAudioFile(file)
      setError(null)

      // Auto-fill title from filename if empty
      if (!title) {
        const filename = file.name.replace(/\.[^/.]+$/, '') // Remove extension
        setTitle(filename)
      }
    }
  }

  // Handle recording complete
  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setRecordedBlob(blob)
    setRecordedDuration(duration)
    setError(null)

    // Auto-generate title if empty
    if (!title.trim()) {
      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
      setTitle(`Meeting - ${dateStr} ${timeStr}`)
    }
  }

  // Handle recording cancel
  const handleRecordingCancel = () => {
    setRecordedBlob(null)
    setRecordedDuration(0)
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let fileToUpload: File | null = null
    let finalTitle = title.trim()

    if (activeTab === 'record') {
      if (!recordedBlob) {
        setError('Please record audio before creating the meeting')
        return
      }

      // Auto-generate title if still empty
      if (!finalTitle) {
        const now = new Date()
        const dateStr = now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
        const timeStr = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
        finalTitle = `Meeting - ${dateStr} ${timeStr}`
      }

      // Convert blob to file
      const extension = recordedBlob.type.includes('webm') ? 'webm' :
                       recordedBlob.type.includes('ogg') ? 'ogg' :
                       recordedBlob.type.includes('mp4') ? 'mp4' : 'webm'
      fileToUpload = new File(
        [recordedBlob],
        `recording-${Date.now()}.${extension}`,
        { type: recordedBlob.type }
      )
    } else {
      if (!audioFile) {
        setError('Please select an audio file')
        return
      }

      // Require title for uploads
      if (!finalTitle) {
        setError('Please enter a meeting title')
        return
      }

      fileToUpload = audioFile
    }

    try {
      setIsUploading(true)
      setError(null)
      setUploadProgress(0)

      // Create FormData
      const formData = new FormData()
      formData.append('audioFile', fileToUpload)
      formData.append('title', finalTitle)
      formData.append('recordingType', activeTab === 'record' ? 'direct' : 'upload')

      // Add duration for recordings
      if (activeTab === 'record' && recordedDuration > 0) {
        formData.append('duration', recordedDuration.toString())
      }

      // Simulate progress (since we can't track real upload progress easily with fetch)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Upload
      const response = await api.postFormData<CreateMeetingResponse>(
        `/api/projects/${projectId}/meetings`,
        formData
      )

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.success && response.data) {
        // Reset form
        setTitle('')
        setAudioFile(null)
        setRecordedBlob(null)
        setRecordedDuration(0)
        setUploadProgress(0)

        // Close dialog and notify parent
        onOpenChange(false)
        onSuccess(response.data._id)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to create meeting')
      } else {
        setError('Unable to connect to the server. Please try again.')
      }
    } finally {
      setIsUploading(false)
    }
  }

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isUploading) {
      // Reset form
      setTitle('')
      setAudioFile(null)
      setRecordedBlob(null)
      setRecordedDuration(0)
      setError(null)
      setUploadProgress(0)
      setActiveTab('record')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Meeting</DialogTitle>
          <DialogDescription>
            Record a new meeting or upload an existing audio file for transcription
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab Buttons */}
          <div className="flex gap-2 rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => setActiveTab('record')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'record'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
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
                className="mr-2 inline"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
              Record
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
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
                className="mr-2 inline"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              Upload
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium">Error</p>
              <p className="mt-1 opacity-90">{error}</p>
            </div>
          )}

          {/* Tab Content: Record */}
          {activeTab === 'record' && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                onCancel={handleRecordingCancel}
              />
            </div>
          )}

          {/* Tab Content: Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 transition-colors hover:border-primary/50 hover:bg-muted"
              >
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
                <p className="mb-1 text-sm font-medium">
                  {audioFile ? audioFile.name : 'Click to select audio file'}
                </p>
                <p className="text-xs text-muted-foreground">
                  MP3, WAV, WebM, OGG, M4A (max 100MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Meeting Details Form */}
          {((activeTab === 'record' && recordedBlob) || (activeTab === 'upload' && audioFile)) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title {activeTab === 'upload' && <span className="text-destructive">*</span>}
                  {activeTab === 'record' && <span className="text-xs text-muted-foreground font-normal ml-1">(optional - auto-generated if empty)</span>}
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={activeTab === 'record' ? 'Leave empty to auto-generate' : 'Enter meeting title'}
                  disabled={isUploading}
                  required={activeTab === 'upload'}
                />
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || (activeTab === 'upload' && !title.trim())}
                >
                  {isUploading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    'Create Meeting'
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
