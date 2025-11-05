import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatters'
import type { ActionItem } from '@/types/meeting'

interface ActionItemCardProps {
  item: ActionItem
  onStatusChange: (itemId: string, projectId: string, meetingId: string, newStatus: 'pending' | 'completed') => void
  onEdit?: (itemId: string, projectId: string, meetingId: string, updates: { task: string; context: string; dueDate?: string }) => void
  onDelete?: (itemId: string) => void
  showDelete?: boolean
}

export function ActionItemCard({
  item,
  onStatusChange,
  onEdit,
  onDelete,
  showDelete = false
}: ActionItemCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingTask, setEditingTask] = useState(item.task)
  const [editingContext, setEditingContext] = useState(item.context)
  const [editingDueDate, setEditingDueDate] = useState(item.dueDate ? item.dueDate.slice(0, 16) : '')

  const meeting = typeof item.meetingId === 'object' ? item.meetingId : null
  const displayName = item.personId
    ? typeof item.personId === 'object'
      ? item.personId.company
        ? `${item.personId.name} - ${item.personId.company}`
        : item.personId.name
      : item.assignee
    : item.assignee

  const handleStartEdit = () => {
    setIsEditing(true)
    setEditingTask(item.task)
    setEditingContext(item.context)
    setEditingDueDate(item.dueDate ? item.dueDate.slice(0, 16) : '')
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingTask(item.task)
    setEditingContext(item.context)
    setEditingDueDate(item.dueDate ? item.dueDate.slice(0, 16) : '')
  }

  const handleSaveEdit = () => {
    if (!meeting || !onEdit) return

    const updates: { task: string; context: string; dueDate?: string } = {
      task: editingTask,
      context: editingContext,
    }

    if (editingDueDate) {
      updates.dueDate = new Date(editingDueDate).toISOString()
    }

    onEdit(item._id, meeting.projectId, meeting._id, updates)
    setIsEditing(false)
  }

  const handleToggleStatus = () => {
    if (!meeting) return
    const newStatus = item.status === 'completed' ? 'pending' : 'completed'
    onStatusChange(item._id, meeting.projectId, meeting._id, newStatus)
  }

  return (
    <div className="rounded-lg border bg-card p-4 hover:bg-accent/5 transition-colors">
      {isEditing ? (
        <div className="space-y-3">
          {/* Edit Mode */}
          <div className="space-y-2">
            <Input
              value={editingTask}
              onChange={(e) => setEditingTask(e.target.value)}
              placeholder="Task description"
              className="font-medium"
            />
            <div className="space-y-1">
              <label htmlFor="due-date" className="text-xs font-medium text-muted-foreground">
                Due Date
              </label>
              <Input
                id="due-date"
                type="datetime-local"
                value={editingDueDate}
                onChange={(e) => setEditingDueDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <Textarea
              value={editingContext}
              onChange={(e) => setEditingContext(e.target.value)}
              placeholder="Context (optional)"
              className="text-sm min-h-[60px]"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={!editingTask.trim()}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Display Mode */}
          <div className="flex items-start gap-3">
            {/* Circular Checkbox */}
            <button
              onClick={handleToggleStatus}
              className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center transition-colors hover:bg-accent"
              aria-label={item.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
            >
              {item.status === 'completed' && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <p className={`flex-1 font-medium text-sm ${item.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                  {item.task}
                </p>
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleStartEdit}
                      aria-label="Edit action item"
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
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </Button>
                  )}
                  {showDelete && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(item._id)}
                      aria-label="Delete action item"
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
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </Button>
                  )}
                </div>
              </div>

              {/* Meeting Link */}
              {meeting && (
                <div className="flex items-center gap-2 text-xs mt-2">
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
                    className="text-muted-foreground shrink-0"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  <Link
                    to={`/projects/${meeting.projectId}/meetings/${meeting._id}`}
                    className="text-primary hover:underline"
                  >
                    {meeting.title}
                  </Link>
                  <Badge variant="secondary" className="text-xs">
                    Meeting
                  </Badge>
                </div>
              )}

              {/* Assignee and Due Date */}
              <div className="flex flex-wrap items-center gap-3 text-xs mt-2">
                {displayName && (
                  <div className="flex items-center gap-1 text-muted-foreground">
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
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>{displayName}</span>
                  </div>
                )}
                {item.dueDate && (
                  <div className="flex items-center gap-1 text-muted-foreground">
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
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                    <span>Due: {formatDate(item.dueDate)}</span>
                  </div>
                )}
              </div>

              {/* Context */}
              {item.context && (
                <p className="text-sm text-muted-foreground mt-2">{item.context}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
