import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { routesApi, binsApi, usersApi } from '../../api'
import type { RouteRead, BinLive, User } from '../../types'
import {
  Btn, PageLoader, Empty, StatusBadge, Select,
} from '../../components/ui'
import BinMap from '../../components/map/BinMap'
import { savingsPct, fmtDate } from '../../utils'

const statusColor = (s: string): 'green' | 'amber' | 'blue' | 'gray' | 'red' => {
  switch (s) {
    case 'completed':   return 'green'
    case 'in_progress': return 'blue'
    case 'pending':     return 'amber'
    case 'canceled':    return 'red'
    default:            return 'gray'
  }
}

export default function RouteOptimisationPage() {
  const [routes, setRoutes] = useState<RouteRead[]>([])
  const [activeRoute, setActiveRoute] = useState<RouteRead | null>(null)
  const [bins, setBins] = useState<BinLive[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [threshold, setThreshold] = useState(70)

  const fetchData = useCallback(async () => {
    try {
      const [routesRes, binsRes, usersRes] = await Promise.all([
        routesApi.getAll(),
        binsApi.getLive(),
        usersApi.getAll(),
      ])
      setRoutes(routesRes.data)
      setBins(binsRes.data)
      setDrivers(usersRes.data.filter(u => u.role === 'driver'))
      if (routesRes.data.length > 0) {
        setActiveRoute(routesRes.data[0])
      }
    } catch {
      toast.error('Failed to load routes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const { data } = await routesApi.generate(threshold)
      toast.success('Route generated successfully!')
      setActiveRoute(data)
      fetchData()
    } catch {
      toast.error('Failed to generate route')
    } finally {
      setGenerating(false)
    }
  }

  const handleAssignDriver = async (routeId: string, driverId: string) => {
    try {
      await routesApi.assignDriver(routeId, driverId)
      toast.success('Driver assigned')
      fetchData()
    } catch {
      toast.error('Failed to assign driver')
    }
  }

  if (loading) return <PageLoader />

  // Route bins for map overlay
  const routeBins = activeRoute
    ? bins.filter(b => activeRoute.waypoints.some(wp => wp.bin_id === b.id))
    : []

  return (
    <div className="space-y-6 fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Route Optimisation</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map */}
        <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <BinMap
            bins={bins}
            height="500px"
            routeWaypoints={activeRoute?.waypoints}
            routeBins={routeBins}
            showPolyline={!!activeRoute}
          />
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Generate route */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Generate Route</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Fill threshold</label>
                  <span className="text-sm font-bold text-primary">{threshold}%</span>
                </div>
                <input
                  type="range"
                  min="50" max="90" step="5"
                  value={threshold}
                  onChange={e => setThreshold(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Only bins above {threshold}% fill will be included
                </p>
              </div>
              <Btn onClick={handleGenerate} loading={generating} className="w-full">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate AI Route
              </Btn>
            </div>
          </div>

          {/* Active route card */}
          {activeRoute ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">{activeRoute.route_code}</p>
                  <p className="text-xs text-gray-400">{fmtDate(activeRoute.generated_at)}</p>
                </div>
                <StatusBadge
                  label={activeRoute.status.replace('_', ' ')}
                  color={statusColor(activeRoute.status)}
                />
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400">Bins</p>
                    <p className="text-lg font-bold text-gray-900">{activeRoute.bin_count}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400">AI Distance</p>
                    <p className="text-lg font-bold text-primary">{activeRoute.ai_distance_km?.toFixed(1) ?? '—'} km</p>
                  </div>
                </div>

                {activeRoute.baseline_distance_km && activeRoute.ai_distance_km && (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                    <p className="text-xs font-medium text-green-700">
                      AI: {activeRoute.ai_distance_km.toFixed(1)} km vs Baseline: {activeRoute.baseline_distance_km.toFixed(1)} km
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-white text-[10px] font-bold">
                        {savingsPct(activeRoute.ai_distance_km, activeRoute.baseline_distance_km)}% saved
                      </span>
                    </p>
                  </div>
                )}

                {/* Waypoints */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Waypoints</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {[...activeRoute.waypoints]
                      .sort((a, b) => a.stop_order - b.stop_order)
                      .map(wp => {
                        const bin = bins.find(b => b.id === wp.bin_id)
                        return (
                          <div key={wp.id}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs ${
                              wp.status === 'collected' ? 'bg-gray-50 text-gray-400' : 'bg-white'
                            }`}
                          >
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                              wp.status === 'collected' ? 'bg-gray-300' : 'bg-primary'
                            }`}>
                              {wp.status === 'collected' ? '✓' : wp.stop_order}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-700 truncate">{bin?.bin_code ?? wp.bin_id}</p>
                              <p className="text-gray-400 truncate">{bin?.location_name ?? ''}</p>
                            </div>
                            {wp.fill_pct_at_generation != null && (
                              <span className="text-gray-500 font-semibold">{wp.fill_pct_at_generation}%</span>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>

                {/* Assign driver */}
                <div>
                  <Select
                    label="Assign Driver"
                    value={activeRoute.assigned_driver_id ?? ''}
                    onChange={e => handleAssignDriver(activeRoute.id, e.target.value)}
                    options={drivers.map(d => ({ value: d.id, label: d.full_name }))}
                    placeholder="Select a driver"
                  />
                </div>

                <Btn variant="secondary" className="w-full" onClick={() => window.print()}>
                  Export PDF
                </Btn>
              </div>
            </div>
          ) : (
            <Empty title="No routes generated yet" description="Use the controls above to generate an optimised route." />
          )}
        </div>
      </div>

      {/* Route history */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900">Route History</h3>
        </div>
        {routes.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No routes generated yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Route</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Bins</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">AI Distance</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Baseline</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Saved</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {routes.map(route => (
                  <tr key={route.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${activeRoute?.id === route.id ? 'bg-primary-50' : ''}`}
                    onClick={() => setActiveRoute(route)}
                  >
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{route.route_code}</td>
                    <td className="px-5 py-3">
                      <StatusBadge label={route.status.replace('_', ' ')} color={statusColor(route.status)} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{route.bin_count}</td>
                    <td className="px-5 py-3 text-sm text-primary font-medium">{route.ai_distance_km?.toFixed(1) ?? '—'} km</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{route.baseline_distance_km?.toFixed(1) ?? '—'} km</td>
                    <td className="px-5 py-3">
                      {route.ai_distance_km && route.baseline_distance_km ? (
                        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary">
                          {savingsPct(route.ai_distance_km, route.baseline_distance_km)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(route.generated_at, 'dd MMM, HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
