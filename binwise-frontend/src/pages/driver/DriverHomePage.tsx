import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { driverApi } from '../../api'
import type { RouteRead } from '../../types'
import { FillBar, PageLoader, Empty } from '../../components/ui'
import { fmtRelative } from '../../utils'

function DriverBottomTabs({ active }: { active: 'home' | 'route' | 'history' }) {
  return (
    <div className="driver-bottom-tab flex items-center justify-around py-2 px-4">
      {[
        { key: 'home' as const, to: '/driver', label: 'Home', icon: HomeIcon },
        { key: 'route' as const, to: '/driver/route', label: 'Route', icon: RouteTabIcon },
        { key: 'history' as const, to: '/driver/history', label: 'History', icon: HistoryIcon },
      ].map(tab => (
        <Link
          key={tab.key}
          to={tab.to}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors ${
            active === tab.key
              ? 'text-primary'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <tab.icon active={active === tab.key} />
          <span className="text-[10px] font-semibold">{tab.label}</span>
        </Link>
      ))}
    </div>
  )
}

export { DriverBottomTabs }

export default function DriverHomePage() {
  const [route, setRoute] = useState<RouteRead | null>(null)
  const [loading, setLoading] = useState(true)
  const [noRoute, setNoRoute] = useState(false)

  const userRaw = localStorage.getItem('bw_user')
  const user = userRaw ? JSON.parse(userRaw) as { full_name?: string } : null
  const firstName = user?.full_name?.split(' ')[0] ?? 'Driver'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const fetchRoute = useCallback(async () => {
    try {
      const { data } = await driverApi.getRoute()
      setRoute(data)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        setNoRoute(true)
      } else {
        toast.error('Failed to load route')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRoute() }, [fetchRoute])

  const collected = route?.waypoints.filter(w => w.status === 'collected').length ?? 0
  const total = route?.waypoints.length ?? 0
  const remaining = total - collected
  const nextStop = route?.waypoints
    .filter(w => w.status === 'pending')
    .sort((a, b) => a.stop_order - b.stop_order)[0]
  const recentCollected = route?.waypoints
    .filter(w => w.status === 'collected')
    .sort((a, b) => (b.collected_at ?? '').localeCompare(a.collected_at ?? ''))
    .slice(0, 3) ?? []

  if (loading) return (
    <div className="driver-layout flex items-center justify-center min-h-screen">
      <PageLoader />
    </div>
  )

  return (
    <div className="driver-layout pb-20">
      {/* Header banner */}
      <div className="bg-gradient-to-br from-primary to-primary-600 px-5 py-6 text-white">
        <p className="text-sm text-white/70">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        <h1 className="text-xl font-bold mt-0.5">{greeting}, {firstName}</h1>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-4 shadow-md border border-gray-100 text-center">
            <p className="text-2xl font-bold text-primary">{collected}</p>
            <p className="text-xs text-gray-500 mt-0.5">Collected today</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-md border border-gray-100 text-center">
            <p className="text-2xl font-bold text-warning">{remaining}</p>
            <p className="text-xs text-gray-500 mt-0.5">Remaining</p>
          </div>
        </div>

        {noRoute ? (
          <Empty
            title="No route assigned yet"
            description="Your route will appear here once an admin generates and assigns one to you."
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            }
          />
        ) : route && (
          <>
            {/* Route card */}
            <div className="rounded-xl bg-white p-4 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">{route.route_code}</p>
                  <p className="text-xs text-gray-400">{route.bin_count} bins · {route.ai_distance_km?.toFixed(1) ?? '—'} km · {route.ai_duration_min?.toFixed(0) ?? '—'} min</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                  route.status === 'in_progress' ? 'bg-blue-100 text-info' :
                  route.status === 'completed' ? 'bg-green-100 text-primary' :
                  'bg-yellow-100 text-warning'
                }`}>
                  {route.status.replace('_', ' ')}
                </span>
              </div>
              {/* Progress */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{collected}/{total}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${total > 0 ? (collected / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <Link
                to="/driver/route"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25"
              >
                Continue collection →
              </Link>
            </div>

            {/* Next stop preview */}
            {nextStop && (
              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Next Stop</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                    {nextStop.stop_order}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Stop {nextStop.stop_order}</p>
                    {nextStop.fill_pct_at_generation != null && (
                      <div className="mt-1">
                        <FillBar pct={nextStop.fill_pct_at_generation} showLabel height="h-1.5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recent collections */}
            {recentCollected.length > 0 && (
              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Recent Collections</p>
                <div className="space-y-2">
                  {recentCollected.map(wp => (
                    <div key={wp.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500">
                        ✓
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-700">Stop {wp.stop_order}</p>
                        <p className="text-[10px] text-gray-400">{fmtRelative(wp.collected_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <DriverBottomTabs active="home" />
    </div>
  )
}

// ─── Tab Icons ───────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? 'text-primary' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function RouteTabIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? 'text-primary' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  )
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? 'text-primary' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
