import { useState, useCallback, useRef, useEffect } from 'react'
import { getAuthToken } from '@/lib/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/'

interface UseMeetingAudioOptions {
  projectId: string | undefined
  meetingId: string | undefined
  meetingTitle?: string
}

export function useMeetingAudio({ projectId, meetingId, meetingTitle }: UseMeetingAudioOptions) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  // Fetch audio blob from API
  const fetchAudioBlob = useCallback(async (): Promise<Blob | null> => {
    if (!projectId || !meetingId) return null

    const token = getAuthToken()
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/meetings/${meetingId}/download`,
      {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Audio file not found')
      }
      throw new Error('Failed to fetch audio')
    }

    return response.blob()
  }, [projectId, meetingId])

  // Load audio for playback
  const loadAudio = useCallback(async () => {
    if (audioUrl) return // Already loaded

    try {
      setIsLoadingAudio(true)
      setAudioError(null)

      const blob = await fetchAudioBlob()
      if (!blob) {
        throw new Error('No audio available')
      }

      // Revoke previous URL if exists
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }

      const url = URL.createObjectURL(blob)
      audioUrlRef.current = url
      setAudioUrl(url)
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Failed to load audio')
    } finally {
      setIsLoadingAudio(false)
    }
  }, [audioUrl, fetchAudioBlob])

  // Play/pause toggle
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }, [isPlaying])

  // Seek to specific time
  const seekTo = useCallback((time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }, [])

  // Download audio file
  const downloadAudio = useCallback(async () => {
    try {
      setIsDownloading(true)
      setAudioError(null)

      const blob = await fetchAudioBlob()
      if (!blob) {
        throw new Error('No audio available')
      }

      // Determine file extension from MIME type
      const mimeType = blob.type
      let extension = 'mp3'
      if (mimeType.includes('wav')) {
        extension = 'wav'
      } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
        extension = 'm4a'
      } else if (mimeType.includes('webm')) {
        extension = 'webm'
      } else if (mimeType.includes('ogg')) {
        extension = 'ogg'
      }

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${meetingTitle || 'meeting-audio'}.${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Failed to download audio')
    } finally {
      setIsDownloading(false)
    }
  }, [fetchAudioBlob, meetingTitle])

  // Set audio element ref and attach event listeners
  const setAudioElement = useCallback((element: HTMLAudioElement | null) => {
    if (audioRef.current) {
      // Remove old listeners
      audioRef.current.onplay = null
      audioRef.current.onpause = null
      audioRef.current.ontimeupdate = null
      audioRef.current.onloadedmetadata = null
      audioRef.current.ondurationchange = null
      audioRef.current.onended = null
    }

    audioRef.current = element

    if (element) {
      // Check if duration already available (handles cached audio where
      // loadedmetadata may have fired before listener was attached)
      if (element.duration && isFinite(element.duration)) {
        setDuration(element.duration)
      }

      element.onplay = () => setIsPlaying(true)
      element.onpause = () => setIsPlaying(false)
      element.ontimeupdate = () => setCurrentTime(element.currentTime)
      element.onloadedmetadata = () => {
        if (isFinite(element.duration)) {
          setDuration(element.duration)
        }
      }
      // Handle formats where duration becomes available later (WebM, OGG)
      element.ondurationchange = () => {
        if (isFinite(element.duration)) {
          setDuration(element.duration)
        }
      }
      element.onended = () => setIsPlaying(false)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
    }
  }, [])

  return {
    // State
    audioUrl,
    isLoadingAudio,
    audioError,
    isPlaying,
    currentTime,
    duration,
    isDownloading,

    // Actions
    loadAudio,
    togglePlayPause,
    seekTo,
    downloadAudio,
    setAudioElement,
  }
}
