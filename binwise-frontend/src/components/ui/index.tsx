import React from 'react'
import { Navigate } from 'react-router-dom'
import type { FillStatus, AlertSeverity } from '../../types'
import { fillStatusColor, fillStatusHex, severityColor } from '../../utils'

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'driver'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const token = localStorage.getItem('bw_token')
  const userRaw = localStorage.getItem('bw_user')

  if (!token) return <Navigate to="/login" replace />

  if (requiredRole && userRaw) {
    const user = JSON.parse(userRaw) as { role: string }
    if (user.role !== requiredRole) {
      return <Navigate to={user.role === 'admin' ? '/dashboard' : '/driver'} replace />
    }
  }

  return <>{children}</>
}

// ─── StatCard ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info'
  subtitle?: string
}

const variantStyles = {
  default: 'bg-white border-gray-200',
  danger:  'bg-white border-l-4 border-l-danger border-gray-200',
  warning: 'bg-white border-l-4 border-l-yellow-500 border-gray-200',
  success: 'bg-white border-l-4 border-l-primary border-gray-200',
  info:    'bg-white border-l-4 border-l-info border-gray-200',
}

const iconVariant = {
  default: 'bg-gray-100 text-gray-500',
  danger:  'bg-red-100 text-danger',
  warning: 'bg-yellow-100 text-warning',
  success: 'bg-green-100 text-primary',
  info:    'bg-blue-100 text-info',
}

export function StatCard({ label, value, icon, variant = 'default', subtitle }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm fade-in ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${iconVariant[variant]}`}>{icon}</div>
      </div>
    </div>
  )
}

// ─── FillBadge ───────────────────────────────────────────────────────────────

interface FillBadgeProps {
  status: FillStatus
  pct?: number
}

const statusLabel: Record<FillStatus, string> = {
  normal:   'Normal',
  warning:  'Warning',
  overflow: 'Overflow',
}

export function FillBadge({ status, pct }: FillBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${fillStatusColor(status)}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fillStatusHex(status) }} />
      {statusLabel[status]}{pct !== undefined && ` · ${pct}%`}
    </span>
  )
}

// ─── FillBar ─────────────────────────────────────────────────────────────────

interface FillBarProps {
  pct: number
  status?: FillStatus
  height?: string
  showLabel?: boolean
}

export function FillBar({ pct, status, height = 'h-2', showLabel = false }: FillBarProps) {
  const fillStatus = status ?? (pct >= 80 ? 'overflow' : pct >= 50 ? 'warning' : 'normal')
  const hex = fillStatusHex(fillStatus)
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 rounded-full bg-gray-100 overflow-hidden ${height}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${fillStatus === 'overflow' ? 'bin-pulse' : ''}`}
          style={{ width: `${clamped}%`, backgroundColor: hex }}
        />
      </div>
      {showLabel && <span className="w-8 text-xs font-medium text-gray-600">{clamped}%</span>}
    </div>
  )
}

// ─── SeverityBadge ───────────────────────────────────────────────────────────

interface SeverityBadgeProps {
  severity: AlertSeverity
}

const severityBg: Record<AlertSeverity, string> = {
  critical: 'bg-red-100 text-danger',
  warning:  'bg-yellow-100 text-warning',
  info:     'bg-blue-100 text-info',
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${severityBg[severity]}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${severityColor(severity).replace('text-', 'bg-')}`} />
      {severity}
    </span>
  )
}

// ─── Btn ─────────────────────────────────────────────────────────────────────

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

const btnVariants = {
  primary:   'bg-primary text-white hover:bg-primary-600 disabled:bg-primary-300',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50',
  danger:    'bg-danger text-white hover:bg-red-600 disabled:opacity-50',
  warning:   'bg-warning text-white hover:bg-yellow-700 disabled:opacity-50',
  ghost:     'text-gray-600 hover:bg-gray-100 disabled:opacity-50',
}

const btnSizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
}

export function Btn({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: BtnProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
        ${btnVariants[variant]} ${btnSizes[size]} ${className}
      `}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}

// ─── Input ───────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`
          w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900
          placeholder-gray-400 shadow-sm outline-none
          focus:border-primary focus:ring-2 focus:ring-primary/20
          disabled:bg-gray-50 disabled:text-gray-500
          ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-gray-300'}
          ${className}
        `}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

// ─── Select ──────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, className = '', id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={`
          w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 shadow-sm
          outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
          ${error ? 'border-danger' : 'border-gray-300'}
          ${className}
        `}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={`relative w-full ${modalSizes[size]} rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl fade-in max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 sm:px-6 py-4 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

const spinnerSizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-3',
  lg: 'h-12 w-12 border-4',
}

export function Spinner({ size = 'md', color = 'border-primary' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-gray-200 ${spinnerSizes[size]} ${color}`}
      style={{ borderTopColor: 'currentColor' }}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  )
}

// ─── Empty ───────────────────────────────────────────────────────────────────

interface EmptyProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function Empty({ icon, title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center fade-in">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning'
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-gray-600">{message}</p>
      <div className="mt-5 flex justify-end gap-3">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn variant={variant} onClick={onConfirm}>{confirmLabel}</Btn>
      </div>
    </Modal>
  )
}

// ─── StatusBadge (generic) ────────────────────────────────────────────────────

interface StatusBadgeProps {
  label: string
  color: 'green' | 'red' | 'amber' | 'blue' | 'gray'
}

const badgeColors = {
  green: 'bg-green-100 text-green-700',
  red:   'bg-red-100 text-danger',
  amber: 'bg-yellow-100 text-warning',
  blue:  'bg-blue-100 text-info',
  gray:  'bg-gray-100 text-gray-600',
}

export function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors[color]}`}>
      {label}
    </span>
  )
}
