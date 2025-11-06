import { useState, useCallback } from 'react'
import { assignSpeakerToPerson, reassignPersonTranscriptions, ApiException } from '@/lib/api'

interface UseSpeakerAssignmentOptions {
  meetingId: string | undefined
  onAssignmentComplete?: () => void
  onError?: (error: string) => void
}

interface PendingAssignment {
  speaker: string
  currentPersonId: string | { _id: string; name: string; company?: string } | undefined
  newPersonId: string
}

interface PendingSpeakerForNewPerson {
  speaker: string
  currentPersonId: string | { _id: string; name: string; company?: string } | undefined
}

export function useSpeakerAssignment({
  meetingId,
  onAssignmentComplete,
  onError,
}: UseSpeakerAssignmentOptions) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [showAssignConfirmDialog, setShowAssignConfirmDialog] = useState(false)
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null)

  const [showAddPersonDialog, setShowAddPersonDialog] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonCompany, setNewPersonCompany] = useState('')
  const [isCreatingPerson, setIsCreatingPerson] = useState(false)
  const [pendingSpeakerForNewPerson, setPendingSpeakerForNewPerson] = useState<PendingSpeakerForNewPerson | null>(null)

  // Handle assign speaker to person - show confirmation dialog or add person dialog
  const handleAssignSpeaker = useCallback((
    speaker: string,
    currentPersonId: string | { _id: string; name: string; company?: string } | undefined,
    newPersonId: string
  ) => {
    // Check if user wants to add a new person
    if (newPersonId === 'add-new-person') {
      setPendingSpeakerForNewPerson({ speaker, currentPersonId })
      setShowAddPersonDialog(true)
      return
    }

    setPendingAssignment({ speaker, currentPersonId, newPersonId })
    setShowAssignConfirmDialog(true)
  }, [])

  // Confirm and execute speaker assignment
  const confirmAssignment = useCallback(async () => {
    if (!meetingId || !pendingAssignment) return

    setShowAssignConfirmDialog(false)
    setIsAssigning(true)
    try {
      let response

      // Check if already assigned to a person
      if (pendingAssignment.currentPersonId && typeof pendingAssignment.currentPersonId === 'object') {
        // Reassign from current person to new person
        response = await reassignPersonTranscriptions(meetingId, pendingAssignment.currentPersonId._id, pendingAssignment.newPersonId)
        console.log(`Reassigned transcriptions from '${pendingAssignment.currentPersonId.name}' to new person (${response.data.modifiedCount} transcriptions updated)`)
      } else {
        // Assign speaker to person for the first time
        response = await assignSpeakerToPerson(meetingId, pendingAssignment.speaker, pendingAssignment.newPersonId)
        console.log(`Assigned '${pendingAssignment.speaker}' to person (${response.data.modifiedCount} transcriptions updated)`)
      }

      if (response.success) {
        // Notify parent to refresh transcriptions
        if (onAssignmentComplete) {
          onAssignmentComplete()
        }
      }
    } catch (err) {
      if (err instanceof ApiException) {
        if (onError) {
          onError(err.message || 'Failed to assign speaker to person')
        }
      } else {
        if (onError) {
          onError('Unable to connect to the server')
        }
      }
    } finally {
      setIsAssigning(false)
      setPendingAssignment(null)
    }
  }, [meetingId, pendingAssignment, onAssignmentComplete, onError])

  // Handle create person and assign speaker
  const handleCreatePersonAndAssign = useCallback(async (
    createPersonFn: (data: { name: string; company?: string }) => Promise<{ _id: string; name: string; company?: string } | null>
  ) => {
    if (!meetingId || !pendingSpeakerForNewPerson || !newPersonName.trim()) return

    setIsCreatingPerson(true)
    try {
      // Create new person
      const newPerson = await createPersonFn({
        name: newPersonName.trim(),
        company: newPersonCompany.trim() || undefined,
      })

      if (!newPerson) {
        if (onError) {
          onError('Failed to create person')
        }
        return
      }

      // Close add person dialog
      setShowAddPersonDialog(false)
      setNewPersonName('')
      setNewPersonCompany('')

      // Now assign the speaker to the newly created person
      setIsAssigning(true)
      let response

      // Check if already assigned to a person
      if (pendingSpeakerForNewPerson.currentPersonId && typeof pendingSpeakerForNewPerson.currentPersonId === 'object') {
        // Reassign from current person to new person
        response = await reassignPersonTranscriptions(
          meetingId,
          pendingSpeakerForNewPerson.currentPersonId._id,
          newPerson._id
        )
        console.log(`Reassigned transcriptions from '${pendingSpeakerForNewPerson.currentPersonId.name}' to '${newPerson.name}' (${response.data.modifiedCount} transcriptions updated)`)
      } else {
        // Assign speaker to person for the first time
        response = await assignSpeakerToPerson(
          meetingId,
          pendingSpeakerForNewPerson.speaker,
          newPerson._id
        )
        console.log(`Assigned '${pendingSpeakerForNewPerson.speaker}' to '${newPerson.name}' (${response.data.modifiedCount} transcriptions updated)`)
      }

      if (response.success) {
        // Notify parent to refresh transcriptions
        if (onAssignmentComplete) {
          onAssignmentComplete()
        }
      }
    } catch (err) {
      if (err instanceof ApiException) {
        if (onError) {
          onError(err.message || 'Failed to create person and assign speaker')
        }
      } else {
        if (onError) {
          onError('Unable to connect to the server')
        }
      }
    } finally {
      setIsCreatingPerson(false)
      setIsAssigning(false)
      setPendingSpeakerForNewPerson(null)
    }
  }, [meetingId, pendingSpeakerForNewPerson, newPersonName, newPersonCompany, onAssignmentComplete, onError])

  // Cancel assignment
  const cancelAssignment = useCallback(() => {
    setShowAssignConfirmDialog(false)
    setPendingAssignment(null)
  }, [])

  // Cancel add person
  const cancelAddPerson = useCallback(() => {
    setShowAddPersonDialog(false)
    setNewPersonName('')
    setNewPersonCompany('')
    setPendingSpeakerForNewPerson(null)
  }, [])

  return {
    // State
    isAssigning,
    showAssignConfirmDialog,
    pendingAssignment,
    showAddPersonDialog,
    newPersonName,
    newPersonCompany,
    isCreatingPerson,
    pendingSpeakerForNewPerson,

    // Actions
    handleAssignSpeaker,
    confirmAssignment,
    handleCreatePersonAndAssign,
    cancelAssignment,
    cancelAddPerson,
    setNewPersonName,
    setNewPersonCompany,
  }
}
