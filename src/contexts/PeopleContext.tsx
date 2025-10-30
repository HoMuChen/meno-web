import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import api, { ApiException } from '@/lib/api'
import type {
  Person,
  PeopleResponse,
  CreatePersonRequest,
  UpdatePersonRequest,
} from '@/types/person'

interface PeopleContextType {
  people: Person[]
  isLoading: boolean
  error: string | null
  fetchPeople: () => Promise<void>
  refreshPeople: () => Promise<void>
  createPerson: (data: CreatePersonRequest) => Promise<Person | null>
  updatePerson: (id: string, data: UpdatePersonRequest) => Promise<Person | null>
  deletePerson: (id: string) => Promise<boolean>
}

const PeopleContext = createContext<PeopleContextType | undefined>(undefined)

export function PeopleProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  const fetchPeople = useCallback(async () => {
    // Prevent concurrent requests
    if (isFetching) return

    try {
      setIsFetching(true)
      setIsLoading(true)
      setError(null)
      const response = await api.get<PeopleResponse>('/api/people')

      if (response.success && response.data) {
        setPeople(response.data.people)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to load people')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [isFetching])

  const createPerson = useCallback(async (data: CreatePersonRequest): Promise<Person | null> => {
    try {
      const response = await api.post<{ success: boolean; data: Person }>(
        '/api/people',
        data
      )

      if (response.success && response.data) {
        setPeople((prev) => [response.data, ...prev])
        return response.data
      }
      return null
    } catch (err) {
      console.error('Failed to create person:', err)
      return null
    }
  }, [])

  const updatePerson = useCallback(async (id: string, data: UpdatePersonRequest): Promise<Person | null> => {
    try {
      const response = await api.put<{ success: boolean; data: Person }>(
        `/api/people/${id}`,
        data
      )

      if (response.success && response.data) {
        setPeople((prev) =>
          prev.map((person) => (person._id === id ? response.data : person))
        )
        return response.data
      }
      return null
    } catch (err) {
      console.error('Failed to update person:', err)
      return null
    }
  }, [])

  const deletePerson = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await api.delete<{ success: boolean }>(
        `/api/people/${id}`
      )

      if (response.success) {
        setPeople((prev) => prev.filter((person) => person._id !== id))
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to delete person:', err)
      return false
    }
  }, [])

  const refreshPeople = useCallback(async () => {
    await fetchPeople()
  }, [fetchPeople])

  // Initial fetch on mount
  useEffect(() => {
    fetchPeople()
  }, []) // Empty dependency array - only fetch once on mount

  const value: PeopleContextType = {
    people,
    isLoading,
    error,
    fetchPeople,
    refreshPeople,
    createPerson,
    updatePerson,
    deletePerson,
  }

  return (
    <PeopleContext.Provider value={value}>
      {children}
    </PeopleContext.Provider>
  )
}

export function usePeopleContext() {
  const context = useContext(PeopleContext)
  if (context === undefined) {
    throw new Error('usePeopleContext must be used within a PeopleProvider')
  }
  return context
}
