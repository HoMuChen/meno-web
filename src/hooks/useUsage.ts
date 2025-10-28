import { useMemo } from 'react'
import type { CurrentMonthUsage } from '@/types/usage'
import { FREE_TIER_LIMIT_MINUTES } from '@/types/usage'

interface UseUsageProps {
  usage: CurrentMonthUsage | null | undefined
  monthlyDurationLimit?: number // in seconds
}

export function useUsage({ usage, monthlyDurationLimit }: UseUsageProps) {
  // Calculated values
  const usedMinutes = useMemo(() => {
    if (!usage) return 0
    // Convert seconds to minutes
    return Math.round(usage.duration / 60)
  }, [usage])

  // Use provided limit or fall back to FREE_TIER_LIMIT_MINUTES
  const limitMinutes = monthlyDurationLimit
    ? Math.round(monthlyDurationLimit / 60)
    : FREE_TIER_LIMIT_MINUTES
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
    usedMinutes,
    limitMinutes,
    remainingMinutes,
    isOverLimit,
    percentageUsed,
    colorStatus: getColorStatus(),
  }
}
