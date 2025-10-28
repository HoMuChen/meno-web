import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { NewMeetingDialog } from '@/components/NewMeetingDialog'
import { StatusBadge, StatusProgressBar } from '@/components/StatusBadge'
import { useProjectsContext } from '@/contexts/ProjectsContext'
import { useMeetings } from '@/hooks/useMeetings'
import { useAuth } from '@/contexts/AuthContext'
import { formatDuration, formatDateTime } from '@/lib/formatters'

export function HomePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { projects, isLoading: isLoadingProjects } = useProjectsContext()
  const { meetings, isLoading: isLoadingMeetings, error: meetingsError } = useMeetings({
    userId: user?._id || null,
    limit: 5,
  })
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [isNewMeetingDialogOpen, setIsNewMeetingDialogOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const handleNewMeetingClick = () => {
    setIsProjectModalOpen(true)
  }

  const handleProjectSelect = (projectId: string) => {
    setIsProjectModalOpen(false)
    setSelectedProjectId(projectId)
    setIsNewMeetingDialogOpen(true)
  }

  const handleMeetingSuccess = (meetingId: string) => {
    setIsNewMeetingDialogOpen(false)
    navigate(`/projects/${selectedProjectId}/meetings/${meetingId}`)
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Recent Meetings Section */}
      {!isLoadingMeetings && meetings.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Meetings</h2>
            <Button
              size="sm"
              onClick={handleNewMeetingClick}
              disabled={isLoadingProjects || projects.length === 0}
              className="hidden md:inline-flex"
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
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              New Meeting
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meetings.map((meeting) => (
              <Card
                key={meeting._id}
                className="cursor-pointer transition-all hover:border-primary/50"
                onClick={() => navigate(`/projects/${meeting.projectId}/meetings/${meeting._id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-sm text-primary">
                      {meeting.title}
                    </CardTitle>
                    <StatusBadge
                      status={meeting.transcriptionStatus}
                      progress={meeting.transcriptionProgress}
                      showSpinner
                      showProgress
                    />
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

      {/* New Meeting Dialog */}
      {selectedProjectId && (
        <NewMeetingDialog
          open={isNewMeetingDialogOpen}
          onOpenChange={setIsNewMeetingDialogOpen}
          projectId={selectedProjectId}
          onSuccess={handleMeetingSuccess}
          usage={user?.currentMonthUsage}
          onUsageRefresh={refreshUser}
        />
      )}
    </div>
  )
}
