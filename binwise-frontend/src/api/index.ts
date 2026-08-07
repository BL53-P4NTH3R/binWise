import client from './client'
import type {
  Alert,
  AlertSettings,
  AlertSettingsUpdate,
  BinCreate,
  BinLive,
  BinRead,
  BinSummary,
  BinUpdate,
  FillTrend,
  RouteRead,
  TripComparison,
  Token,
  User,
  UserCreate,
  Zone,
} from '../types'

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    client.post<Token>('/auth/login', { email, password }),

  forgotPassword: (email: string) =>
    client.post<{ message: string }>('/auth/forgot-password', { email }),
}

// ─── Bins ────────────────────────────────────────────────────────────────────

export const binsApi = {
  getLive: () =>
    client.get<BinLive[]>('/bins/live'),

  getSummary: () =>
    client.get<BinSummary>('/bins/summary'),

  getAll: () =>
    client.get<BinRead[]>('/bins'),

  getOne: (id: string) =>
    client.get<BinRead>(`/bins/${id}`),

  create: (data: BinCreate) =>
    client.post<BinRead>('/bins', data),

  update: (id: string, data: BinUpdate) =>
    client.patch<BinRead>(`/bins/${id}`, data),

  remove: (id: string) =>
    client.delete<BinRead>(`/bins/${id}`),
}

// ─── Zones ───────────────────────────────────────────────────────────────────

export const zonesApi = {
  getAll: () =>
    client.get<Zone[]>('/zones'),
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export const routesApi = {
  generate: (threshold_pct: number) =>
    client.post<RouteRead>('/routes/generate', { threshold_pct }),

  getAll: () =>
    client.get<RouteRead[]>('/routes'),

  getOne: (id: string) =>
    client.get<RouteRead>(`/routes/${id}`),

  assignDriver: (id: string, driver_id: string) =>
    client.patch<RouteRead>(`/routes/${id}/assign`, { driver_id }),

  collectBin: (routeId: string, binId: string) =>
    client.post<RouteRead>(`/routes/${routeId}/collect/${binId}`),
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export const alertsApi = {
  getAll: (status?: 'open' | 'resolved' | 'all') =>
    client.get<Alert[]>('/alerts', { params: status ? { status } : {} }),

  resolve: (id: string) =>
    client.patch<Alert>(`/alerts/${id}/resolve`),

  getSettings: () =>
    client.get<AlertSettings>('/alerts/settings/thresholds'),

  updateSettings: (data: AlertSettingsUpdate) =>
    client.patch<AlertSettings>('/alerts/settings/thresholds', data),
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export const analyticsApi = {
  getFillTrends: (days = 7, zone_id?: string) =>
    client.get<FillTrend[]>('/analytics/fill-trends', {
      params: { days, ...(zone_id ? { zone_id } : {}) },
    }),

  getTrips: () =>
    client.get<TripComparison[]>('/analytics/trips'),

  exportCsv: () =>
    client.get('/analytics/export', { responseType: 'blob' }),
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
  getAll: () =>
    client.get<User[]>('/users/'),

  create: (data: UserCreate) =>
    client.post<User>('/users/', data),

  update: (id: string, data: Partial<{ role: string; is_active: boolean }>) =>
    client.patch<User>(`/users/${id}`, data),
}

// ─── Driver ──────────────────────────────────────────────────────────────────

export const driverApi = {
  getRoute: () =>
    client.get<RouteRead>('/driver/route'),

  collect: (bin_id: string) =>
    client.post<RouteRead>('/driver/collect', { bin_id }),

  getHistory: () =>
    client.get<RouteRead[]>('/driver/history'),
}
