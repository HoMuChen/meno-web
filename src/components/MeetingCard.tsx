import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge, StatusProgressBar } from '@/components/StatusBadge'
import { formatDuration, formatDateTime } from '@/lib/formatters'
import type { Meeting } from '@/types/meeting'

interface MeetingCardProps {
  meeting: Meeting
  onClick: () => void
  onDelete?: () => void
  showDeleteButton?: boolean
}

export function MeetingCard({
  meeting,
  onClick,
  onDelete,
  showDeleteButton = false,
}: MeetingCardProps) {
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
            {showDeleteButton && onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Meeting actions"
                  >
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
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                    }}
                  >
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
                      className="mr-2"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
