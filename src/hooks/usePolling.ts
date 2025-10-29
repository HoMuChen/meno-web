import { useEffect, useRef } from 'react'
import { POLLING_INTERVAL_MS } from '@/config/constants'

interface UsePollingOptions {
  /**
   * Whether polling should be active
   */
  enabled: boolean

  /**
   * Polling interval in milliseconds
   * @default 3000
   */
  intervalMs?: number

  /**
   * Callback function to execute on each poll
   */
  onPoll: () => void | Promise<void>
}

/**
 * Reusable hook for polling operations
 *
 * @example
 * usePolling({
 *   enabled: meeting.status === 'processing',
 *   intervalMs: 3000,
 *   onPoll: () => fetchMeetingStatus()
 * })
 */
export function usePolling({
  enabled,
  intervalMs = POLLING_INTERVAL_MS,
  onPoll,
}: UsePollingOptions) {
  const intervalRef = useRef<number | null>(null)
  const callbackRef = useRef(onPoll)

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = onPoll
  }, [onPoll])

  useEffect(() => {
    if (!enabled) {
      // Clear interval if polling is disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      callbackRef.current()
    }, intervalMs)

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, intervalMs])
}
