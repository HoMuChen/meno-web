import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { LoginPage } from '@/pages/Login'
import { HomePage } from '@/pages/Home'
import { ProjectsPage } from '@/pages/Projects'
import { ProjectDetailPage } from '@/pages/ProjectDetail'
import { MeetingDetailsPage } from '@/pages/MeetingDetails'
import { PeoplePage } from '@/pages/People'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProjectsProvider } from '@/contexts/ProjectsContext'
import { setAuthToken } from '@/lib/auth'
import api, { ApiException } from '@/lib/api'
import type { CurrentMonthUsage } from '@/types/usage'

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
  currentMonthUsage: CurrentMonthUsage
  tier: Tier
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}

function AppContent() {
  const { isAuthenticated, user, login, logout, isLoading, refreshUser } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isProcessingToken, setIsProcessingToken] = useState(false)

  // Handle OAuth token from query parameter
  useEffect(() => {
    const handleOAuthToken = async () => {
      const token = searchParams.get('token')

      if (!token) {
        return
      }

      // Already authenticated, just clean up URL
      if (isAuthenticated) {
        navigate('/', { replace: true })
        return
      }

      setIsProcessingToken(true)

      try {
        // Temporarily store token to make authenticated request
        setAuthToken(token)

        // Fetch user data using the token
        const response = await api.get<{
          success: boolean
          data: User
        }>('/api/users/me')

        if (response.success && response.data) {
          // Call the login success callback
          await login(token, response.data)

          // Clean up URL by removing token parameter
          navigate('/', { replace: true })
        } else {
          throw new Error('Failed to fetch user data')
        }
      } catch (err) {
        console.error('OAuth token processing error:', err)

        if (err instanceof ApiException) {
          if (err.status === 401) {
            setAuthError('Invalid or expired authentication token')
          } else {
            setAuthError(err.message || 'Failed to complete authentication')
          }
        } else {
          setAuthError('An unexpected error occurred during authentication')
        }

        // Clean up URL even on error
        navigate('/', { replace: true })
      } finally {
        setIsProcessingToken(false)
      }
    }

    handleOAuthToken()
  }, [searchParams, navigate, login, isAuthenticated])

  // Show loading state while validating token or processing OAuth
  if (isLoading || isProcessingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            {isProcessingToken ? 'Signing you in...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Show auth error if present
  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Authentication Error</h2>
            <p className="text-sm text-muted-foreground">There was a problem signing you in</p>
          </div>
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {authError}
          </div>
          <button
            onClick={() => {
              setAuthError(null)
              navigate('/', { replace: true })
            }}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <ProjectsProvider>
              <div className="flex h-screen bg-background">
                {/* Sidebar - Desktop only, Mobile bottom nav included in Sidebar component */}
                <Sidebar user={user} onLogout={logout} onUsageRefresh={refreshUser} />

                {/* Main Content - Adjusted for mobile bottom navigation */}
                <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                    <Route path="/projects/:projectId/meetings/:meetingId" element={<MeetingDetailsPage />} />
                    <Route path="/people" element={<PeoplePage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </ProjectsProvider>
          ) : (
            <LoginPage onLoginSuccess={login} />
          )
        }
      />
    </Routes>
  )
}

export default App
