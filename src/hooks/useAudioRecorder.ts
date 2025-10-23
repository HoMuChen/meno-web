import { useState, useRef, useCallback, useEffect } from 'react'

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped'

interface UseAudioRecorderReturn {
  recordingState: RecordingState
  duration: number
  audioBlob: Blob | null
  audioUrl: string | null
  error: string | null
  startRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => void
  clearRecording: () => void
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const durationIntervalRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedDurationRef = useRef<number>(0)

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      })

      streamRef.current = stream

      // Determine best MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ]

      const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(blob)

        // Create URL for preview
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        setRecordingState('stopped')

        // Stop duration tracking
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
          durationIntervalRef.current = null
        }

        // Stop media stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      setRecordingState('recording')

      // Start duration tracking
      startTimeRef.current = Date.now()
      pausedDurationRef.current = 0

      durationIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000)
        setDuration(elapsed)
      }, 1000)

    } catch (err) {
      console.error('Error starting recording:', err)

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Microphone permission denied. Please allow microphone access to record.')
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.')
        } else {
          setError(`Failed to start recording: ${err.message}`)
        }
      } else {
        setError('Failed to start recording. Please try again.')
      }

      setRecordingState('idle')
    }
  }, [])

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')

      // Pause duration tracking
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
    }
  }, [recordingState])

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')

      // Resume duration tracking
      const pauseEnd = Date.now()
      pausedDurationRef.current += pauseEnd - startTimeRef.current - duration * 1000

      durationIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000)
        setDuration(elapsed)
      }, 1000)
    }
  }, [recordingState, duration])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      mediaRecorderRef.current.stop()
      // State will be updated in onstop handler
    }
  }, [recordingState])

  // Clear recording and reset
  const clearRecording = useCallback(() => {
    // Revoke object URL to free memory
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }

    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setRecordingState('idle')
    setError(null)
    audioChunksRef.current = []
  }, [audioUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  return {
    recordingState,
    duration,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    clearRecording,
  }
}
