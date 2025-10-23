import { Button } from '@/components/ui/button'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { formatDuration } from '@/lib/formatters'

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
  onCancel: () => void
}

export function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
  const {
    recordingState,
    duration,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder()

  // Handle use recording
  const handleUseRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, duration)
    }
  }

  // Handle re-record
  const handleReRecord = () => {
    clearRecording()
  }

  // Handle cancel
  const handleCancel = () => {
    clearRecording()
    onCancel()
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Recording Error</p>
          <p className="mt-1 opacity-90">{error}</p>
        </div>
      )}

      {/* Recording State: Idle */}
      {recordingState === 'idle' && !audioBlob && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-6 rounded-full bg-primary/10 p-6">
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
              className="text-primary"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Ready to Record</h3>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Click the button below to start recording your meeting
          </p>
          <Button type="button" onClick={startRecording} size="lg" className="min-h-[44px]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="mr-2"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
            Start Recording
          </Button>
        </div>
      )}

      {/* Recording State: Recording or Paused */}
      {(recordingState === 'recording' || recordingState === 'paused') && (
        <div className="flex flex-col items-center justify-center py-8">
          {/* Recording Indicator */}
          <div className="relative mb-6">
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-full ${
                recordingState === 'recording'
                  ? 'bg-red-500/20'
                  : 'bg-yellow-500/20'
              }`}
            >
              {recordingState === 'recording' && (
                <div className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />
              )}
              <div
                className={`h-16 w-16 rounded-full ${
                  recordingState === 'recording'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
                }`}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="mb-2 text-4xl font-bold tabular-nums tracking-tight">
            {formatDuration(duration)}
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            {recordingState === 'recording' ? 'Recording...' : 'Paused'}
          </p>

          {/* Controls */}
          <div className="flex gap-3">
            {recordingState === 'recording' ? (
              <Button type="button" onClick={pauseRecording} variant="outline" size="lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="mr-2"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause
              </Button>
            ) : (
              <Button type="button" onClick={resumeRecording} variant="outline" size="lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="mr-2"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Resume
              </Button>
            )}
            <Button type="button" onClick={stopRecording} size="lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="mr-2"
              >
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              Stop
            </Button>
          </div>
        </div>
      )}

      {/* Recording State: Stopped (Preview) */}
      {recordingState === 'stopped' && audioUrl && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-600"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Recording Complete</p>
                <p className="text-sm text-muted-foreground">
                  Duration: {formatDuration(duration)}
                </p>
              </div>
            </div>
          </div>

          {/* Audio Preview */}
          <div className="rounded-lg border bg-background p-4">
            <p className="mb-3 text-sm font-medium">Preview Recording</p>
            <audio
              src={audioUrl}
              controls
              className="w-full"
              style={{ height: '40px' }}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={handleCancel} variant="outline" className="min-h-[44px]">
              Cancel
            </Button>
            <Button type="button" onClick={handleReRecord} variant="outline" className="min-h-[44px]">
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
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              Re-record
            </Button>
            <Button type="button" onClick={handleUseRecording} className="min-h-[44px]">
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
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Use Recording
            </Button>
          </div>
        </div>
      )}

      {/* Cancel button for idle state with error */}
      {recordingState === 'idle' && error && (
        <div className="flex justify-end">
          <Button type="button" onClick={handleCancel} variant="outline">
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
