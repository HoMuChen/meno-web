import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ActionsDropdown } from '@/components/ActionsDropdown'

interface MeetingSummaryProps {
  summary: string | undefined
  streamingSummary: string
  isGenerating: boolean
  error: string | null
  onGenerate: () => void
  onDownloadTxt: (summary: string, meetingTitle?: string) => void
  onDownloadMarkdown: (summary: string, meetingTitle?: string) => void
  meetingTitle?: string
}

export function MeetingSummary({
  summary,
  streamingSummary,
  isGenerating,
  error,
  onGenerate,
  onDownloadTxt,
  onDownloadMarkdown,
  meetingTitle,
}: MeetingSummaryProps) {
  const displaySummary = summary || streamingSummary
  const hasSummary = Boolean(displaySummary)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg text-primary">Summary</CardTitle>
            <CardDescription className="text-xs">
              AI-generated meeting summary
            </CardDescription>
          </div>
          {hasSummary && (
            <ActionsDropdown
              actions={[
                {
                  label: 'Download as TXT',
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                  ),
                  onClick: () => onDownloadTxt(displaySummary, meetingTitle),
                },
                {
                  label: 'Download as Markdown',
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                  ),
                  onClick: () => onDownloadMarkdown(displaySummary, meetingTitle),
                },
              ]}
              aria-label="Download options"
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasSummary ? (
          <>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  code: (props) => {
                    const { inline, children, ...rest } = props as { inline?: boolean; children?: React.ReactNode }
                    return inline ? (
                      <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm" {...rest}>
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-muted text-foreground p-3 rounded text-sm overflow-x-auto" {...rest}>
                        {children}
                      </code>
                    )
                  },
                  pre: ({ children, ...props }) => (
                    <pre className="bg-muted text-foreground border border-border rounded p-3 overflow-x-auto my-4" {...props}>
                      {children}
                    </pre>
                  ),
                }}
              >
                {displaySummary}
              </ReactMarkdown>
            </div>
            {isGenerating && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Generating summary...</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            {error ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mb-3 text-destructive"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <h3 className="mb-2 text-base font-semibold text-destructive">Failed to Generate Summary</h3>
                <p className="mb-4 text-xs text-muted-foreground">{error}</p>
                <Button onClick={onGenerate} disabled={isGenerating}>
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mb-3 text-muted-foreground"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="9" x2="15" y1="10" y2="10" />
                  <line x1="12" x2="12" y1="7" y2="13" />
                </svg>
                <h3 className="mb-2 text-base font-semibold">No Summary Available</h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  Generate an AI summary of this meeting's transcription.
                </p>
                <Button onClick={onGenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    'Generate Summary'
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
