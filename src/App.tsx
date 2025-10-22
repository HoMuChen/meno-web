import { Sidebar } from '@/components/Sidebar'
import { LoginPage } from '@/pages/Login'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function App() {
  const { isAuthenticated, user, login, logout } = useAuth()

  const handleClick = () => {
    console.log('Hello from Meno Web!')
  }

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
        <div className="container mx-auto p-6">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Welcome, {user?.name}!</CardTitle>
              <CardDescription>
                You're now signed in to Meno Web
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is your dashboard. The application includes:
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>React 18 with TypeScript</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Vite for fast development</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Tailwind CSS with slate theme</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>shadcn/ui components</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>API client with environment config</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Authentication with JWT</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Sidebar navigation</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={handleClick}>Click Me</Button>
              <Button variant="outline">Secondary Action</Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default App
