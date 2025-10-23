import { useState, useEffect } from 'react'
import {
  getAuthToken,
  getStoredUser,
  setAuthToken,
  setStoredUser,
  clearAuthData,
} from '@/lib/auth'

interface User {
  _id: string
  email: string
  name: string
  avatar?: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
  })

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const token = getAuthToken()
    const user = getStoredUser<User>()

    if (token && user) {
      setAuthState({
        isAuthenticated: true,
        user,
        token,
      })
    } else {
      // Invalid stored data, clear it
      clearAuthData()
    }
  }, [])

  const login = async (token: string, user: User) => {
    setAuthToken(token)
    setStoredUser(user)
    setAuthState({
      isAuthenticated: true,
      user,
      token,
    })
  }

  const logout = () => {
    clearAuthData()
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
    })
  }

  return {
    ...authState,
    login,
    logout,
  }
}
