import { useState, useEffect, useCallback } from 'react'
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import api, { ApiException } from '@/lib/api'
import { formatTimeFromMs, formatDate } from '@/lib/formatters'
import type { Person, PersonTranscription, PersonTranscriptionsResponse } from '@/types/person'
import { SocialMediaIcons } from '@/components/SocialMediaIcons'

export function PersonDetailPage() {
  const { personId } = useParams<{ personId: string }>()
  const navigate = useNavigate()
  const [person, setPerson] = useState<Person | null>(null)
  const [transcriptions, setTranscriptions] = useState<PersonTranscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTranscriptions, setIsLoadingTranscriptions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch person details
  const fetchPerson = useCallback(async () => {
    if (!personId) return

    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get<{ success: boolean; data: Person }>(
        `/api/people/${personId}`
      )

      if (response.success && response.data) {
        setPerson(response.data)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to load person details')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setIsLoading(false)
    }
  }, [personId])

  // Fetch person transcriptions
  const fetchTranscriptions = useCallback(async (page: number = 1, search: string = '') => {
    if (!personId) return

    try {
      setIsLoadingTranscriptions(true)
      setTranscriptionError(null)
      setSearchError(null)

      const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''
      const response = await api.get<PersonTranscriptionsResponse>(
        `/api/people/${personId}/transcriptions?page=${page}&limit=${limit}&sort=createdAt${searchParam}`
      )

      if (response.success && response.data) {
        setTranscriptions(response.data.transcriptions)
        setCurrentPage(response.data.pagination.page)
        setTotalPages(response.data.pagination.pages)
        setTotal(response.data.pagination.total)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        const errorMsg = err.message || 'Failed to load transcriptions'
        if (search.trim()) {
          setSearchError(errorMsg)
        } else {
          setTranscriptionError(errorMsg)
        }
      } else {
        const errorMsg = 'Unable to connect to the server'
        if (search.trim()) {
          setSearchError(errorMsg)
        } else {
          setTranscriptionError(errorMsg)
        }
      }
    } finally {
      setIsLoadingTranscriptions(false)
      setIsSearching(false)
    }
  }, [personId, limit])

  useEffect(() => {
    fetchPerson()
    fetchTranscriptions(1)
  }, [fetchPerson, fetchTranscriptions])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchTranscriptions(newPage, searchQuery)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Handle search
  const handleSearch = () => {
    // Treat empty search as clear
    if (!searchQuery.trim()) {
      handleClearSearch()
      return
    }
    setIsSearching(true)
    setHasSearched(true)
    setCurrentPage(1)
    fetchTranscriptions(1, searchQuery)
  }

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchError(null)
    setHasSearched(false)
    setCurrentPage(1)
    fetchTranscriptions(1, '')
  }

  // Handle search on Enter key
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4 sm:px-4 lg:px-6">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error || !person) {
    return (
      <div className="container mx-auto px-4 py-4 sm:px-4 lg:px-6">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6">
          <h2 className="text-lg font-semibold text-destructive">Error</h2>
          <p className="mt-2 text-sm text-destructive/90">
            {error || 'Person not found'}
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/people')}
            className="mt-4"
          >
            Back to People
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:px-4 lg:px-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/people">People</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{person.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Person Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{person.name}</CardTitle>
              {person.company && (
                <CardDescription className="mt-1 text-base">
                  {person.company}
                </CardDescription>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/people')}
            >
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {person.email && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <a
                  href={`mailto:${person.email}`}
                  className="mt-1 text-sm text-primary hover:underline"
                >
                  {person.email}
                </a>
              </div>
            )}
            {person.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <a
                  href={`tel:${person.phone}`}
                  className="mt-1 text-sm text-primary hover:underline"
                >
                  {person.phone}
                </a>
              </div>
            )}
            {person.socialMedia && Object.values(person.socialMedia).some(value => value) && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Social Media</p>
                <SocialMediaIcons socialMedia={person.socialMedia} size={20} />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="mt-1 text-sm">{formatDate(person.createdAt)}</p>
            </div>
          </div>
          {person.notes && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{person.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcriptions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transcriptions</CardTitle>
              <CardDescription>
                {total > 0
                  ? `${total} transcription${total !== 1 ? 's' : ''} from meetings`
                  : 'No transcriptions yet'}
              </CardDescription>
            </div>
            {total > 0 && (
              <Badge variant="secondary" className="text-sm">
                {total}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          {(total > 0 || hasSearched) && (
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
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <Input
                    type="text"
                    placeholder="Search transcriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="pl-10"
                    disabled={isSearching}
                  />
                </div>
                <Button
                  onClick={handleSearch}
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
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={handleClearSearch}
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
            </div>
          )}

          {transcriptionError && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {transcriptionError}
            </div>
          )}

          {isLoadingTranscriptions && transcriptions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : transcriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 rounded-full bg-muted p-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                No transcriptions found for this person
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Transcription List */}
              {transcriptions.map((transcription) => {
                const meeting = typeof transcription.meetingId === 'object' ? transcription.meetingId : null

                return (
                  <div
                    key={transcription._id}
                    className="rounded-lg border bg-card p-4 hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      {/* Time Range and Meeting Title */}
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">
                            {formatTimeFromMs(transcription.startTime)}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className="font-medium text-muted-foreground">
                            {formatTimeFromMs(transcription.endTime)}
                          </span>
                        </div>
                        {meeting && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground hidden sm:inline">·</span>
                            <button
                              onClick={() => navigate(`/projects/${meeting.projectId}/meetings/${meeting._id}`)}
                              className="flex items-center gap-1.5 group min-w-0"
                            >
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
                              <span className="text-primary group-hover:underline truncate">
                                {meeting.title}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{transcription.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transcription.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isLoadingTranscriptions}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoadingTranscriptions}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
