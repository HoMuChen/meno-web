import { useState, useEffect, useCallback } from 'react'
import {
  getAuthToken,
  getStoredUser,
  setAuthToken,
  setStoredUser,
  clearAuthData,
} from '@/lib/auth'
import api, { ApiException } from '@/lib/api'
import type { CurrentMonthUsage } from '@/types/usage'

interface User {
  _id: string
  email: string
  name: string
  avatar?: string
  currentMonthUsage: CurrentMonthUsage
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  isLoading: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
  })

  // Validate token and initialize auth state on mount
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
  }, [])

  const login = async (token: string, user: User) => {
    setAuthToken(token)
    setStoredUser(user)
    setAuthState({
      isAuthenticated: true,
      user,
      token,
      isLoading: false,
    })
  }

  const logout = () => {
    clearAuthData()
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
    })
  }

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

  return {
    ...authState,
    login,
    logout,
    refreshUser,
  }
}
