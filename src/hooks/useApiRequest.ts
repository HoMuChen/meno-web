import { useState, useCallback } from 'react'
import { ApiException } from '@/lib/api'

interface UseApiRequestOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
}

interface UseApiRequestResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  execute: (...args: any[]) => Promise<T | null>
  reset: () => void
}

/**
 * Reusable hook for API requests with consistent error handling
 *
 * @example
 * const { data, isLoading, error, execute } = useApiRequest({
 *   onSuccess: (meetings) => console.log(meetings)
 * })
 *
 * // In component
 * useEffect(() => {
 *   execute(() => api.get('/api/meetings'))
 * }, [])
 */
export function useApiRequest<T = any>(
  options: UseApiRequestOptions<T> = {}
): UseApiRequestResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { onSuccess, onError } = options

  const execute = useCallback(
    async (apiCall: () => Promise<T>): Promise<T | null> => {
      try {
        setIsLoading(true)
        setError(null)

        const result = await apiCall()

        setData(result)
        onSuccess?.(result)

        return result
      } catch (err) {
        const errorMessage = err instanceof ApiException
          ? err.message || 'Request failed'
          : 'Unable to connect to the server'

        setError(errorMessage)
        onError?.(errorMessage)

        return null
      } finally {
        setIsLoading(false)
      }
    },
    [onSuccess, onError]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    data,
    isLoading,
    error,
    execute,
    reset,
  }
}
