import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { StatusBadge, StatusProgressBar } from '@/components/StatusBadge'
import { TranscriptionList } from '@/components/TranscriptionList'
import { MeetingSummary } from '@/components/MeetingSummary'
import { AssignSpeakerDialog } from '@/components/AssignSpeakerDialog'
import { AddPersonDialog } from '@/components/AddPersonDialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { AudioPlayer } from '@/components/AudioPlayer'
import { useTranscriptions } from '@/hooks/useTranscriptions'
import { useMeetingSearch } from '@/hooks/useMeetingSearch'
import { useMeetingSummary } from '@/hooks/useMeetingSummary'
import { useMeetingActionItems } from '@/hooks/useMeetingActionItems'
import { useSpeakerAssignment } from '@/hooks/useSpeakerAssignment'
import { useMeetingData } from '@/hooks/useMeetingData'
import { useMeetingAudio } from '@/hooks/useMeetingAudio'
import { formatDuration } from '@/lib/formatters'
import { getSpeakerDotColor } from '@/lib/transcription-utils'
import { ActionsDropdown } from '@/components/ActionsDropdown'
import { ActionItemCard } from '@/components/ActionItemCard'
import { usePeopleContext } from '@/contexts/PeopleContext'
import { usePolling } from '@/hooks/usePolling'
import {
  INFINITE_SCROLL_THRESHOLD_PX,
} from '@/config/constants'

type ContentTab = 'transcription' | 'summary' | 'events'

