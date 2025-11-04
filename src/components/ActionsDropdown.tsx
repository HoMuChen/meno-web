import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface ActionMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: (e?: React.MouseEvent) => void
  className?: string
  separator?: boolean
}

export interface ActionsDropdownProps {
  actions: ActionMenuItem[]
  triggerClassName?: string
  contentClassName?: string
  align?: 'start' | 'center' | 'end'
  disabled?: boolean
  stopPropagation?: boolean
  'aria-label'?: string
}

export function ActionsDropdown({
  actions,
  triggerClassName,
  contentClassName,
  align = 'end',
  disabled = false,
  stopPropagation = false,
  'aria-label': ariaLabel = 'Actions menu',
}: ActionsDropdownProps) {
  const handleTriggerClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation()
    }
  }

  const handleContentClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation()
    }
  }

  const handleItemClick = (action: ActionMenuItem) => (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation()
    }
    action.onClick(e)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={triggerClassName || 'shrink-0 h-9 w-9 p-0'}
          disabled={disabled}
          onClick={handleTriggerClick}
          aria-label={ariaLabel}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={contentClassName}
        onClick={handleContentClick}
      >
        {actions.map((action, index) => (
          <React.Fragment key={index}>
            {action.separator && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className={action.className}
              onClick={handleItemClick(action)}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
