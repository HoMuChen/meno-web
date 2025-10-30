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
  summary?: string
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

export interface Transcription {
  _id: string
  meetingId: string
  startTime: number
  endTime: number
  speaker: string
  personId?: string | {
    _id: string
    name: string
    company?: string
  }
  text: string
  confidence: number
  isEdited: boolean
  createdAt: string
  // Search-specific fields (present in hybrid search results)
  score?: number
  fusionScore?: number
  source?: 'semantic' | 'keyword' | 'both'
}

export interface TranscriptionsResponse {
  success: boolean
  message: string
  data: {
    transcriptions: Transcription[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

export interface HybridSearchResponse {
  success: boolean
  message: string
  data: {
    transcriptions: Transcription[]
    pagination: {
      page: number
      limit: number
      total: number
    }
    searchType: string
    components?: {
      semantic: number
      keyword: number
    }
  }
}

// Cross-meeting search types (project-level search)
export interface CrossMeetingTranscription extends Transcription {
  vectorScore?: number
  textScore?: number
  combinedScore?: number
}

export interface CrossMeetingSearchResult {
  meetingId: string
  meetingTitle: string
  meetingDate: string
  matchCount: number
  topScore: number
  transcriptions: CrossMeetingTranscription[]
}

export interface CrossMeetingSearchResponse {
  success: boolean
  message: string
  data: {
    results: CrossMeetingSearchResult[]
    pagination: {
      page: number
      limit: number
      total: number
    }
    searchType: string
    strategy?: string
    meetingsSearched: number
  }
}
