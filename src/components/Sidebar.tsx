import { useState, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useProjects } from '@/hooks/useProjects'
import api, { ApiException } from '@/lib/api'
import type { CreateMeetingResponse } from '@/types/meeting'

interface User {
  _id: string
  email: string
  name: string
  avatar?: string
}

interface SidebarProps {
  className?: string
  user: User | null
  onLogout: () => void
}

export function Sidebar({ className, user, onLogout }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { projects } = useProjects()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [actionType, setActionType] = useState<'upload' | 'record' | null>(null)

  const ALLOWED_AUDIO_TYPES = [
    'audio/mpeg', 'audio/wav', 'audio/x-m4a',
    'audio/m4a', 'audio/webm', 'audio/ogg',
  ]
  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

  const generateMeetingTitle = () => {
    const now = new Date()
    return `Meeting - ${now.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })} ${now.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    })}`
  }

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload MP3, WAV, M4A, WebM, or OGG audio files.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 100MB limit.'
    }
    return null
  }

  const handleUploadClick = () => {
    setActionType('upload')
    setIsAddMenuOpen(false)
    setIsProjectModalOpen(true)
  }

  const handleRecordClick = () => {
    setActionType('record')
    setIsAddMenuOpen(false)
    alert('Audio recording feature coming soon!')
  }

  const handleProjectSelect = (projectId: string) => {
    setIsProjectModalOpen(false)
    if (actionType === 'upload') {
      fileInputRef.current?.setAttribute('data-project-id', projectId)
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const projectId = e.target.getAttribute('data-project-id')

    if (!file || !projectId) return

    const validationError = validateFile(file)
    if (validationError) {
      alert(validationError)
      return
    }

    await uploadMeeting(file, projectId)
  }

  const uploadMeeting = async (file: File, projectId: string) => {
    try {
      setIsUploading(true)

      const formData = new FormData()
      formData.append('audioFile', file)
      formData.append('title', generateMeetingTitle())
      formData.append('recordingType', 'upload')

      const response = await api.postFormData<CreateMeetingResponse>(
        `/api/projects/${projectId}/meetings`,
        formData
      )

      if (response.success && response.data) {
        navigate(`/projects/${projectId}/meetings/${response.data._id}`)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        alert(err.message || 'Failed to upload meeting')
      } else {
        alert('Unable to connect to the server')
      }
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside
        className={cn(
          'hidden md:flex h-screen w-60 flex-col border-r bg-card',
          className
        )}
      >
      {/* Sidebar Header */}
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-base font-semibold">Meno</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            location.pathname === '/'
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Home
        </Link>

        <Link
          to="/projects"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            location.pathname === '/projects'
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Projects
        </Link>
      </nav>

      {/* User Section */}
      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
              {user?.name.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden text-left">
              <p className="truncate text-sm font-medium">{user?.name}</p>
            </div>
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
              className="text-muted-foreground"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" side="top">
            <DropdownMenuLabel className="font-normal">
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>
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
                className="mr-2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>

      {/* Mobile Bottom Navigation - Visible only on mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
        <div className="relative flex items-center justify-around px-2 py-2">
          {/* Home */}
          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:bg-accent min-h-[56px] flex-1",
              location.pathname === '/' ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Home"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Home</span>
          </Link>

          {/* Projects */}
          <Link
            to="/projects"
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:bg-accent min-h-[56px] flex-1",
              location.pathname === '/projects' ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Projects"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span>Projects</span>
          </Link>

          {/* Floating Add Meeting Button - Center */}
          <div className="flex-1 flex justify-center">
            <DropdownMenu open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
              <DropdownMenuTrigger
                className="absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
                aria-label="Add Meeting"
                disabled={isUploading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 mb-2" align="center" side="top">
                <DropdownMenuItem
                  onClick={handleUploadClick}
                  disabled={projects.length === 0}
                >
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
                    className="mr-2"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  Upload Audio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRecordClick} disabled>
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
                    className="mr-2"
                    aria-hidden="true"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  Record Audio
                  <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Settings */}
          <button
            className="flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground min-h-[56px] flex-1"
            aria-label="Settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Settings</span>
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground min-h-[56px] flex-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {user?.name.charAt(0).toUpperCase() || 'U'}
              </div>
              <span>Account</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end" side="top">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
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
                  className="mr-2"
                  aria-hidden="true"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
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
                  className="mr-2"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Project Selection Modal */}
      <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
        <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none p-0">
          <div className="flex flex-col items-center gap-3 py-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              Select Project
            </h2>
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              {projects.map((project) => (
                <Button
                  key={project._id}
                  variant="outline"
                  size="default"
                  className="justify-center py-3.5 px-6 text-center bg-white text-foreground shadow-lg hover:shadow-xl hover:bg-white transition-all duration-150 border-0 rounded-xl font-semibold text-sm"
                  onClick={() => handleProjectSelect(project._id)}
                >
                  {project.name}
                </Button>
              ))}

              {/* Create New Project Button */}
              <Button
                variant="outline"
                size="default"
                className="justify-center items-center gap-1.5 py-3.5 px-6 text-center bg-white/10 text-white border border-white/20 shadow-lg hover:shadow-xl hover:bg-white/15 transition-all duration-150 rounded-xl font-medium text-sm"
                onClick={() => {
                  setIsProjectModalOpen(false)
                  navigate('/projects')
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                <span>Create New Project</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/x-m4a,audio/m4a,audio/webm,audio/ogg"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload audio file"
      />
    </>
  )
}
