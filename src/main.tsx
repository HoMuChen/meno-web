import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'

const root = createRoot(document.getElementById('root')!)

// Only use StrictMode in development to avoid double-rendering in production
if (import.meta.env.DEV) {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} else {
  root.render(<App />)
}
