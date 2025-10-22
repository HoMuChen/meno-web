import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { LoginPage } from '@/pages/Login'
import { HomePage } from '@/pages/Home'
import { ProjectsPage } from '@/pages/Projects'
import { ProjectDetailPage } from '@/pages/ProjectDetail'
import { MeetingDetailsPage } from '@/pages/MeetingDetails'
import { useAuth } from '@/hooks/useAuth'

function App() {
  const { isAuthenticated, user, login, logout } = useAuth()

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={login} />
  }

  // Main app content when authenticated
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-background">
        {/* Sidebar - Desktop only, Mobile bottom nav included in Sidebar component */}
        <Sidebar user={user} onLogout={logout} />

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
    </BrowserRouter>
  )
}

export default App
