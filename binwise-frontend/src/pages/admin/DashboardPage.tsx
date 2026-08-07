import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { binsApi, alertsApi } from '../../api'
import type { BinLive, BinSummary, Alert } from '../../types'
import { StatCard, FillBadge, FillBar, PageLoader, Btn } from '../../components/ui'
import { fmtRelative, alertTypeLabel } from '../../utils'
import BinMap from '../../components/map/BinMap'

export default function DashboardPage() {
  const [summary, setSummary] = useState<BinSummary | null>(null)
  const [bins, setBins] = useState<BinLive[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, binsRes, alertsRes] = await Promise.all([
        binsApi.getSummary(),
        binsApi.getLive(),
        alertsApi.getAll('open'),
      ])
      setSummary(sumRes.data)
      setBins(binsRes.data)
      setAlerts(alertsRes.data.slice(0, 5))
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const overflowBins = bins.filter(b => b.fill_status === 'overflow')

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time waste management overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Live — auto-refreshing every 30s
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Bins"
          value={summary?.total_bins ?? 0}
          variant="default"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
        />
        <StatCard
          label="Overflowing Now"
          value={summary?.overflow_count ?? 0}
          variant="danger"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          label="Collected Today"
          value={summary?.collections_today ?? 0}
          variant="success"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <StatCard
          label="Offline Sensors"
          value={summary?.offline_count ?? 0}
          variant="warning"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414" />
            </svg>
          }
        />
      </div>

      {/* Map + Critical bins */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map */}
        <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <BinMap bins={bins} height="420px" />
        </div>

        {/* Critical bins panel */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Critical Bins</h3>
              <p className="text-xs text-gray-400">{overflowBins.length} bins overflowing</p>
            </div>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-danger text-xs font-bold">
              {overflowBins.length}
            </span>
          </div>
          <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-50">
            {overflowBins.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                No overflowing bins right now
              </div>
            ) : (
              overflowBins.map(bin => (
                <div key={bin.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{bin.bin_code}</p>
                      <p className="text-xs text-gray-500">{bin.location_name}</p>
                    </div>
                    <FillBadge status={bin.fill_status} pct={bin.fill_pct} />
                  </div>
                  <FillBar pct={bin.fill_pct} status={bin.fill_status} />
                  <div className="mt-2 flex justify-end">
                    <Btn size="sm" variant="danger">Dispatch</Btn>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900">Recent Alerts</h3>
          <p className="text-xs text-gray-400">Latest open alerts</p>
        </div>
        <div className="divide-y divide-gray-50">
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No open alerts</div>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                <span
                  className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                    alert.severity === 'critical'
                      ? 'bg-danger'
                      : alert.severity === 'warning'
                        ? 'bg-warning'
                        : 'bg-info'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {alertTypeLabel(alert.alert_type)}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{alert.message || `Alert on bin ${alert.bin_id}`}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{fmtRelative(alert.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
