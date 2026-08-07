import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { analyticsApi } from '../../api'
import type { FillTrend, TripComparison } from '../../types'
import { StatCard, PageLoader, Empty, Btn } from '../../components/ui'
import { savingsPct } from '../../utils'

export default function AnalyticsPage() {
  const [days, setDays] = useState(7)
  const [fillTrends, setFillTrends] = useState<FillTrend[]>([])
  const [trips, setTrips] = useState<TripComparison[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [trendsRes, tripsRes] = await Promise.all([
        analyticsApi.getFillTrends(days),
        analyticsApi.getTrips(),
      ])
      setFillTrends(trendsRes.data)
      setTrips(tripsRes.data)
    } catch {
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { fetchData() }, [fetchData])

  const handleExportCsv = async () => {
    try {
      const response = await analyticsApi.exportCsv()
      const url = URL.createObjectURL(new Blob([response.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `binwise-analytics-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported')
    } catch {
      toast.error('Failed to export CSV')
    }
  }

  // Computed metrics
  const totalCollections = trips.reduce((sum, t) => sum + t.bin_count, 0)
  const routesCompleted = trips.length
  const avgSaving = trips.length > 0
    ? Math.round(trips.reduce((sum, t) => sum + savingsPct(t.ai_distance_km, t.baseline_distance_km), 0) / trips.length)
    : 0
  const overflowIncidents = fillTrends.filter(t => t.avg_fill > 80).length

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-sm text-gray-500">Performance metrics and trend analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={e => setDays(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <Btn variant="secondary" onClick={handleExportCsv}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Btn>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Collections" value={totalCollections} variant="success"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>}
        />
        <StatCard label="Routes Completed" value={routesCompleted} variant="info"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
        />
        <StatCard label="Avg Distance Saved" value={`${avgSaving}%`} variant="success"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
        <StatCard label="Overflow Incidents" value={overflowIncidents} variant="danger"
          icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fill trends line chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Fill Level Trends</h3>
          {fillTrends.length === 0 ? (
            <Empty title="No trend data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={fillTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px', border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13,
                  }}
                  formatter={(val: number) => [`${val.toFixed(1)}%`, 'Avg Fill']}
                />
                <Line
                  type="monotone"
                  dataKey="avg_fill"
                  stroke="#1D9E75"
                  strokeWidth={2.5}
                  dot={{ fill: '#1D9E75', r: 4 }}
                  activeDot={{ r: 6, fill: '#1D9E75' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* AI vs Baseline bar chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">AI vs Baseline Distance</h3>
          {trips.length === 0 ? (
            <Empty title="No trip data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trips}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="route_code"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                  unit=" km"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px', border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ai_distance_km" name="AI Route" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                <Bar dataKey="baseline_distance_km" name="Baseline" fill="#E24B4A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900">Route Comparison</h3>
          <p className="text-xs text-gray-400">AI-optimised vs baseline routing analysis</p>
        </div>
        {trips.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No trip data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Route</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Bins</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">AI Distance</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Baseline</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Saved (km)</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-500">Saving %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trips.map(trip => {
                  const saved = trip.baseline_distance_km - trip.ai_distance_km
                  const pct = savingsPct(trip.ai_distance_km, trip.baseline_distance_km)
                  return (
                    <tr key={trip.route_code} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">{trip.route_code}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{trip.bin_count}</td>
                      <td className="px-5 py-3 text-sm text-primary font-medium">{trip.ai_distance_km.toFixed(1)} km</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{trip.baseline_distance_km.toFixed(1)} km</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{saved.toFixed(1)} km</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary">
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
