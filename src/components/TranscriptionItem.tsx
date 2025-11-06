import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatTimeFromMs } from '@/lib/formatters'
import type { Transcription } from '@/types/meeting'
import type { Person } from '@/types/person'

interface TranscriptionItemProps {
  segment: Transcription
  isEditing: boolean
  editedText: string
  isSaving: boolean
  people: Person[]
  isAssigning: boolean
  getSpeakerDotColor: (speaker: string) => string
  onEdit: (transcriptionId: string, currentText: string) => void
  onSave: (transcriptionId: string) => void
  onCancel: () => void
  onDelete: (transcriptionId: string) => void
  onTextChange: (text: string) => void
  onAssignSpeaker: (
    speaker: string,
    currentPersonId: string | { _id: string; name: string; company?: string } | undefined,
    newPersonId: string
  ) => void
}

export function TranscriptionItem({
  segment,
  isEditing,
  editedText,
  isSaving,
  people,
  isAssigning,
  getSpeakerDotColor,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onTextChange,
  onAssignSpeaker,
}: TranscriptionItemProps) {
  const speakerName = typeof segment.personId === 'object' && segment.personId !== null
    ? segment.personId.name
    : segment.speaker
  const speakerDotColor = speakerName ? getSpeakerDotColor(speakerName) : ''

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {segment.speaker && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${speakerDotColor}`} />
              <Select
                value={typeof segment.personId === 'object' && segment.personId !== null ? segment.personId._id : ''}
                onValueChange={(newPersonId) => onAssignSpeaker(segment.speaker, segment.personId, newPersonId)}
                disabled={isAssigning}
              >
                <SelectTrigger className="h-7 w-auto min-w-[120px] text-sm font-medium gap-3 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50">
                  <SelectValue placeholder={segment.speaker}>
                    {typeof segment.personId === 'object' && segment.personId !== null
                      ? `${segment.personId.name}${segment.personId.company ? ` - ${segment.personId.company}` : ''}`
                      : segment.speaker}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {people.map((person) => (
                    <SelectItem key={person._id} value={person._id} className="pl-6">
                      <div className="flex items-center gap-2">
                        <span className="inline-block min-w-[100px]">{person.name}</span>
                        {person.company && (
                          <>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-muted-foreground">{person.company}</span>
                          </>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="add-new-person" className="pl-6 text-primary font-medium">
                    + Add Person
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {segment.startTime !== undefined && segment.endTime !== undefined && (
            <span className="text-muted-foreground">
              {formatTimeFromMs(segment.startTime)} - {formatTimeFromMs(segment.endTime)}
            </span>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(segment._id, segment.text)}
              aria-label="Edit transcription"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(segment._id)}
              aria-label="Delete transcription"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </Button>
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editedText}
            onChange={(e) => onTextChange(e.target.value)}
            className="min-h-[100px] text-sm"
            placeholder="Edit transcription text..."
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onSave(segment._id)}
              disabled={isSaving || !editedText.trim()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed">{segment.text}</p>
      )}
    </div>
  )
}
