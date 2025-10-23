import { useState, useEffect, useCallback } from 'react'
import { getCurrentMonthUsage } from '@/lib/api'
import { ApiException } from '@/lib/api'
import type { UsageData, UsageResponse } from '@/types/usage'
import { FREE_TIER_LIMIT_MINUTES } from '@/types/usage'

export function useUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await getCurrentMonthUsage() as UsageResponse

      if (response.success && response.data) {
        setUsage(response.data)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to load usage data')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  // Calculated values
  const usedMinutes = usage?.totalDurationMinutes || 0
  const limitMinutes = FREE_TIER_LIMIT_MINUTES
  const remainingMinutes = Math.max(0, limitMinutes - usedMinutes)
  const isOverLimit = usedMinutes >= limitMinutes
  const percentageUsed = Math.min(100, (usedMinutes / limitMinutes) * 100)

  // Color status
  const getColorStatus = (): 'green' | 'yellow' | 'red' => {
    if (percentageUsed >= 100) return 'red'
    if (percentageUsed >= 80) return 'yellow'
    return 'green'
  }

  return {
    usage,
    isLoading,
    error,
    usedMinutes,
    limitMinutes,
    remainingMinutes,
    isOverLimit,
    percentageUsed,
    colorStatus: getColorStatus(),
    refreshUsage: fetchUsage,
  }
}
