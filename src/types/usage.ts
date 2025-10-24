export interface CurrentMonthUsage {
  duration: number // in seconds
  lastReset: string
  month: number
  year: number
}

export interface UsageData {
  userId: string
  year: number
  month: number
  totalDurationSeconds: number
  totalDurationMinutes: number
  totalDurationHours: string
  meetingCount: number
  period: {
    start: string
    end: string
  }
}

export interface UsageResponse {
  success: boolean
  data: UsageData
}

// Free tier monthly limit in minutes
export const FREE_TIER_LIMIT_MINUTES = 300
