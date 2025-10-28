import { useUsage } from '@/hooks/useUsage'
import type { CurrentMonthUsage } from '@/types/usage'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface UsageIndicatorProps {
  usage: CurrentMonthUsage | null | undefined
  showDetails?: boolean
  monthlyDurationLimit?: number // in seconds
}

export function UsageIndicator({ usage, showDetails = true, monthlyDurationLimit }: UsageIndicatorProps) {
  const { usedMinutes, limitMinutes, percentageUsed, colorStatus } = useUsage({
    usage,
    monthlyDurationLimit,
  })

  const getProgressBarColor = () => {
    switch (colorStatus) {
      case 'red':
        return 'bg-destructive'
      case 'yellow':
        return 'bg-yellow-500'
      case 'green':
      default:
        return 'bg-primary'
    }
  }

  const formatMonth = () => {
    if (!usage) return ''
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return `${months[usage.month - 1]} ${usage.year}`
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
                style={{ width: `${Math.min(100, percentageUsed)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {Math.round(percentageUsed)}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="space-y-1.5">
          {/* Usage Text */}
          <div className="flex items-center justify-between gap-4 text-sm">
            <span>
              <span className="font-semibold">{Math.round(usedMinutes)}</span>
              {' / '}
              {limitMinutes} minutes
            </span>
          </div>

          {/* Period Info */}
          {showDetails && usage && (
            <div className="text-xs opacity-90">
              {formatMonth()}
            </div>
          )}

          {/* Warning Message */}
          {colorStatus === 'yellow' && (
            <div className="text-xs text-yellow-300 font-medium">
              ⚠️ Approaching limit
            </div>
          )}
          {colorStatus === 'red' && (
            <div className="text-xs text-red-300 font-medium">
              🚫 Limit reached
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
