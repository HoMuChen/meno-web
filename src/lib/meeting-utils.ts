/**
 * Meeting-related utility functions
 */

/**
 * Extract project ID from a project reference
 * Handles both string IDs and populated project objects
 */
export function extractProjectId(projectId: string | { _id: string } | any): string {
  if (typeof projectId === 'string') {
    return projectId
  }

  if (projectId && typeof projectId === 'object' && '_id' in projectId) {
    return projectId._id
  }

  throw new Error('Invalid project ID format')
}

/**
 * Calculate audio duration from a file using HTML Audio API
 * @returns Duration in seconds
 */
export function calculateAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.preload = 'metadata'

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src)
      const durationInSeconds = Math.floor(audio.duration)
      resolve(durationInSeconds)
    }

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src)
      reject(new Error('Failed to load audio metadata'))
    }

    audio.src = URL.createObjectURL(file)
  })
}

/**
 * Validate audio file type
 */
export function isValidAudioFile(file: File): boolean {
  const validTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/m4a',
  ]

  const validExtensions = /\.(mp3|wav|webm|ogg|m4a|mp4)$/i

  return validTypes.includes(file.type) || validExtensions.test(file.name)
}

/**
 * Validate file size against a limit
 * @param file - File to validate
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @returns Object with isValid flag and error message if invalid
 */
export function validateFileSize(
  file: File,
  maxSizeBytes: number
): { isValid: boolean; error?: string } {
  if (file.size > maxSizeBytes) {
    const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024))
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB. Please select a smaller file.`,
    }
  }

  return { isValid: true }
}
