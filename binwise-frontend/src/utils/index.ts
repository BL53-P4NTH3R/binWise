import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns'
import type { AlertSeverity, AlertType, FillStatus } from '../types'

// ─── Fill status colour helpers ───────────────────────────────────────────────

export function fillStatusColor(status: FillStatus): string {
  switch (status) {
    case 'normal':   return 'text-primary-600 bg-primary-50'
    case 'warning':  return 'text-warning bg-yellow-50'
    case 'overflow': return 'text-danger bg-danger-light'
    default:         return 'text-gray-600 bg-gray-100'
  }
}

export function fillStatusHex(status: FillStatus): string {
  switch (status) {
    case 'normal':   return '#1D9E75'
    case 'warning':  return '#BA7517'
    case 'overflow': return '#E24B4A'
    default:         return '#6B7280'
  }
}

export function fillPctToStatus(pct: number): FillStatus {
  if (pct >= 80) return 'overflow'
  if (pct >= 50) return 'warning'
  return 'normal'
}

export function fillPctHex(pct: number): string {
  return fillStatusHex(fillPctToStatus(pct))
}

// ─── Alert helpers ────────────────────────────────────────────────────────────

export function alertTypeLabel(type: AlertType): string {
  switch (type) {
    case 'overflow':    return 'Overflow'
    case 'offline':     return 'Sensor Offline'
    case 'low_battery': return 'Low Battery'
    default:            return type
  }
}

export function severityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical': return 'text-danger'
    case 'warning':  return 'text-warning'
    case 'info':     return 'text-info'
    default:         return 'text-gray-600'
  }
}

export function severityBgClass(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical': return 'border-l-4 border-danger bg-red-50'
    case 'warning':  return 'border-l-4 border-warning bg-yellow-50'
    case 'info':     return 'border-l-4 border-info bg-blue-50'
    default:         return ''
  }
}

// ─── Date formatting ─────────────────────────────────────────────────────────

export function fmtDate(dateStr: string | undefined, fmt = 'dd MMM yyyy, HH:mm'): string {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    if (!isValid(d)) return '—'
    return format(d, fmt)
  } catch {
    return '—'
  }
}

export function fmtRelative(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    if (!isValid(d)) return '—'
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return '—'
  }
}

export function fmtShortDate(dateStr: string | undefined): string {
  return fmtDate(dateStr, 'dd MMM')
}

// ─── JWT decode ───────────────────────────────────────────────────────────────

export function decodeJwt(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1]
    const padded = base64.replace(/-/g, '+').replace(/_/g, '/')
    const jsonStr = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonStr) as Record<string, unknown>
  } catch {
    return {}
  }
}

// ─── Route savings ───────────────────────────────────────────────────────────

export function savingsPct(ai: number, baseline: number): number {
  if (baseline <= 0) return 0
  return Math.round(((baseline - ai) / baseline) * 100)
}

// ─── Misc ────────────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? singular + 's')
}
