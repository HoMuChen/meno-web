/**
 * Authentication Token Management
 *
 * Centralized token storage and retrieval for API authentication
 * Separates storage concerns from API logic
 */

const AUTH_TOKEN_KEY = 'auth_token'
const USER_KEY = 'user'
const HAS_DEFAULT_PROJECT_KEY = 'has_default_project'

/**
 * Get authentication token from localStorage
 * @returns Auth token string or null if not found
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

/**
 * Set authentication token in localStorage
 * @param token - JWT token string
 */
export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

/**
 * Remove authentication token from localStorage
 */
export function removeAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

/**
 * Get user data from localStorage
 * @returns Parsed user object or null
 */
export function getStoredUser<T>(): T | null {
  const userStr = localStorage.getItem(USER_KEY)
  if (!userStr) return null

  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Set user data in localStorage
 * @param user - User object to store
 */
export function setStoredUser<T>(user: T): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * Remove user data from localStorage
 */
export function removeStoredUser(): void {
  localStorage.removeItem(USER_KEY)
}

/**
 * Check if default project flag is set
 * @returns true if default project exists
 */
export function hasDefaultProject(): boolean {
  return localStorage.getItem(HAS_DEFAULT_PROJECT_KEY) === 'true'
}

/**
 * Mark that default project has been created
 */
export function setDefaultProjectFlag(): void {
  localStorage.setItem(HAS_DEFAULT_PROJECT_KEY, 'true')
}

/**
 * Remove default project flag
 */
export function removeDefaultProjectFlag(): void {
  localStorage.removeItem(HAS_DEFAULT_PROJECT_KEY)
}

/**
 * Clear all authentication data from localStorage
 */
export function clearAuthData(): void {
  removeAuthToken()
  removeStoredUser()
  removeDefaultProjectFlag()
}
