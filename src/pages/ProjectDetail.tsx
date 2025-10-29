import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NewMeetingDialog } from '@/components/NewMeetingDialog'
import { StatusBadge, StatusProgressBar } from '@/components/StatusBadge'
import { useAuth } from '@/contexts/AuthContext'
import { useProjectsContext } from '@/contexts/ProjectsContext'
import api, { ApiException, searchProjectTranscriptions } from '@/lib/api'
import { formatDuration, formatDateTime, formatTimeFromMs } from '@/lib/formatters'
import type { Project } from '@/types/project'
import type { Meeting, MeetingResponse, MeetingsResponse, CrossMeetingSearchResult, CrossMeetingSearchResponse } from '@/types/meeting'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { refreshProjects } = useProjectsContext()
  const [project, setProject] = useState<Project | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isNewMeetingDialogOpen, setIsNewMeetingDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchResults, setSearchResults] = useState<CrossMeetingSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchMetadata, setSearchMetadata] = useState<{
    searchType: string
    strategy?: string
    meetingsSearched: number
    total: number
  } | null>(null)

  // Fetch project details and meetings
  const fetchData = async (showLoading = true, forceRefetchProject = false) => {
    if (!projectId) return

    try {
      if (showLoading) {
        setIsLoading(true)
      }
      setError(null)

      // Fetch project details (on first load or when forced)
      if (!project || forceRefetchProject) {
        const projectResponse = await api.get<{ success: boolean; data: Project }>(
          `/api/projects/${projectId}`
        )

        if (projectResponse.success && projectResponse.data) {
          setProject(projectResponse.data)
        }
      }

      // Fetch meetings for this project
      const meetingsResponse = await api.get<MeetingsResponse>(
        `/api/projects/${projectId}/meetings`
      )

      if (meetingsResponse.success && meetingsResponse.data) {
        setMeetings(meetingsResponse.data.meetings)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to load project details')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }

  // Fetch only incomplete meetings
  const fetchIncompleteMeetings = async () => {
    if (!projectId) return

    try {
      // Get incomplete meeting IDs
      const incompleteMeetingIds = meetings
        .filter(
          (m) =>
            m.transcriptionStatus === 'pending' ||
            m.transcriptionStatus === 'processing'
        )
        .map((m) => m._id)

      if (incompleteMeetingIds.length === 0) return

      // Fetch each incomplete meeting
      const updatedMeetingsPromises = incompleteMeetingIds.map((id) =>
        api.get<MeetingResponse>(`/api/projects/${projectId}/meetings/${id}`)
      )

      const responses = await Promise.all(updatedMeetingsPromises)

      // Update meetings state with new data
      setMeetings((prevMeetings) => {
        const updatedMeetings = [...prevMeetings]
        responses.forEach((response: MeetingResponse) => {
          if (response.success && response.data) {
            const index = updatedMeetings.findIndex(
              (m) => m._id === response.data._id
            )
            if (index !== -1) {
              updatedMeetings[index] = response.data
            }
          }
        })
        return updatedMeetings
      })
    } catch (err) {
      console.error('Failed to fetch incomplete meetings:', err)
    }
  }

  // Handle delete meeting
  const handleDeleteMeeting = async () => {
    if (!meetingToDelete || !projectId) return

    try {
      setIsDeleting(true)
      await api.delete(`/api/projects/${projectId}/meetings/${meetingToDelete._id}`)

      // Remove the meeting from the list
      setMeetings((prev) => prev.filter((m) => m._id !== meetingToDelete._id))

      // Close the dialog
      setMeetingToDelete(null)
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to delete meeting')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Open edit dialog with current project data
  const handleOpenEditDialog = () => {
    if (project) {
      setEditName(project.name)
      setEditDescription(project.description || '')
      setUpdateError(null)
      setIsEditDialogOpen(true)
    }
  }

  // Handle update project
  const handleUpdateProject = async (e: FormEvent) => {
    e.preventDefault()
    if (!projectId) return

    setUpdateError(null)
    setIsUpdating(true)

    try {
      const updateData: Partial<Project> = {
        name: editName.trim(),
      }

      // Only include description if it has a value
      const trimmedDescription = editDescription.trim()
      if (trimmedDescription) {
        updateData.description = trimmedDescription
      } else {
        updateData.description = ''
      }

      const response = await api.put<{ success: boolean; data: Project }>(
        `/api/projects/${projectId}`,
        updateData
      )

      if (response.success && response.data) {
        // Update local project state with the response data
        setProject(response.data)
        // Refresh projects list in context to sync with listing page
        await refreshProjects()
        // Close dialog
        setIsEditDialogOpen(false)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setUpdateError(err.message || 'Failed to update project')
      } else {
        setUpdateError('Unable to connect to the server')
      }
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle search
  const handleSearch = async () => {
    if (!projectId) return

    // Treat empty/whitespace query as clear search
    if (!searchQuery.trim()) {
      handleClearSearch()
      return
    }

    try {
      setIsSearching(true)
      setSearchError(null)

      const response = await searchProjectTranscriptions(
        projectId,
        searchQuery.trim()
      ) as CrossMeetingSearchResponse

      if (response.success && response.data) {
        setSearchResults(response.data.results)
        setIsSearchMode(true)
        setSearchMetadata({
          searchType: response.data.searchType,
          strategy: response.data.strategy,
          meetingsSearched: response.data.meetingsSearched,
          total: response.data.pagination.total,
        })
      }
    } catch (err) {
      console.error('Search failed:', err)
      if (err instanceof ApiException) {
        setSearchError(err.message || 'Search failed')
      } else {
        setSearchError('Unable to perform search')
      }
    } finally {
      setIsSearching(false)
    }
  }

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setIsSearchMode(false)
    setSearchError(null)
    setSearchMetadata(null)
  }

  // Handle search on Enter key
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchData(true)
  }, [projectId])

  // Polling for incomplete meetings
  useEffect(() => {
    const hasProcessingMeetings = meetings.some(
      (meeting) =>
        meeting.transcriptionStatus === 'pending' ||
        meeting.transcriptionStatus === 'processing'
    )

    if (hasProcessingMeetings) {
      const interval = setInterval(() => {
        fetchIncompleteMeetings()
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [meetings])


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-md bg-muted" />
        <Card>
          <CardHeader>
            <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/projects')}
          className="mb-6"
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
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Projects
        </Button>
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-destructive">
          <p className="font-medium">Error loading project</p>
          <p className="mt-1 text-sm opacity-90">{error || 'Project not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:px-4 lg:px-6">
      {/* Header with back button */}
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/projects')}
          className="shrink-0"
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
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Projects
        </Button>
      </div>

      {/* Project Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl">{project.name}</CardTitle>
              {project.description && (
                <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenEditDialog}
              className="shrink-0"
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
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
            <span>Created {formatDateTime(project.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Meetings Section */}
      <div>
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold tracking-tight text-primary">Meetings</h2>
            <Button className="w-full sm:w-auto" onClick={() => setIsNewMeetingDialogOpen(true)}>
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
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              New Meeting
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <Input
                  type="text"
                  placeholder="Search transcriptions across all meetings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="pl-10 pr-10"
                  disabled={isSearching}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-muted"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
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
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="shrink-0"
              >
                {isSearching ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </Button>
            </div>

            {/* Search Error */}
            {searchError && (
              <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {searchError}
              </div>
            )}

            {/* Search Metadata */}
            {isSearchMode && searchMetadata && !searchError && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
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
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <span>
                  Found {searchMetadata.total} result{searchMetadata.total !== 1 ? 's' : ''} across {searchMetadata.meetingsSearched} meeting{searchMetadata.meetingsSearched !== 1 ? 's' : ''}
                  {searchMetadata.strategy && ` using ${searchMetadata.strategy}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        {isSearchMode && searchResults.length > 0 && (
          <div className="space-y-4">
            {searchResults.map((meetingResult) => (
              <Card key={meetingResult.meetingId} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer bg-muted/50 transition-colors hover:bg-muted"
                  onClick={() => navigate(`/projects/${projectId}/meetings/${meetingResult.meetingId}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base text-primary sm:text-lg">
                        {meetingResult.meetingTitle}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2 text-xs sm:text-sm">
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
                        <span>{formatDateTime(meetingResult.meetingDate)}</span>
                      </CardDescription>
                    </div>
                    <div className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {meetingResult.matchCount} match{meetingResult.matchCount !== 1 ? 'es' : ''}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {meetingResult.transcriptions.map((transcription) => (
                      <div
                        key={transcription._id}
                        className="cursor-pointer p-4 transition-colors hover:bg-muted/50"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/projects/${projectId}/meetings/${meetingResult.meetingId}?t=${transcription.startTime}`)
                        }}
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-primary">{transcription.speaker}</span>
                          <span>•</span>
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
                            className="inline"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>{formatTimeFromMs(transcription.startTime)} - {formatTimeFromMs(transcription.endTime)}</span>
                        </div>
                        <p className="text-sm leading-relaxed">{transcription.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Search Results */}
        {isSearchMode && searchResults.length === 0 && !searchError && !isSearching && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10">
              <div className="mb-4 rounded-full bg-muted p-4">
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
                  className="text-muted-foreground"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold sm:text-xl">No results found</h3>
              <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground sm:text-base">
                Try adjusting your search query or clear the search to view all meetings
              </p>
              <Button variant="outline" onClick={handleClearSearch}>
                Clear Search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isSearchMode && meetings.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10">
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
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold sm:text-xl">No meetings yet</h3>
              <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground sm:text-base">
                Get started by creating your first meeting for this project
              </p>
              <Button size="lg" className="min-h-[44px]" onClick={() => setIsNewMeetingDialogOpen(true)}>
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
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Create First Meeting
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Mobile: Card List View */}
        {!isSearchMode && meetings.length > 0 && (
          <div className="space-y-2 md:hidden">
            {meetings.map((meeting) => (
              <Card
                key={meeting._id}
                className="cursor-pointer transition-all hover:border-primary/50"
                onClick={() => navigate(`/projects/${projectId}/meetings/${meeting._id}`)}
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
                  <div className="flex items-center justify-between">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMeetingToDelete(meeting)
                      }}
                      aria-label="Delete meeting"
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
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Desktop: Table View */}
        {!isSearchMode && meetings.length > 0 && (
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetings.map((meeting) => (
                      <TableRow
                        key={meeting._id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          navigate(`/projects/${projectId}/meetings/${meeting._id}`)
                        }
                      >
                        <TableCell className="font-medium text-primary">{meeting.title}</TableCell>
                        <TableCell>
                          <span className="line-clamp-2 text-sm text-muted-foreground">
                            {meeting.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={meeting.transcriptionStatus}
                            progress={meeting.transcriptionProgress}
                            showSpinner
                            showProgress
                          />
                        </TableCell>
                        <TableCell>{formatDuration(meeting.duration)}</TableCell>
                        <TableCell>{formatDateTime(meeting.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMeetingToDelete(meeting)
                            }}
                            aria-label="Delete meeting"
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
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!meetingToDelete} onOpenChange={(open) => !open && setMeetingToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Meeting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{meetingToDelete?.title}"? This action cannot be undone and will permanently remove the meeting and all its transcriptions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMeetingToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMeeting}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && setIsEditDialogOpen(false)}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleUpdateProject}>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update the project name and description
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {updateError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {updateError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="Enter project name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                  disabled={isUpdating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Enter project description (optional)"
                  value={editDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
                  maxLength={500}
                  rows={4}
                  disabled={isUpdating}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {editDescription.length}/500 characters
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating || !editName.trim()}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Meeting Dialog */}
      {projectId && (
        <NewMeetingDialog
          open={isNewMeetingDialogOpen}
          onOpenChange={setIsNewMeetingDialogOpen}
          projectId={projectId}
          onSuccess={() => {
            fetchData(false)
          }}
          usage={user?.currentMonthUsage}
          onUsageRefresh={refreshUser}
        />
      )}
    </div>
  )
}
