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
  const handleClick = () => {
    console.log('Hello from Meno Web!')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Hello World</CardTitle>
          <CardDescription>
            Welcome to Meno Web - React + Vite + TypeScript + Tailwind + shadcn/ui
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This is a minimal frontend setup ready for development. The project includes:
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
          </ul>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={handleClick}>Click Me</Button>
          <Button variant="outline">Secondary Action</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default App
