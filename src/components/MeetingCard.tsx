import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ActionsDropdown, type ActionMenuItem } from '@/components/ActionsDropdown'
import { StatusBadge, StatusProgressBar } from '@/components/StatusBadge'
import { formatDuration, formatDateTime } from '@/lib/formatters'
import type { Meeting } from '@/types/meeting'

interface MeetingCardProps {
  meeting: Meeting
  onClick: () => void
  onDelete?: () => void
  onMove?: () => void
  showDeleteButton?: boolean
  showMoveButton?: boolean
}

export function MeetingCard({
  meeting,
  onClick,
  onDelete,
  onMove,
  showDeleteButton = false,
  showMoveButton = false,
}: MeetingCardProps) {
  // Build actions array based on props
  const actions: ActionMenuItem[] = []

  if (showMoveButton && onMove) {
    actions.push({
      label: 'Move to Project',
      icon: (
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
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
      ),
      onClick: onMove,
      className: 'cursor-pointer',
    })
  }

  if (showDeleteButton && onDelete) {
    actions.push({
      label: 'Delete',
      icon: (
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
      ),
      onClick: onDelete,
      className: 'text-destructive focus:text-destructive cursor-pointer',
      separator: showMoveButton && !!onMove, // Show separator if move button was added
    })
  }

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary/50"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm text-primary">
            {meeting.title}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            <StatusBadge
              status={meeting.transcriptionStatus}
              progress={meeting.transcriptionProgress}
              showSpinner
              showProgress
            />
            {actions.length > 0 && (
              <ActionsDropdown
                actions={actions}
                triggerClassName="h-6 w-6 p-0 hover:bg-muted"
                stopPropagation={true}
                aria-label="Meeting actions"
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Description */}
        {meeting.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {meeting.description}
          </p>
        )}

        {/* Progress Bar for Processing */}
        {(meeting.transcriptionStatus === 'pending' || meeting.transcriptionStatus === 'processing') && meeting.transcriptionProgress !== undefined && (
          <StatusProgressBar progress={meeting.transcriptionProgress} />
        )}

        {/* Duration */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{formatDuration(meeting.duration)}</span>
        </div>

        {/* Created Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          <span>{formatDateTime(meeting.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
