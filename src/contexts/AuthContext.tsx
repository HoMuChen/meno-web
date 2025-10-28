import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import {
  getAuthToken,
  setAuthToken,
  setStoredUser,
  clearAuthData,
} from '@/lib/auth'
import api from '@/lib/api'
import type { CurrentMonthUsage } from '@/types/usage'

interface TierLimits {
  monthlyDuration: number // in seconds
  maxFileSize: number // in bytes
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

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  updateUsageOptimistically: (durationInSeconds: number) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean
    user: User | null
    token: string | null
    isLoading: boolean
  }>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
  })

  // Validate token and initialize auth state on mount - runs only once
  useEffect(() => {
    const validateToken = async () => {
      const token = getAuthToken()

      // No token stored, user needs to login
      if (!token) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
        })
        return
      }

      try {
        // Validate token by fetching current user data
        const response = await api.get<{
          success: boolean
          data: User
        }>('/api/users/me')

        if (response.success && response.data) {
          // Token is valid, update stored user data and set authenticated
          setStoredUser(response.data)
          setAuthState({
            isAuthenticated: true,
            user: response.data,
            token,
            isLoading: false,
          })
        } else {
          // Unexpected response, clear auth
          clearAuthData()
          setAuthState({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
          })
        }
      } catch (error) {
        // Token invalid or network error, clear auth data
        console.error('Token validation failed:', error)
        clearAuthData()
        setAuthState({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
        })
      }
    }

    validateToken()
  }, []) // Empty dependency array - only runs once on mount

  const login = useCallback(async (token: string, user: User) => {
    setAuthToken(token)
    setStoredUser(user)
    setAuthState({
      isAuthenticated: true,
      user,
      token,
      isLoading: false,
    })
  }, [])

  const logout = useCallback(() => {
    clearAuthData()
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
    })
  }, [])

  const refreshUser = useCallback(async () => {
    const token = getAuthToken()
    if (!token) return

    try {
      const response = await api.get<{
        success: boolean
        data: User
      }>('/api/users/me')

      if (response.success && response.data) {
        setStoredUser(response.data)
        setAuthState(prev => ({
          ...prev,
          user: response.data,
        }))
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error)
    }
  }, [])

  const updateUsageOptimistically = useCallback((durationInSeconds: number) => {
    setAuthState(prev => {
      if (!prev.user) return prev

      return {
        ...prev,
        user: {
          ...prev.user,
          currentMonthUsage: {
            ...prev.user.currentMonthUsage,
            duration: prev.user.currentMonthUsage.duration + durationInSeconds,
          },
        },
      }
    })
  }, [])

  const value: AuthContextType = {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    token: authState.token,
    isLoading: authState.isLoading,
    login,
    logout,
    refreshUser,
    updateUsageOptimistically,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
