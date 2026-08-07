import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { format, parseISO, isValid, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { driverApi } from '../../api'
import type { RouteRead } from '../../types'
import { PageLoader, Empty, StatusBadge } from '../../components/ui'
import { DriverBottomTabs } from './DriverHomePage'
import { savingsPct, fmtDate } from '../../utils'

export default function DriverHistoryPage() {
  const [routes, setRoutes] = useState<RouteRead[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const { data } = await driverApi.getHistory()
      setRoutes(data)
    } catch {
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // This week stats
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const thisWeekRoutes = routes.filter(r => {
    if (!r.completed_at) return false
    const d = parseISO(r.completed_at)
    return isValid(d) && isWithinInterval(d, { start: weekStart, end: weekEnd })
  })
  const weekBins = thisWeekRoutes.reduce((sum, r) => sum + r.bin_count, 0)

  // Group by date
  const grouped: Record<string, RouteRead[]> = {}
  for (const route of routes) {
    const dateKey = route.completed_at
      ? format(parseISO(route.completed_at), 'yyyy-MM-dd')
      : route.generated_at
        ? format(parseISO(route.generated_at), 'yyyy-MM-dd')
        : 'Unknown'
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(route)
  }

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const statusColor = (s: string): 'green' | 'amber' | 'blue' | 'gray' | 'red' => {
    switch (s) {
      case 'completed':   return 'green'
      case 'in_progress': return 'blue'
      case 'pending':     return 'amber'
      case 'canceled':    return 'red'
      default:            return 'gray'
    }
  }

  if (loading) return (
    <div className="driver-layout flex items-center justify-center min-h-screen">
      <PageLoader />
    </div>
  )

  return (
    <div className="driver-layout pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary-600 px-5 py-5 text-white">
        <h1 className="text-lg font-bold">Collection History</h1>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Week summary */}
        <div className="rounded-xl bg-white p-4 shadow-md border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">This Week</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{weekBins}</p>
              <p className="text-xs text-gray-500">Bins collected</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-info">{thisWeekRoutes.length}</p>
              <p className="text-xs text-gray-500">Routes completed</p>
            </div>
          </div>
        </div>

        {/* Route list */}
        {routes.length === 0 ? (
          <Empty
            title="No collection history"
            description="Your completed routes will appear here."
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-4">
            {sortedDates.map(dateKey => {
              let dateLabel = dateKey
              try {
                dateLabel = format(parseISO(dateKey), 'EEEE, dd MMMM yyyy')
              } catch { /* keep raw */ }
              return (
                <div key={dateKey}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                    {dateLabel}
                  </p>
                  <div className="space-y-2">
                    {grouped[dateKey].map(route => {
                      const isExpanded = expandedId === route.id
                      const col = route.waypoints.filter(w => w.status === 'collected').length
                      const tot = route.waypoints.length
                      const saving = route.ai_distance_km && route.baseline_distance_km
                        ? savingsPct(route.ai_distance_km, route.baseline_distance_km)
                        : null

                      return (
                        <div key={route.id} className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : route.id)}
                            className="w-full px-4 py-3 flex items-center gap-3 text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-gray-900">{route.route_code}</p>
                                <StatusBadge
                                  label={route.status.replace('_', ' ')}
                                  color={statusColor(route.status)}
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {col}/{tot} collected · {route.ai_distance_km?.toFixed(1) ?? '—'} km
                                {saving != null && ` · ${saving}% saved`}
                              </p>
                            </div>
                            <svg
                              className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-gray-50 px-4 py-3 space-y-2 fade-in">
                              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                                <div className="bg-gray-50 rounded-lg p-2">
                                  <p className="text-gray-400">AI</p>
                                  <p className="font-bold text-primary">{route.ai_distance_km?.toFixed(1) ?? '—'} km</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2">
                                  <p className="text-gray-400">Baseline</p>
                                  <p className="font-bold text-gray-700">{route.baseline_distance_km?.toFixed(1) ?? '—'} km</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2">
                                  <p className="text-gray-400">Completed</p>
                                  <p className="font-bold text-gray-700">{fmtDate(route.completed_at, 'HH:mm')}</p>
                                </div>
                              </div>
                              {[...route.waypoints]
                                .sort((a, b) => a.stop_order - b.stop_order)
                                .map(wp => (
                                  <div key={wp.id} className="flex items-center gap-2.5 text-xs">
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                                      wp.status === 'collected' ? 'bg-primary' :
                                      wp.status === 'skipped' ? 'bg-gray-300' : 'bg-yellow-400'
                                    }`}>
                                      {wp.status === 'collected' ? '✓' : wp.status === 'skipped' ? '⊘' : wp.stop_order}
                                    </span>
                                    <span className="flex-1 text-gray-700">Stop {wp.stop_order}</span>
                                    {wp.collected_at && (
                                      <span className="text-gray-400">{fmtDate(wp.collected_at, 'HH:mm')}</span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <DriverBottomTabs active="history" />
    </div>
  )
}
