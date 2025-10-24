import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { LoginPage } from '@/pages/Login'
import { OAuthCallback } from '@/pages/OAuthCallback'
import { HomePage } from '@/pages/Home'
import { ProjectsPage } from '@/pages/Projects'
import { ProjectDetailPage } from '@/pages/ProjectDetail'
import { MeetingDetailsPage } from '@/pages/MeetingDetails'
import { useAuth } from '@/hooks/useAuth'

function App() {
  const { isAuthenticated, user, login, logout, isLoading, refreshUser } = useAuth()

  // Show loading state while validating token
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - accessible without authentication */}
        <Route path="/auth/callback" element={<OAuthCallback onLoginSuccess={login} />} />

        {/* Protected routes - require authentication */}
        <Route
          path="*"
          element={
            isAuthenticated ? (
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
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            ) : (
              <LoginPage onLoginSuccess={login} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
