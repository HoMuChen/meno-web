import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TranscriptionItem } from '@/components/TranscriptionItem'
import type { Transcription, Meeting } from '@/types/meeting'
import type { Person } from '@/types/person'

interface TranscriptionListProps {
  // Transcription data
  transcriptions: Transcription[]
  isLoading: boolean
  hasMore: boolean
  meeting: Meeting | null

  // Search state
  searchQuery: string
  isSearching: boolean
  searchError: string | null
  isSearchMode: boolean
  searchResults: Transcription[]
  searchMetadata: {
    searchType: string
    components?: { semantic: number; keyword: number }
    total: number
  } | null

  // Edit state
  editingTranscriptionId: string | null
  editedText: string
  isSavingEdit: boolean

  // Speaker assignment
  people: Person[]
  isAssigning: boolean
  getSpeakerDotColor: (speaker: string) => string

  // Handlers
  onSearchChange: (query: string) => void
  onSearch: () => void
  onClearSearch: () => void
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onEdit: (transcriptionId: string, currentText: string) => void
  onSave: (transcriptionId: string) => void
  onCancel: () => void
  onDelete: (transcriptionId: string) => void
  onTextChange: (text: string) => void
  onAssignSpeaker: (
    speaker: string,
    currentPersonId: string | { _id: string; name: string; company?: string } | undefined,
    newPersonId: string
  ) => void
}

export function TranscriptionList({
  transcriptions,
  isLoading,
  hasMore,
  meeting,
  searchQuery,
  isSearching,
  searchError,
  isSearchMode,
  searchResults,
  searchMetadata,
  editingTranscriptionId,
  editedText,
  isSavingEdit,
  people,
  isAssigning,
  getSpeakerDotColor,
  onSearchChange,
  onSearch,
  onClearSearch,
  onSearchKeyPress,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onTextChange,
  onAssignSpeaker,
}: TranscriptionListProps) {
  const displayTranscriptions = isSearchMode ? searchResults : transcriptions
  const shouldShowCard = displayTranscriptions.length > 0 || meeting?.transcriptionStatus === 'completed'

  if (!shouldShowCard) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-primary">
          {isSearchMode ? 'Search Results' : 'Transcription'}
        </CardTitle>
        <CardDescription className="text-xs">
          {isSearchMode
            ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} found`
            : `${transcriptions.length} segment${transcriptions.length !== 1 ? 's' : ''} loaded`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        {meeting?.transcriptionStatus === 'completed' && (
          <div className="mb-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <Input
                  type="text"
                  placeholder="Search transcriptions..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyPress={onSearchKeyPress}
                  className="pl-10"
                  disabled={isSearching}
                />
              </div>
              <Button
                onClick={onSearch}
                disabled={isSearching || !searchQuery.trim()}
                size="sm"
              >
                {isSearching ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </Button>
              {isSearchMode && (
                <Button
                  variant="outline"
                  onClick={onClearSearch}
                  size="sm"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Search Error */}
            {searchError && (
              <div className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {searchError}
              </div>
            )}

            {/* Search Metadata */}
            {isSearchMode && searchMetadata && (
              <div className="mt-3 text-xs text-muted-foreground">
                Found {searchMetadata.total} result{searchMetadata.total !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {displayTranscriptions.length > 0 ? (
          <div className="space-y-3">
            {displayTranscriptions.map((segment) => (
              <TranscriptionItem
                key={segment._id}
                segment={segment}
                isEditing={editingTranscriptionId === segment._id}
                editedText={editedText}
                isSaving={isSavingEdit}
                people={people}
                isAssigning={isAssigning}
                getSpeakerDotColor={getSpeakerDotColor}
                onEdit={onEdit}
                onSave={onSave}
                onCancel={onCancel}
                onDelete={onDelete}
                onTextChange={onTextChange}
                onAssignSpeaker={onAssignSpeaker}
              />
            ))}

            {/* Loading Indicator */}
            {!isSearchMode && isLoading && (
              <div className="mt-4 flex items-center justify-center py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}

            {/* End of results message */}
            {!isSearchMode && !hasMore && transcriptions.length > 0 && (
              <div className="mt-4 flex justify-center py-4">
                <p className="text-sm text-muted-foreground">
                  No more transcriptions to load
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* No results found for search */}
        {isSearchMode && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
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
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <h3 className="mb-1 text-base font-semibold">No Results Found</h3>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search query or clear the search to see all transcriptions.
            </p>
          </div>
        )}

        {/* No transcriptions available */}
        {!isSearchMode && transcriptions.length === 0 && meeting?.transcriptionStatus === 'completed' && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
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
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h3 className="mb-1 text-base font-semibold">No Transcription Available</h3>
            <p className="text-xs text-muted-foreground">
              The transcription is completed but no content was found.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
