import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bw_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor: handle 401 ────────────────────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('bw_token')
      localStorage.removeItem('bw_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client
