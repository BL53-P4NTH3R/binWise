import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api'
import { decodeJwt } from '../utils'
import type { AuthUser } from '../types'

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('bw_user')
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function useAuth() {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(getStoredUser)
  const [loading, setLoading] = useState(false)

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        const { data } = await authApi.login(email, password)
        const { access_token } = data

        // Store token
        localStorage.setItem('bw_token', access_token)

        // Decode JWT payload
        const payload = decodeJwt(access_token)
        const authUser: AuthUser = {
          user_id: (payload.sub as string) || (payload.user_id as string) || '',
          role: (payload.role as AuthUser['role']) || 'driver',
          email: (payload.email as string) || email,
          full_name: (payload.full_name as string) || '',
        }

        localStorage.setItem('bw_user', JSON.stringify(authUser))
        setUser(authUser)

        // Redirect by role
        if (authUser.role === 'admin') {
          navigate('/dashboard')
        } else {
          navigate('/driver')
        }
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Invalid credentials. Please try again.'
        toast.error(message)
      } finally {
        setLoading(false)
      }
    },
    [navigate]
  )

  const logout = useCallback(() => {
    localStorage.removeItem('bw_token')
    localStorage.removeItem('bw_user')
    setUser(null)
    navigate('/login')
  }, [navigate])

  return { user, loading, login, logout }
}