export function MeetingDetailsPage() {
  const { projectId, meetingId } = useParams<{ projectId: string; meetingId: string }>()
  const [activeContentTab, setActiveContentTab] = useState<ContentTab>('transcription')

  // Use meeting data hook
  const meetingDataHook = useMeetingData({ projectId, meetingId })

  // Use transcriptions hook
  const transcriptionsHook = useTranscriptions({
    meetingId,
    onError: meetingDataHook.setError,
  })

  // Use search hook
  const searchHook = useMeetingSearch({ meetingId })

  // Use summary hook
  const summaryHook = useMeetingSummary({
    projectId,
    meetingId,
    onMeetingUpdate: meetingDataHook.setMeeting,
  })

  // Use action items hook
  const actionItemsHook = useMeetingActionItems({
    projectId,
    meetingId,
    meetingTitle: meetingDataHook.meeting?.title,
    onGenerateStart: () => meetingDataHook.fetchMeetingData(false),
  })

  // Use speaker assignment hook
  const speakerAssignmentHook = useSpeakerAssignment({
    meetingId,
    onAssignmentComplete: () => transcriptionsHook.fetchTranscriptions(1, false),
    onError: meetingDataHook.setError,
  })

  // Use audio playback hook
  const audioHook = useMeetingAudio({
    projectId,
    meetingId,
    meetingTitle: meetingDataHook.meeting?.title,
  })

  const { people, createPerson } = usePeopleContext()

  // Initial data fetch
  useEffect(() => {
    meetingDataHook.fetchMeetingData(true)
  }, [meetingDataHook.fetchMeetingData])

  // Determine if we should poll for meeting updates
  const isProcessing = meetingDataHook.meeting?.transcriptionStatus === 'pending' ||
                       meetingDataHook.meeting?.transcriptionStatus === 'processing' ||
                       meetingDataHook.meeting?.actionItemsStatus === 'processing'

  // Poll for meeting updates when processing
  usePolling({
    enabled: isProcessing,
    onPoll: () => meetingDataHook.fetchMeetingData(false),
  })

  // Fetch action items when completed - only once
  useEffect(() => {
    if (meetingDataHook.meeting?.actionItemsStatus === 'completed' && !actionItemsHook.actionItemsLoadedRef.current) {
      actionItemsHook.fetchActionItemsData()
    }
  }, [meetingDataHook.meeting?.actionItemsStatus, actionItemsHook])

  // Stop generating state when action items status changes
  useEffect(() => {
    if (meetingDataHook.meeting?.actionItemsStatus === 'completed' || meetingDataHook.meeting?.actionItemsStatus === 'failed') {
      actionItemsHook.stopGenerating()
    }
  }, [meetingDataHook.meeting?.actionItemsStatus, actionItemsHook])

  // Fetch transcriptions when completed - only once
  useEffect(() => {
    if (meetingDataHook.meeting?.transcriptionStatus === 'completed' && !transcriptionsHook.initialLoadComplete && transcriptionsHook.transcriptions.length === 0) {
      transcriptionsHook.fetchTranscriptions(1, false)
    }
  }, [meetingDataHook.meeting?.transcriptionStatus, transcriptionsHook.transcriptions.length, transcriptionsHook.initialLoadComplete, transcriptionsHook.fetchTranscriptions])

  // Infinite scroll effect
  useEffect(() => {
    if (activeContentTab !== 'transcription') {
      return
    }

    // Don't attach scroll listener until initial load completes
    if (!transcriptionsHook.initialLoadComplete) {
      return
    }

    // Find the scrollable container (main element)
    const scrollContainer = document.querySelector('main')
    if (!scrollContainer) {
      return
    }

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop
      const scrollHeight = scrollContainer.scrollHeight
      const clientHeight = scrollContainer.clientHeight
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      // Load more when user scrolls to bottom (within threshold)
      if (distanceFromBottom < INFINITE_SCROLL_THRESHOLD_PX) {
        transcriptionsHook.loadMoreTranscriptions()
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [activeContentTab, transcriptionsHook.loadMoreTranscriptions, transcriptionsHook.initialLoadComplete])

  if (meetingDataHook.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (meetingDataHook.error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
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
              className="mb-4 text-destructive"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <h3 className="mb-2 text-lg font-semibold text-destructive">{meetingDataHook.error}</h3>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:px-4 lg:px-6">
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => window.location.href = ('/')}
                className="cursor-pointer"
              >
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => window.location.href = ('/projects')}
                className="cursor-pointer"
              >
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => window.location.href = (`/projects/${projectId}`)}
                className="cursor-pointer"
              >
                {meetingDataHook.project?.name || 'Project'}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{meetingDataHook.meeting?.title || 'Meeting'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Meeting Info */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg text-primary">{meetingDataHook.meeting?.title || 'Untitled Meeting'}</CardTitle>
              <CardDescription className="text-xs">
                Created on {meetingDataHook.meeting?.createdAt ? new Date(meetingDataHook.meeting.createdAt).toLocaleString() : 'Unknown date'}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => meetingDataHook.setShowDeleteDialog(true)}
              aria-label="Delete meeting"
            >
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
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Transcription Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <StatusBadge
                status={meetingDataHook.meeting?.transcriptionStatus || 'pending'}
                showSpinner
              />
              {(meetingDataHook.meeting?.transcriptionStatus === 'pending' || meetingDataHook.meeting?.transcriptionStatus === 'processing') && (
                <span className="text-xs text-muted-foreground">Processing...</span>
              )}
            </div>

            {/* Progress Bar for Processing */}
            {(meetingDataHook.meeting?.transcriptionStatus === 'pending' || meetingDataHook.meeting?.transcriptionStatus === 'processing') && meetingDataHook.meeting?.transcriptionProgress !== undefined && (
              <StatusProgressBar progress={meetingDataHook.meeting.transcriptionProgress} />
            )}

            {/* Duration */}
            {meetingDataHook.meeting?.duration && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Duration:</span>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(meetingDataHook.meeting.duration)}
                </span>
              </div>
            )}

            {/* Audio Player */}
            {meetingDataHook.meeting?.audioFile && (
              <div className="pt-2">
                <span className="text-sm font-medium block mb-2">Audio:</span>
                <AudioPlayer
                  audioUrl={audioHook.audioUrl}
                  isLoading={audioHook.isLoadingAudio}
                  error={audioHook.audioError}
                  isPlaying={audioHook.isPlaying}
                  currentTime={audioHook.currentTime}
                  duration={audioHook.duration}
                  isDownloading={audioHook.isDownloading}
                  onLoad={audioHook.loadAudio}
                  onTogglePlayPause={audioHook.togglePlayPause}
                  onSeek={audioHook.seekTo}
                  onDownload={audioHook.downloadAudio}
                  setAudioElement={audioHook.setAudioElement}
                />
              </div>
            )}

            {/* Content Types */}
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium pt-1">Content:</span>
              <div className="flex flex-wrap gap-2">
                <span
                  onClick={() => setActiveContentTab('transcription')}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    activeContentTab === 'transcription'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  Transcription
                </span>
                <span
                  onClick={() => setActiveContentTab('summary')}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    activeContentTab === 'summary'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  Summary
                </span>
                <span
                  onClick={() => setActiveContentTab('events')}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    activeContentTab === 'events'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  Action Items
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcription Content */}
      {activeContentTab === 'transcription' && (
        <TranscriptionList
          transcriptions={transcriptionsHook.transcriptions}
          isLoading={transcriptionsHook.isLoadingTranscriptions}
          hasMore={transcriptionsHook.hasMoreTranscriptions}
          meeting={meetingDataHook.meeting}
          searchQuery={searchHook.searchQuery}
          isSearching={searchHook.isSearching}
          searchError={searchHook.searchError}
          isSearchMode={searchHook.isSearchMode}
          searchResults={searchHook.searchResults}
          searchMetadata={searchHook.searchMetadata}
          editingTranscriptionId={transcriptionsHook.editingTranscriptionId}
          editedText={transcriptionsHook.editedText}
          isSavingEdit={transcriptionsHook.isSavingEdit}
          people={people}
          isAssigning={speakerAssignmentHook.isAssigning}
          getSpeakerDotColor={getSpeakerDotColor}
          onSearchChange={searchHook.setSearchQuery}
          onSearch={searchHook.performSearch}
          onClearSearch={searchHook.clearSearch}
          onSearchKeyPress={searchHook.handleSearchKeyPress}
          onEdit={transcriptionsHook.handleEditTranscription}
          onSave={transcriptionsHook.handleSaveEdit}
          onCancel={transcriptionsHook.handleCancelEdit}
          onDelete={transcriptionsHook.handleShowDeleteTranscription}
          onTextChange={transcriptionsHook.setEditedText}
          onAssignSpeaker={speakerAssignmentHook.handleAssignSpeaker}
        />
      )}

      {/* Summary Content */}
      {activeContentTab === 'summary' && (
        <MeetingSummary
          summary={meetingDataHook.meeting?.summary}
          streamingSummary={summaryHook.streamingSummary}
          isGenerating={summaryHook.isGenerating}
          error={summaryHook.error}
          onGenerate={summaryHook.generateSummary}
          onDownloadTxt={summaryHook.downloadAsTxt}
          onDownloadMarkdown={summaryHook.downloadAsMarkdown}
          onDownloadDocx={summaryHook.downloadAsDocx}
          meetingTitle={meetingDataHook.meeting?.title}
        />
      )}

      {/* Events Content (Action Items) */}
      {activeContentTab === 'events' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg text-primary">Action Items</CardTitle>
                <CardDescription className="text-xs">
                  Tasks and follow-ups from this meeting
                </CardDescription>
              </div>
              {meetingDataHook.meeting?.actionItemsStatus === 'completed' && actionItemsHook.actionItems.length > 0 && (
                <ActionsDropdown
                  actions={[
                    {
                      label: 'Download as TXT',
                      icon: (
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
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                      ),
                      onClick: actionItemsHook.downloadActionItemsAsTxt,
                    },
                    {
                      label: 'Download as Markdown',
                      icon: (
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
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                      ),
                      onClick: actionItemsHook.downloadActionItemsAsMarkdown,
                    },
                  ]}
                  aria-label="Download options"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Not Started State */}
            {meetingDataHook.meeting?.actionItemsStatus === 'not_started' && (
              <div className="flex flex-col items-center justify-center py-12">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mb-4 text-muted-foreground/60"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" x2="15" y1="15" y2="15" />
                </svg>
                <h3 className="mb-2 text-lg font-semibold">No Action Items Yet</h3>
                <p className="mb-4 text-sm text-muted-foreground text-center max-w-md">
                  Generate AI-powered action items from this meeting's transcription.
                </p>
                <Button onClick={actionItemsHook.handleGenerateActionItems} disabled={actionItemsHook.isGeneratingActionItems}>
                  {actionItemsHook.isGeneratingActionItems ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    'Generate Action Items'
                  )}
                </Button>
              </div>
            )}

            {/* Processing State */}
            {meetingDataHook.meeting?.actionItemsStatus === 'processing' && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <h3 className="mb-2 text-lg font-semibold">Generating Action Items</h3>
                <p className="mb-4 text-sm text-muted-foreground text-center max-w-md">
                  Please wait while we analyze the meeting and extract action items...
                </p>
                {meetingDataHook.meeting?.actionItemsProgress !== undefined && (
                  <div className="w-full max-w-md">
                    <StatusProgressBar progress={meetingDataHook.meeting.actionItemsProgress} />
                  </div>
                )}
              </div>
            )}

            {/* Completed State */}
            {meetingDataHook.meeting?.actionItemsStatus === 'completed' && (
              <>
                {actionItemsHook.isLoadingActionItems ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading action items...</p>
                  </div>
                ) : actionItemsHook.actionItems.length > 0 ? (
                  <div className="space-y-3">
                    {actionItemsHook.actionItems.map((item) => (
                      <ActionItemCard
                        key={item._id}
                        item={item}
                        onStatusChange={actionItemsHook.handleUpdateActionItemStatus}
                        onEdit={actionItemsHook.handleSaveActionItemEdit}
                        onDelete={actionItemsHook.handleShowDeleteActionItem}
                        showDelete={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
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
                      className="mb-3 text-muted-foreground"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <h3 className="mb-1 text-base font-semibold">No Action Items Found</h3>
                    <p className="text-xs text-muted-foreground">
                      No action items were identified in this meeting.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Failed State */}
            {meetingDataHook.meeting?.actionItemsStatus === 'failed' && (
              <div className="flex flex-col items-center justify-center py-12">
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
                  className="mb-3 text-destructive"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <h3 className="mb-2 text-base font-semibold text-destructive">Failed to Generate Action Items</h3>
                <p className="mb-4 text-xs text-muted-foreground text-center max-w-md">
                  {actionItemsHook.actionItemsError || meetingDataHook.meeting?.metadata?.actionItems?.errorMessage || 'An error occurred while generating action items'}
                </p>
                <Button onClick={actionItemsHook.handleGenerateActionItems} disabled={actionItemsHook.isGeneratingActionItems}>
                  Try Again
                </Button>
              </div>
            )}

            {/* Error State */}
            {actionItemsHook.actionItemsError && meetingDataHook.meeting?.actionItemsStatus !== 'failed' && (
              <div className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {actionItemsHook.actionItemsError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Meeting Confirmation Dialog */}
      <DeleteConfirmDialog
        open={meetingDataHook.showDeleteDialog}
        onOpenChange={meetingDataHook.setShowDeleteDialog}
        onConfirm={meetingDataHook.handleDeleteMeeting}
        title="Delete Meeting"
        description={`Are you sure you want to delete "${meetingDataHook.meeting?.title}"? This action cannot be undone and will permanently remove the meeting, audio file, and all transcriptions.`}
        isDeleting={meetingDataHook.isDeleting}
      />

      {/* Delete Transcription Confirmation Dialog */}
      <DeleteConfirmDialog
        open={transcriptionsHook.showDeleteTranscriptionDialog}
        onOpenChange={transcriptionsHook.setShowDeleteTranscriptionDialog}
        onConfirm={transcriptionsHook.handleDeleteTranscription}
        title="Delete Transcription"
        description="Are you sure you want to delete this transcription segment? This action cannot be undone."
      />

      {/* Assign Speaker Confirmation Dialog */}
      <AssignSpeakerDialog
        open={speakerAssignmentHook.showAssignConfirmDialog}
        onOpenChange={(open) => {
          if (!open) speakerAssignmentHook.cancelAssignment()
        }}
        onConfirm={speakerAssignmentHook.confirmAssignment}
        isAssigning={speakerAssignmentHook.isAssigning}
      />

      {/* Add Person Dialog */}
      <AddPersonDialog
        open={speakerAssignmentHook.showAddPersonDialog}
        onOpenChange={(open) => {
          if (!open) speakerAssignmentHook.cancelAddPerson()
        }}
        onConfirm={() => speakerAssignmentHook.handleCreatePersonAndAssign(createPerson)}
        isCreating={speakerAssignmentHook.isCreatingPerson}
        personName={speakerAssignmentHook.newPersonName}
        personCompany={speakerAssignmentHook.newPersonCompany}
        onNameChange={speakerAssignmentHook.setNewPersonName}
        onCompanyChange={speakerAssignmentHook.setNewPersonCompany}
      />

      {/* Delete Action Item Confirmation Dialog */}
      <DeleteConfirmDialog
        open={actionItemsHook.showDeleteActionItemDialog}
        onOpenChange={(open) => {
          if (!open) {
            actionItemsHook.setShowDeleteActionItemDialog(false)
            actionItemsHook.setDeletingActionItemId(null)
          }
        }}
        onConfirm={actionItemsHook.handleDeleteActionItem}
        title="Delete Action Item"
        description="Are you sure you want to delete this action item? This action cannot be undone."
      />
    </div>
  )
}
