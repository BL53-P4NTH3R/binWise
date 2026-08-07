import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { driverApi, binsApi } from '../../api'
import type { RouteRead, BinLive } from '../../types'
import { FillBar, FillBadge, PageLoader, Btn, Empty } from '../../components/ui'
import { DriverBottomTabs } from './DriverHomePage'
import BinMap from '../../components/map/BinMap'
import { fillPctToStatus } from '../../utils'

export default function DriverRoutePage() {
  const navigate = useNavigate()
  const [route, setRoute] = useState<RouteRead | null>(null)
  const [bins, setBins] = useState<BinLive[]>([])
  const [loading, setLoading] = useState(true)
  const [noRoute, setNoRoute] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [showSkip, setShowSkip] = useState(false)
  const [skipReason, setSkipReason] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [routeRes, binsRes] = await Promise.all([
        driverApi.getRoute(),
        binsApi.getLive(),
      ])
      setRoute(routeRes.data)
      setBins(binsRes.data)
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

  useEffect(() => { fetchData() }, [fetchData])

  const handleCollect = async (binId: string) => {
    setCollecting(true)
    try {
      const { data } = await driverApi.collect(binId)
      setRoute(data)
      toast.success('Bin collected! ✓')
    } catch {
      toast.error('Failed to mark as collected')
    } finally {
      setCollecting(false)
    }
  }

  const sorted = route?.waypoints
    ? [...route.waypoints].sort((a, b) => a.stop_order - b.stop_order)
    : []
  const collected = sorted.filter(w => w.status === 'collected').length
  const total = sorted.length
  const currentStop = sorted.find(w => w.status === 'pending')
  const nextStop = currentStop
    ? sorted.find(w => w.status === 'pending' && w.stop_order > currentStop.stop_order)
    : null
  const currentBin = currentStop
    ? bins.find(b => b.id === currentStop.bin_id)
    : null
  const allDone = total > 0 && collected === total
  const routeBins = route
    ? bins.filter(b => route.waypoints.some(wp => wp.bin_id === b.id))
    : []

  if (loading) return (
    <div className="driver-layout flex items-center justify-center min-h-screen">
      <PageLoader />
    </div>
  )

  if (noRoute) return (
    <div className="driver-layout pb-20 pt-4 px-4">
      <Empty title="No route assigned yet" description="Check back later for your next collection route." />
      <DriverBottomTabs active="route" />
    </div>
  )

  return (
    <div className="driver-layout pb-20">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/driver')} className="text-gray-500 hover:text-gray-700">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">{route?.route_code ?? 'Route'}</p>
        </div>
        <span className="text-xs font-semibold text-gray-500">{collected} of {total}</span>
      </div>

      {/* Progress bar strip */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${total > 0 ? (collected / total) * 100 : 0}%` }}
        />
      </div>

      {/* Completion state */}
      {allDone ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center fade-in">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Route complete!</h2>
          <p className="text-sm text-gray-500 mb-6">
            You&apos;ve collected all {total} bins on this route. Great work!
          </p>
          <Btn onClick={() => navigate('/driver')}>Back to Home</Btn>
        </div>
      ) : (
        <>
          {/* Map — top 55% */}
          <div style={{ height: '45vh' }}>
            <BinMap
              bins={routeBins}
              height="100%"
              className="rounded-none"
              routeWaypoints={route?.waypoints}
              routeBins={routeBins}
              showPolyline
              selectedBinId={currentBin?.id}
            />
          </div>

          {/* Bottom action sheet */}
          <div className="px-4 py-4 space-y-4">
            {/* Current stop card */}
            {currentStop && currentBin && (
              <div className="rounded-xl bg-white p-4 shadow-md border border-gray-100 fade-in">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                    {currentStop.stop_order}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{currentBin.bin_code}</p>
                    <p className="text-xs text-gray-500">{currentBin.location_name}</p>
                  </div>
                  <FillBadge
                    status={currentStop.fill_pct_at_generation != null ? fillPctToStatus(currentStop.fill_pct_at_generation) : currentBin.fill_status}
                    pct={currentStop.fill_pct_at_generation ?? currentBin.fill_pct}
                  />
                </div>
                <FillBar
                  pct={currentStop.fill_pct_at_generation ?? currentBin.fill_pct}
                  showLabel
                  height="h-3"
                />

                {/* Collect button */}
                <button
                  onClick={() => handleCollect(currentBin.id)}
                  disabled={collecting}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-white shadow-lg shadow-primary/30 transition-all active:scale-[0.98] disabled:bg-primary-300"
                >
                  {collecting ? (
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <span className="text-lg">✓</span>
                  )}
                  {collecting ? 'Collecting...' : 'Mark as collected'}
                </button>

                {/* Skip option */}
                <div className="mt-3 text-center">
                  {!showSkip ? (
                    <button
                      onClick={() => setShowSkip(true)}
                      className="text-xs font-medium text-gray-400 hover:text-gray-600"
                    >
                      Skip this stop
                    </button>
                  ) : (
                    <div className="space-y-2 fade-in">
                      <textarea
                        value={skipReason}
                        onChange={e => setSkipReason(e.target.value)}
                        placeholder="Reason for skipping..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Btn size="sm" variant="secondary" className="flex-1" onClick={() => { setShowSkip(false); setSkipReason('') }}>
                          Cancel
                        </Btn>
                        <Btn size="sm" variant="warning" className="flex-1">
                          Confirm Skip
                        </Btn>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Next stop preview */}
            {nextStop && (
              <div className="rounded-lg bg-gray-50 px-4 py-3 flex items-center gap-3">
                <span className="text-xs text-gray-400">Next →</span>
                <span className="text-xs font-medium text-gray-700">
                  Stop {nextStop.stop_order}
                  {nextStop.fill_pct_at_generation != null && ` · ${nextStop.fill_pct_at_generation}% full`}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      <DriverBottomTabs active="route" />
    </div>
  )
}
