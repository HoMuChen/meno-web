import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

interface OAuthCallbackProps {
  onLoginSuccess: (accessToken: string, user: User) => Promise<void>
}

export function OAuthCallback({ onLoginSuccess }: OAuthCallbackProps) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract token from URL query parameter
        const accessToken = searchParams.get('token')

        if (!accessToken) {
          setError('No authentication token received')
          setIsProcessing(false)
          return
        }

        // Store token to make authenticated request
        setAuthToken(accessToken)

        // Fetch user data using the token
        const response = await api.get<{
          success: boolean
          data: User
        }>('/api/users/me')

        if (response.success && response.data) {
          // Call the login success callback
          await onLoginSuccess(accessToken, response.data)

          // Redirect to homepage
          navigate('/', { replace: true })
        } else {
          throw new Error('Failed to fetch user data')
        }
      } catch (err) {
        console.error('OAuth callback error:', err)

        // Note: 401 errors are now handled by global interceptor
        // Only handle other errors here
        if (err instanceof ApiException) {
          setError(err.message || 'Failed to complete authentication')
        } else {
          setError('An unexpected error occurred during authentication')
        }
        setIsProcessing(false)
      }
    }

    handleCallback()
  }, [searchParams, navigate, onLoginSuccess])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isProcessing ? 'Signing you in...' : 'Authentication Error'}
          </CardTitle>
          <CardDescription>
            {isProcessing
              ? 'Please wait while we complete your authentication'
              : 'There was a problem signing you in'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProcessing ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Back to Login
              </button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
