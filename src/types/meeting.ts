export interface Meeting {
  _id: string
  title: string
  projectId: string
  audioFile: string
  duration?: number
  recordingType: 'upload' | 'direct'
  transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed'
  transcriptionProgress?: number
  description?: string
  metadata?: {
    fileSize?: number
    mimeType?: string
    originalName?: string
  }
  createdAt: string
  updatedAt: string
}

export interface CreateMeetingRequest {
  audioFile: File
  title: string
  recordingType?: 'upload' | 'direct'
}

export interface CreateMeetingResponse {
  success: boolean
  data: Meeting
}

export interface MeetingResponse {
  success: boolean
  data: Meeting
}

export interface MeetingsResponse {
  success: boolean
  data: {
    meetings: Meeting[]
    pagination: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }
}
