import { useState, useCallback } from 'react'
import { Document, Paragraph, TextRun, Packer } from 'docx'
import type { Meeting } from '@/types/meeting'

interface UseMeetingSummaryOptions {
  projectId: string | undefined
  meetingId: string | undefined
  onMeetingUpdate?: (meeting: Meeting) => void
}

export function useMeetingSummary({
  projectId,
  meetingId,
  onMeetingUpdate,
}: UseMeetingSummaryOptions) {
  const [streamingSummary, setStreamingSummary] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate summary with SSE streaming
  const generateSummary = useCallback(async () => {
    if (!projectId || !meetingId) return

    setIsGenerating(true)
    setError(null)
    setStreamingSummary('')

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/api/projects/${projectId}/meetings/${meetingId}/summary/stream`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Response body is not readable')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const event = JSON.parse(data)

              if (event.type === 'chunk') {
                setStreamingSummary((prev) => prev + event.content)
              } else if (event.type === 'complete') {
                // Update meeting with the complete summary
                if (event.meeting && onMeetingUpdate) {
                  onMeetingUpdate(event.meeting)
                }
                setIsGenerating(false)
              } else if (event.type === 'error') {
                setError(event.message)
                setIsGenerating(false)
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError)
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate summary:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
      setIsGenerating(false)
    }
  }, [projectId, meetingId, onMeetingUpdate])

  // Download summary as text
  const downloadAsTxt = useCallback((summary: string, meetingTitle?: string) => {
    if (!summary) return

    const fileName = `${meetingTitle || 'meeting'}-summary.txt`
    const blob = new Blob([summary], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  // Download summary as markdown
  const downloadAsMarkdown = useCallback((summary: string, meetingTitle?: string) => {
    if (!summary) return

    const fileName = `${meetingTitle || 'meeting'}-summary.md`
    const markdownContent = `# ${meetingTitle || 'Meeting'} - Summary\n\n${summary}`
    const blob = new Blob([markdownContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  // Download summary as DOCX
  const downloadAsDocx = useCallback(async (summary: string, meetingTitle?: string) => {
    if (!summary) return

    try {
      // Create document title
      const titleParagraph = new Paragraph({
        children: [
          new TextRun({
            text: `${meetingTitle || 'Meeting'} - Summary`,
            bold: true,
            size: 32, // 16pt
          }),
        ],
        spacing: { after: 400 },
      })

      // Split summary by lines and create paragraphs
      const lines = summary.split('\n')
      const contentParagraphs = lines.map((line) => {
        // Detect headings (lines starting with # or ##)
        const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
        if (headingMatch) {
          const level = headingMatch[1].length
          const text = headingMatch[2]
          return new Paragraph({
            children: [
              new TextRun({
                text,
                bold: true,
                size: level === 1 ? 28 : level === 2 ? 24 : 22,
              }),
            ],
            spacing: { before: 200, after: 200 },
          })
        }

        // Detect bullet points
        if (line.match(/^[\s]*[-*]\s+/)) {
          const text = line.replace(/^[\s]*[-*]\s+/, '')
          return new Paragraph({
            children: [new TextRun(text)],
            bullet: { level: 0 },
            spacing: { after: 100 },
          })
        }

        // Regular paragraph
        return new Paragraph({
          children: [new TextRun(line || ' ')], // Empty line for spacing
          spacing: { after: 120 },
        })
      })

      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [titleParagraph, ...contentParagraphs],
          },
        ],
      })

      // Generate blob and download
      const blob = await Packer.toBlob(doc)
      const fileName = `${meetingTitle || 'meeting'}-summary.docx`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate DOCX:', err)
    }
  }, [])

  return {
    // State
    streamingSummary,
    isGenerating,
    error,

    // Actions
    generateSummary,
    downloadAsTxt,
    downloadAsMarkdown,
    downloadAsDocx,
  }
}
