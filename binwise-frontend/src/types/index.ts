// ─── Fill / Bin status ───────────────────────────────────────────────────────
export type FillStatus = 'normal' | 'warning' | 'overflow'
export type BinStatus = 'active' | 'inactive' | 'offline'
export type UserRole = 'admin' | 'driver'
export type RouteStatus = 'pending' | 'in_progress' | 'completed' | 'canceled'
export type WaypointStatus = 'pending' | 'collected' | 'skipped'
export type AlertType = 'overflow' | 'offline' | 'low_battery'
export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'open' | 'resolved'

// ─── Bin interfaces ──────────────────────────────────────────────────────────
export interface BinLive {
  id: string
  bin_code: string
  location_name: string
  latitude: number
  longitude: number
  fill_pct: number
  fill_status: FillStatus
  last_reading?: string
  status: BinStatus
}

export interface BinRead extends BinLive {
  zone_id: string
  zone_name?: string
  battery_pct?: number
  capacity_l: number
  height_cm: number
  installed_at?: string
  created_at: string
  updated_at: string
}

export interface BinSummary {
  total_bins: number
  overflow_count: number
  offline_count: number
  collections_today: number
}

export interface BinCreate {
  bin_code: string
  location_name: string
  latitude: number
  longitude: number
  capacity_l?: number
  height_cm?: number
  zone_id: string
}

export interface BinUpdate {
  bin_code?: string
  location_name?: string
  latitude?: number
  longitude?: number
  capacity_l?: number
  height_cm?: number
  zone_id?: string
}

// ─── Zone ────────────────────────────────────────────────────────────────────
export interface Zone {
  id: string
  name: string
  description?: string
}

// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  last_login?: string
  created_at: string
}

export interface UserCreate {
  full_name: string
  email: string
  password: string
  role: UserRole
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface Token {
  access_token: string
  token_type: string
}

export interface AuthUser {
  user_id: string
  role: UserRole
  email?: string
  full_name?: string
}

// ─── Waypoint & Route ─────────────────────────────────────────────────────────
export interface WaypointRead {
  id: string
  route_id: string
  bin_id: string
  stop_order: number
  fill_pct_at_generation?: number
  status: WaypointStatus
  collected_at?: string
  skip_reason?: string
}

export interface RouteRead {
  id: string
  route_code: string
  assigned_driver_id?: string
  status: RouteStatus
  bin_count: number
  threshold_pct: number
  ai_distance_km?: number
  baseline_distance_km?: number
  ai_duration_min?: number
  generated_at: string
  started_at?: string
  completed_at?: string
  waypoints: WaypointRead[]
}

// ─── Alert ───────────────────────────────────────────────────────────────────
export interface Alert {
  id: string
  bin_id: string
  alert_type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  message?: string
  resolved_by?: string
  resolved_at?: string
  created_at: string
}

export interface AlertSettings {
  id: string
  overflow_threshold: number
  offline_timeout_min: number
  low_battery_threshold: number
  notify_email: boolean
  notify_sms: boolean
  notify_inapp: boolean
  updated_at: string
}

export interface AlertSettingsUpdate {
  overflow_threshold?: number
  offline_timeout_min?: number
  low_battery_threshold?: number
  notify_email?: boolean
  notify_sms?: boolean
  notify_inapp?: boolean
}

// ─── Sensor Node ─────────────────────────────────────────────────────────────
export interface SensorNode {
  id: string
  node_id: string
  bin_id: string | null
  firmware_v: string | null
  gsm_number: string | null
  is_active: boolean
  last_seen: string | null
  // Populated from backend join (may or may not be present):
  bin_code?: string
  location_name?: string
}

export interface SensorNodeCreate {
  node_id: string
  bin_id?: string | null
  firmware_v?: string | null
  gsm_number?: string | null
  is_active?: boolean
}

export interface SensorNodeUpdate {
  node_id?: string
  bin_id?: string | null
  firmware_v?: string | null
  gsm_number?: string | null
  is_active?: boolean
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface FillTrend {
  date: string
  avg_fill: number
}

export interface TripComparison {
  route_code: string
  ai_distance_km: number
  baseline_distance_km: number
  bin_count: number
  completed_at?: string
}
