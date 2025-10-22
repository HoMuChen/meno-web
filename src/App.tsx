import { Sidebar } from '@/components/Sidebar'
import { LoginPage } from '@/pages/Login'
import { ProjectsPage } from '@/pages/Projects'
import { useAuth } from '@/hooks/useAuth'

function App() {
  const { isAuthenticated, user, login, logout } = useAuth()

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={login} />
  }

  // Main app content when authenticated
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar user={user} onLogout={logout} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <ProjectsPage />
      </main>
    </div>
  )
}

export default App
