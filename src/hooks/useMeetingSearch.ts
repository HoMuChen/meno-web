import { useState, useCallback } from 'react'
import { searchTranscriptionsHybrid } from '@/lib/api'
import { ApiException } from '@/lib/api'
import type { Transcription, HybridSearchResponse } from '@/types/meeting'

interface UseMeetingSearchOptions {
  meetingId: string | undefined
}

export function useMeetingSearch({ meetingId }: UseMeetingSearchOptions) {
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchResults, setSearchResults] = useState<Transcription[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchMetadata, setSearchMetadata] = useState<{
    searchType: string
    components?: { semantic: number; keyword: number }
    total: number
  } | null>(null)

  // Handle search
  const performSearch = useCallback(async () => {
    if (!meetingId || !searchQuery.trim()) return

    try {
      setIsSearching(true)
      setSearchError(null)

      const response = await searchTranscriptionsHybrid(
        meetingId,
        searchQuery.trim()
      ) as HybridSearchResponse

      if (response.success && response.data) {
        setSearchResults(response.data.transcriptions)
        setIsSearchMode(true)
        setSearchMetadata({
          searchType: response.data.searchType,
          components: response.data.components,
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
  }, [meetingId, searchQuery])

  // Handle clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setIsSearchMode(false)
    setSearchError(null)
    setSearchMetadata(null)
  }, [])

  // Handle search on Enter key
  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      performSearch()
    }
  }, [performSearch])

  return {
    // State
    searchQuery,
    isSearchMode,
    searchResults,
    isSearching,
    searchError,
    searchMetadata,

    // Actions
    setSearchQuery,
    performSearch,
    clearSearch,
    handleSearchKeyPress,
  }
}
