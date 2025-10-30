import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
import { NewMeetingDialog } from '@/components/NewMeetingDialog'
import { UsageIndicator } from '@/components/UsageIndicator'
import { useProjectsContext } from '@/contexts/ProjectsContext'

interface TierLimits {
  monthlyDuration: number
  maxFileSize: number
}

interface Tier {
  _id: string
  name: string
  displayName: string
  limits: TierLimits
  features: string[]
}

interface User {
  _id: string
  email: string
  name: string
  avatar?: string
  currentMonthUsage: {
    duration: number
    lastReset: string
    month: number
    year: number
  }
  tier: Tier
}

interface SidebarProps {
  className?: string
  user: User | null
  onLogout: () => void
  onUsageRefresh: () => void
}

export function Sidebar({ className, user, onLogout, onUsageRefresh }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { projects } = useProjectsContext()

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [isNewMeetingDialogOpen, setIsNewMeetingDialogOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handleNewMeetingClick = () => {
    setIsProjectModalOpen(true)
  }

  const handleProjectSelect = (projectId: string) => {
    setIsProjectModalOpen(false)
    setSelectedProjectId(projectId)
    setIsNewMeetingDialogOpen(true)
  }

  const handleMeetingSuccess = (meetingId: string) => {
    setIsNewMeetingDialogOpen(false)
    navigate(`/projects/${selectedProjectId}/meetings/${meetingId}`)
  }

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside
        className={cn(
          'hidden md:flex h-screen flex-col border-r bg-card transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-60',
          className
        )}
      >
      {/* Sidebar Header */}
      <div className="flex h-14 items-center border-b px-4 justify-between">
        {!isCollapsed && <h1 className="text-base font-semibold">Meno</h1>}
        <button
          onClick={toggleSidebar}
          className={cn(
            "rounded-md p-1.5 hover:bg-accent transition-colors",
            isCollapsed && "mx-auto"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            location.pathname === '/'
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Home" : undefined}
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
          {!isCollapsed && <span>Home</span>}
        </Link>

        <Link
          to="/projects"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            location.pathname === '/projects'
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Projects" : undefined}
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
          {!isCollapsed && <span>Projects</span>}
        </Link>

        <Link
          to="/people"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            location.pathname === '/people'
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "People" : undefined}
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {!isCollapsed && <span>People</span>}
        </Link>
      </nav>

      {/* Usage Section */}
      {!isCollapsed && (
        <div className="border-t p-3">
          <div className="mb-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Monthly Usage</p>
            <UsageIndicator
              usage={user?.currentMonthUsage}
              showDetails={false}
              monthlyDurationLimit={user?.tier?.limits?.monthlyDuration}
            />
          </div>
        </div>
      )}

      {/* User Section */}
      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? user?.name : undefined}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
                {user?.name.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            {!isCollapsed && (
              <>
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
              </>
            )}
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

          {/* Floating Add Meeting Button - Absolutely centered */}
          <button
            onClick={handleNewMeetingClick}
            className="absolute left-1/2 -translate-x-1/2 -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="New Meeting"
            disabled={projects.length === 0}
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
          </button>

          {/* People */}
          <Link
            to="/people"
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:bg-accent min-h-[56px] flex-1",
              location.pathname === '/people' ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="People"
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>People</span>
          </Link>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground min-h-[56px] flex-1">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {user?.name.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
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

      {/* New Meeting Dialog */}
      {selectedProjectId && (
        <NewMeetingDialog
          open={isNewMeetingDialogOpen}
          onOpenChange={setIsNewMeetingDialogOpen}
          projectId={selectedProjectId}
          onSuccess={handleMeetingSuccess}
          usage={user?.currentMonthUsage}
          onUsageRefresh={onUsageRefresh}
        />
      )}
    </>
  )
}
