import { useState, useEffect } from 'react'

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
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('user')

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        setAuthState({
          isAuthenticated: true,
          user,
          token,
        })
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
      }
    }
  }, [])

  const login = (token: string, user: User) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setAuthState({
      isAuthenticated: true,
      user,
      token,
    })
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
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
