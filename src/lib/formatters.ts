/**
 * Formatting Utilities
 *
 * Centralized formatting functions for consistent date, time, and duration display
 */

/**
 * Format duration from seconds to mm:ss format
 * @param seconds - Duration in seconds
 * @returns Formatted string in mm:ss format
 */
export function formatDuration(seconds?: number): string {
  if (!seconds) return 'N/A'

  const totalSeconds = Math.floor(seconds)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60

  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format date to localized short format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format date with time
 * @param dateString - ISO date string
 * @returns Formatted date with time (e.g., "Jan 15, 2024, 2:30 PM")
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format time from milliseconds to hh:mm:ss or mm:ss
 * @param ms - Time in milliseconds
 * @returns Formatted string in hh:mm:ss format (if hours > 0) or mm:ss format
 */
export function formatTimeFromMs(ms: number): string {
  if (ms === undefined || ms === null) return '00:00'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Generate auto-generated meeting title with current date and time
 * @returns Meeting title string (e.g., "Meeting - Jan 15, 2024 2:30 PM")
 */
export function generateMeetingTitle(): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return `Meeting - ${dateStr} ${timeStr}`
}
