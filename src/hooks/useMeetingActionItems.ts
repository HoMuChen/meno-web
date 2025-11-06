import { useState, useCallback, useRef } from 'react'
import { generateActionItems, fetchActionItems, updateActionItem, deleteActionItem } from '@/lib/api'
import { ApiException } from '@/lib/api'
import type { ActionItem, ActionItemsResponse } from '@/types/meeting'

interface UseMeetingActionItemsOptions {
  projectId: string | undefined
  meetingId: string | undefined
  meetingTitle?: string
  onGenerateStart?: () => void
}

export function useMeetingActionItems({
  projectId,
  meetingId,
  meetingTitle,
  onGenerateStart,
}: UseMeetingActionItemsOptions) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [isLoadingActionItems, setIsLoadingActionItems] = useState(false)
  const [isGeneratingActionItems, setIsGeneratingActionItems] = useState(false)
  const [actionItemsError, setActionItemsError] = useState<string | null>(null)
  const actionItemsLoadedRef = useRef(false)
  const [deletingActionItemId, setDeletingActionItemId] = useState<string | null>(null)
  const [showDeleteActionItemDialog, setShowDeleteActionItemDialog] = useState(false)

  // Generate action items
  const handleGenerateActionItems = useCallback(async () => {
    if (!projectId || !meetingId) return

    try {
      setIsGeneratingActionItems(true)
      setActionItemsError(null)

      await generateActionItems(projectId, meetingId)

      // Notify parent to start polling for updates
      if (onGenerateStart) {
        onGenerateStart()
      }
    } catch (err) {
      console.error('Failed to generate action items:', err)
      if (err instanceof ApiException) {
        setActionItemsError(err.message || 'Failed to generate action items')
      } else {
        setActionItemsError('Unable to generate action items')
      }
      setIsGeneratingActionItems(false)
    }
  }, [projectId, meetingId, onGenerateStart])

  // Fetch action items
  const fetchActionItemsData = useCallback(async () => {
    if (!projectId || !meetingId || actionItemsLoadedRef.current) return

    try {
      setIsLoadingActionItems(true)
      setActionItemsError(null)

      const response = await fetchActionItems(projectId, meetingId) as ActionItemsResponse

      if (response.actionItems) {
        // Sort action items: pending first, completed last
        const sortedItems = response.actionItems.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1
          if (a.status !== 'completed' && b.status === 'completed') return -1
          return 0
        })
        setActionItems(sortedItems)
        actionItemsLoadedRef.current = true
      }
    } catch (err) {
      console.error('Failed to fetch action items:', err)
      if (err instanceof ApiException) {
        setActionItemsError(err.message || 'Failed to load action items')
      } else {
        setActionItemsError('Unable to load action items')
      }
    } finally {
      setIsLoadingActionItems(false)
    }
  }, [projectId, meetingId])

  // Handle update action item status
  const handleUpdateActionItemStatus = useCallback(async (
    actionItemId: string,
    statusProjectId: string,
    statusMeetingId: string,
    newStatus: 'pending' | 'completed'
  ) => {
    try {
      // Optimistic update - move to bottom if completed, to top if pending
      setActionItems(prev => {
        const updated = prev.map(item =>
          item._id === actionItemId
            ? { ...item, status: newStatus }
            : item
        )
        // Sort: pending items first, completed items last
        return updated.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1
          if (a.status !== 'completed' && b.status === 'completed') return -1
          return 0
        })
      })

      await updateActionItem(statusProjectId, statusMeetingId, actionItemId, { status: newStatus })
    } catch (err) {
      // Revert optimistic update on error
      if (projectId && meetingId) {
        const response = await fetchActionItems(projectId, meetingId) as ActionItemsResponse
        if (response.actionItems) {
          const sortedItems = response.actionItems.sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1
            if (a.status !== 'completed' && b.status === 'completed') return -1
            return 0
          })
          setActionItems(sortedItems)
        }
      }

      if (err instanceof ApiException) {
        setActionItemsError(err.message || 'Failed to update action item')
      } else {
        setActionItemsError('Unable to update action item')
      }
    }
  }, [projectId, meetingId])

  // Handle delete action item
  const handleDeleteActionItem = useCallback(async () => {
    if (!projectId || !meetingId || !deletingActionItemId) return

    try {
      // Optimistic update
      setActionItems(prev =>
        prev.filter(item => item._id !== deletingActionItemId)
      )

      await deleteActionItem(projectId, meetingId, deletingActionItemId)

      setShowDeleteActionItemDialog(false)
      setDeletingActionItemId(null)
    } catch (err) {
      // Revert optimistic update on error
      const response = await fetchActionItems(projectId, meetingId) as ActionItemsResponse
      if (response.actionItems) {
        const sortedItems = response.actionItems.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1
          if (a.status !== 'completed' && b.status === 'completed') return -1
          return 0
        })
        setActionItems(sortedItems)
      }

      if (err instanceof ApiException) {
        setActionItemsError(err.message || 'Failed to delete action item')
      } else {
        setActionItemsError('Unable to delete action item')
      }
      setShowDeleteActionItemDialog(false)
      setDeletingActionItemId(null)
    }
  }, [projectId, meetingId, deletingActionItemId])

  // Handle show delete action item confirmation
  const handleShowDeleteActionItem = useCallback((actionItemId: string) => {
    setDeletingActionItemId(actionItemId)
    setShowDeleteActionItemDialog(true)
  }, [])

  // Handle save action item edits
  const handleSaveActionItemEdit = useCallback(async (
    actionItemId: string,
    editProjectId: string,
    editMeetingId: string,
    updates: { task: string; context: string; dueDate?: string }
  ) => {
    try {
      // Optimistic update
      setActionItems(prev =>
        prev.map(item =>
          item._id === actionItemId
            ? { ...item, ...updates }
            : item
        )
      )

      await updateActionItem(editProjectId, editMeetingId, actionItemId, updates)
    } catch (err) {
      // Revert optimistic update on error
      if (projectId && meetingId) {
        const response = await fetchActionItems(projectId, meetingId) as ActionItemsResponse
        if (response.actionItems) {
          const sortedItems = response.actionItems.sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1
            if (a.status !== 'completed' && b.status === 'completed') return -1
            return 0
          })
          setActionItems(sortedItems)
        }
      }

      if (err instanceof ApiException) {
        setActionItemsError(err.message || 'Failed to update action item')
      } else {
        setActionItemsError('Unable to update action item')
      }
    }
  }, [projectId, meetingId])

  // Download action items as text
  const downloadActionItemsAsTxt = useCallback(() => {
    if (actionItems.length === 0) return

    let content = `${meetingTitle || 'Meeting'} - Action Items\n\n`
    actionItems.forEach((item, index) => {
      const displayName = item.personId
        ? typeof item.personId === 'object'
          ? item.personId.company
            ? `${item.personId.name} - ${item.personId.company}`
            : item.personId.name
          : item.assignee
        : item.assignee

      content += `${index + 1}. ${item.task}\n`
      content += `   Assignee: ${displayName}\n`
      content += `   Status: ${item.status === 'in_progress' ? 'In Progress' : item.status === 'pending' ? 'Pending' : 'Completed'}\n`
      if (item.context) {
        content += `   Context: ${item.context}\n`
      }
      if (item.dueDate) {
        content += `   Due Date: ${new Date(item.dueDate).toLocaleString()}\n`
      }
      content += '\n'
    })

    const fileName = `${meetingTitle || 'meeting'}-action-items.txt`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [actionItems, meetingTitle])

  // Download action items as markdown
  const downloadActionItemsAsMarkdown = useCallback(() => {
    if (actionItems.length === 0) return

    let content = `# ${meetingTitle || 'Meeting'} - Action Items\n\n`
    actionItems.forEach((item, index) => {
      const displayName = item.personId
        ? typeof item.personId === 'object'
          ? item.personId.company
            ? `${item.personId.name} - ${item.personId.company}`
            : item.personId.name
          : item.assignee
        : item.assignee

      const statusIcon = item.status === 'completed' ? '✅' : item.status === 'in_progress' ? '🔄' : '⏳'
      content += `${index + 1}. **${item.task}** ${statusIcon}\n`
      content += `   - **Assignee:** ${displayName}\n`
      content += `   - **Status:** ${item.status === 'in_progress' ? 'In Progress' : item.status === 'pending' ? 'Pending' : 'Completed'}\n`
      if (item.context) {
        content += `   - **Context:** ${item.context}\n`
      }
      if (item.dueDate) {
        content += `   - **Due Date:** ${new Date(item.dueDate).toLocaleString()}\n`
      }
      content += '\n'
    })

    const fileName = `${meetingTitle || 'meeting'}-action-items.md`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [actionItems, meetingTitle])

  // Stop generating state when called
  const stopGenerating = useCallback(() => {
    setIsGeneratingActionItems(false)
  }, [])

  return {
    // State
    actionItems,
    isLoadingActionItems,
    isGeneratingActionItems,
    actionItemsError,
    actionItemsLoadedRef,
    deletingActionItemId,
    showDeleteActionItemDialog,

    // Actions
    handleGenerateActionItems,
    fetchActionItemsData,
    handleUpdateActionItemStatus,
    handleDeleteActionItem,
    handleShowDeleteActionItem,
    handleSaveActionItemEdit,
    downloadActionItemsAsTxt,
    downloadActionItemsAsMarkdown,
    stopGenerating,
    setShowDeleteActionItemDialog,
    setDeletingActionItemId,
  }
}
