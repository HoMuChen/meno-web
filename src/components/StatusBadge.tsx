/**
 * StatusBadge Component
 *
 * Reusable status badge for meeting transcription status display
 * with consistent styling and loading indicators
 */

import type { Meeting } from '@/types/meeting'

interface StatusBadgeProps {
  status: Meeting['transcriptionStatus']
  progress?: number
  showProgress?: boolean
  showSpinner?: boolean
}

const statusStyles: Record<Meeting['transcriptionStatus'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export function StatusBadge({
  status,
  progress,
  showProgress = false,
  showSpinner = false,
}: StatusBadgeProps) {
  const isProcessing = status === 'pending' || status === 'processing'

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
      >
        {status}
      </span>

      {showSpinner && isProcessing && (
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {showProgress && progress !== undefined && (
            <span className="text-xs text-muted-foreground">{progress}%</span>
          )}
        </div>
      )}
    </div>
  )
}

interface StatusProgressBarProps {
  progress: number
}

export function StatusProgressBar({ progress }: StatusProgressBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
