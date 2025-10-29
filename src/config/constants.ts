/**
 * Application-wide configuration constants
 */

/**
 * Polling intervals (in milliseconds)
 */
export const POLLING_INTERVAL_MS = 3000 // 3 seconds

/**
 * Pagination limits
 */
export const TRANSCRIPTION_PAGE_LIMIT = 50
export const RECENT_MEETINGS_LIMIT = 5

/**
 * Infinite scroll configuration
 */
export const INFINITE_SCROLL_THRESHOLD_PX = 200 // Load more when within 200px of bottom

/**
 * Upload configuration
 */
export const UPLOAD_PROGRESS_INTERVAL_MS = 200
export const UPLOAD_PROGRESS_INCREMENT = 10
export const UPLOAD_PROGRESS_MAX = 90

/**
 * Audio file validation
 */
export const VALID_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
] as const

export const VALID_AUDIO_EXTENSIONS = /\.(mp3|wav|webm|ogg|m4a|mp4)$/i

/**
 * Default file size limits (in bytes)
 */
export const DEFAULT_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024 // 100MB

/**
 * Timeouts (in milliseconds)
 */
export const AUTO_LOAD_MORE_DELAY_MS = 300
