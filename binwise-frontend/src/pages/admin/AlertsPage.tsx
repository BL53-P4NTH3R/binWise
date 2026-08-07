import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { alertsApi } from '../../api'
import type { Alert, AlertSettings, AlertSettingsUpdate } from '../../types'
import { Btn, PageLoader, SeverityBadge, Empty } from '../../components/ui'
import { alertTypeLabel, fmtRelative, severityBgClass } from '../../utils'

type TabFilter = 'open' | 'resolved' | 'all'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [settings, setSettings] = useState<AlertSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabFilter>('open')
  const [savingSettings, setSavingSettings] = useState(false)

  // Editable settings form
  const [formSettings, setFormSettings] = useState<AlertSettingsUpdate>({})

  const fetchData = useCallback(async () => {
    try {
      const [alertsRes, settingsRes] = await Promise.all([
        alertsApi.getAll(tab),
        alertsApi.getSettings(),
      ])
      setAlerts(alertsRes.data)
      const s = settingsRes.data
      setSettings(s)
      setFormSettings({
        overflow_threshold: s.overflow_threshold,
        offline_timeout_min: s.offline_timeout_min,
        low_battery_threshold: s.low_battery_threshold,
        notify_email: s.notify_email,
        notify_sms: s.notify_sms,
        notify_inapp: s.notify_inapp,
      })
    } catch {
      toast.error('Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchData() }, [fetchData])

  const handleResolve = async (id: string) => {
    try {
      await alertsApi.resolve(id)
      toast.success('Alert resolved')
      fetchData()
    } catch {
      toast.error('Failed to resolve alert')
    }
  }

  const handleResolveAll = async () => {
    try {
      const openAlerts = alerts.filter(a => a.status === 'open')
      await Promise.all(openAlerts.map(a => alertsApi.resolve(a.id)))
      toast.success(`${openAlerts.length} alerts resolved`)
      fetchData()
    } catch {
      toast.error('Failed to resolve alerts')
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      await alertsApi.updateSettings(formSettings)
      toast.success('Settings saved')
      fetchData()
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  if (loading) return <PageLoader />

  const openCount = alerts.filter(a => a.status === 'open').length

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts & Notifications</h1>
          <p className="text-sm text-gray-500">{openCount} open alerts</p>
        </div>
        {openCount > 0 && tab === 'open' && (
          <Btn variant="secondary" size="sm" onClick={handleResolveAll}>
            Mark all resolved
          </Btn>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
            {(['open', 'resolved', 'all'] as TabFilter[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-all capitalize ${
                  tab === t
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Alert list */}
          {alerts.length === 0 ? (
            <Empty
              title={tab === 'open' ? 'No open alerts' : 'No alerts found'}
              description="The system will generate alerts when bins overflow, go offline, or have low battery."
              icon={
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              }
            />
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md ${severityBgClass(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${
                        alert.severity === 'critical' ? 'bg-danger' :
                        alert.severity === 'warning' ? 'bg-warning' : 'bg-info'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          {alertTypeLabel(alert.alert_type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{alert.message || `Alert on bin ${alert.bin_id}`}</p>
                      <p className="text-xs text-gray-400 mt-1">{fmtRelative(alert.created_at)}</p>
                      {alert.resolved_at && (
                        <p className="text-xs text-green-600 mt-1">
                          Resolved {fmtRelative(alert.resolved_at)}
                          {alert.resolved_by && ` by ${alert.resolved_by}`}
                        </p>
                      )}
                    </div>
                    {alert.status === 'open' && (
                      <Btn size="sm" variant="secondary" onClick={() => handleResolve(alert.id)}>
                        Resolve
                      </Btn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings panel */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-fit sticky top-24">
          <h3 className="font-semibold text-gray-900 mb-5">Threshold Settings</h3>
          <div className="space-y-5">
            {/* Overflow threshold */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Overflow threshold</label>
                <span className="text-sm font-bold text-primary">{formSettings.overflow_threshold ?? 80}%</span>
              </div>
              <input
                type="range" min="50" max="100" step="5"
                value={formSettings.overflow_threshold ?? 80}
                onChange={e => setFormSettings(s => ({ ...s, overflow_threshold: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Offline timeout */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Offline timeout</label>
              <select
                value={formSettings.offline_timeout_min ?? 30}
                onChange={e => setFormSettings(s => ({ ...s, offline_timeout_min: parseInt(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            {/* Low battery threshold */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Low battery threshold</label>
                <span className="text-sm font-bold text-warning">{formSettings.low_battery_threshold ?? 20}%</span>
              </div>
              <input
                type="range" min="5" max="40" step="5"
                value={formSettings.low_battery_threshold ?? 20}
                onChange={e => setFormSettings(s => ({ ...s, low_battery_threshold: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Notification toggles */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Notifications</h4>
              <div className="space-y-3">
                {[
                  { key: 'notify_email' as const, label: 'Email' },
                  { key: 'notify_sms' as const, label: 'SMS' },
                  { key: 'notify_inapp' as const, label: 'In-app' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{n.label}</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formSettings[n.key] ?? false}
                        onChange={e => setFormSettings(s => ({ ...s, [n.key]: e.target.checked }))}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Btn className="w-full" onClick={handleSaveSettings} loading={savingSettings}>
              Save Settings
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}
