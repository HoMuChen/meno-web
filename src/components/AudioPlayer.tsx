import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/formatters'

interface AudioPlayerProps {
  audioUrl: string | null
  isLoading: boolean
  error: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  isDownloading: boolean
  onLoad: () => void
  onTogglePlayPause: () => void
  onSeek: (time: number) => void
  onDownload: () => void
  setAudioElement: (element: HTMLAudioElement | null) => void
}

export function AudioPlayer({
  audioUrl,
  isLoading,
  error,
  isPlaying,
  currentTime,
  duration,
  isDownloading,
  onLoad,
  onTogglePlayPause,
  onSeek,
  onDownload,
  setAudioElement,
}: AudioPlayerProps) {
  // Load audio when component mounts
  useEffect(() => {
    onLoad()
  }, [onLoad])

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    onSeek(percentage * duration)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading audio...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-3">
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
          className="text-destructive"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        <span className="text-sm text-destructive">{error}</span>
      </div>
    )
  }

  // No audio loaded yet
  if (!audioUrl) {
    return null
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3">
      {/* Hidden audio element */}
      <audio
        ref={setAudioElement}
        src={audioUrl}
        preload="metadata"
      />

      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePlayPause}
          className="h-10 w-10 shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36a1 1 0 0 0-1.5.86z" />
            </svg>
          )}
        </Button>

        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-3">
          {/* Current time */}
          <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
            {formatDuration(currentTime)}
          </span>

          {/* Progress track */}
          <div
            className="flex-1 h-2 bg-muted rounded-full cursor-pointer relative overflow-hidden"
            onClick={handleProgressClick}
            role="slider"
            aria-label="Audio progress"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Duration */}
          <span className="text-xs text-muted-foreground w-12 tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Download button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          disabled={isDownloading}
          className="h-10 w-10 shrink-0"
          aria-label="Download audio"
        >
          {isDownloading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  )
}
