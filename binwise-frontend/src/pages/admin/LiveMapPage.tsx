import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { binsApi, zonesApi } from '../../api'
import type { BinLive, Zone } from '../../types'
import { FillBadge, FillBar, PageLoader } from '../../components/ui'
import BinMap from '../../components/map/BinMap'
import { fmtRelative } from '../../utils'

export default function LiveMapPage() {
  const [bins, setBins] = useState<BinLive[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBin, setSelectedBin] = useState<BinLive | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)

  // Filters
  const [showNormal, setShowNormal] = useState(true)
  const [showWarning, setShowWarning] = useState(true)
  const [showOverflow, setShowOverflow] = useState(true)
  const [showOffline, setShowOffline] = useState(true)
  const [zoneFilter, setZoneFilter] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [binsRes, zonesRes] = await Promise.all([
        binsApi.getLive(),
        zonesApi.getAll(),
      ])
      setBins(binsRes.data)
      setZones(zonesRes.data)
    } catch {
      toast.error('Failed to load map data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filteredBins = bins.filter(bin => {
    if (!showNormal && bin.fill_status === 'normal') return false
    if (!showWarning && bin.fill_status === 'warning') return false
    if (!showOverflow && bin.fill_status === 'overflow') return false
    if (!showOffline && bin.status === 'offline') return false
    return true
  })

  if (loading) return <PageLoader />

  return (
    <div className="relative fade-in" style={{ height: 'calc(100vh - 110px)' }}>
      {/* Toggle panel button */}
      <button
        onClick={() => setPanelOpen(v => !v)}
        className="absolute top-3 left-3 z-10 rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-lg hover:bg-gray-50 border border-gray-200"
      >
        {panelOpen ? '✕ Close' : '☰ Filters'}
      </button>

      {/* Filter panel — left overlay on desktop, bottom sheet on mobile */}
      {panelOpen && (
        <>
          {/* Desktop: left overlay panel */}
          <div className="hidden md:block absolute top-0 left-0 z-10 h-full w-[280px] bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-xl overflow-y-auto fade-in">
            <div className="p-4 pt-14 space-y-5">
              {/* Status filters */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Status Filter</h3>
                <div className="space-y-2">
                  {[
                    { key: 'normal', label: 'Normal', color: 'bg-primary', state: showNormal, set: setShowNormal },
                    { key: 'warning', label: 'Warning', color: 'bg-warning', state: showWarning, set: setShowWarning },
                    { key: 'overflow', label: 'Overflow', color: 'bg-danger', state: showOverflow, set: setShowOverflow },
                    { key: 'offline', label: 'Offline', color: 'bg-gray-400', state: showOffline, set: setShowOffline },
                  ].map(f => (
                    <label key={f.key} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={f.state}
                        onChange={() => f.set(!f.state)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className={`h-2.5 w-2.5 rounded-full ${f.color}`} />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Zone filter */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Zone</h3>
                <select
                  value={zoneFilter}
                  onChange={e => setZoneFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">All zones</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              {/* Count */}
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                <p className="text-sm font-medium text-gray-700">
                  Showing <span className="text-primary font-bold">{filteredBins.length}</span> of{' '}
                  <span className="font-bold">{bins.length}</span> bins
                </p>
              </div>

              {/* Selected bin detail */}
              {selectedBin && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-900">{selectedBin.bin_code}</h4>
                    <FillBadge status={selectedBin.fill_status} pct={selectedBin.fill_pct} />
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{selectedBin.location_name}</p>
                  <FillBar pct={selectedBin.fill_pct} status={selectedBin.fill_status} showLabel height="h-3" />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-gray-400">Status</p>
                      <p className="font-semibold text-gray-700 capitalize">{selectedBin.status}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-gray-400">Last read</p>
                      <p className="font-semibold text-gray-700">{fmtRelative(selectedBin.last_reading)}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-400 text-center">
                    {selectedBin.latitude.toFixed(5)}, {selectedBin.longitude.toFixed(5)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: bottom sheet */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-2xl max-h-[60vh] overflow-y-auto fade-in">
            <div className="p-4 space-y-4">
              {/* Drag indicator */}
              <div className="flex justify-center">
                <div className="h-1 w-10 rounded-full bg-gray-300" />
              </div>

              {/* Count */}
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                <p className="text-sm font-medium text-gray-700">
                  Showing <span className="text-primary font-bold">{filteredBins.length}</span> of{' '}
                  <span className="font-bold">{bins.length}</span> bins
                </p>
              </div>

              {/* Filters in a compact horizontal layout */}
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'normal', label: 'Normal', color: 'bg-primary', state: showNormal, set: setShowNormal },
                  { key: 'warning', label: 'Warning', color: 'bg-warning', state: showWarning, set: setShowWarning },
                  { key: 'overflow', label: 'Overflow', color: 'bg-danger', state: showOverflow, set: setShowOverflow },
                  { key: 'offline', label: 'Offline', color: 'bg-gray-400', state: showOffline, set: setShowOffline },
                ].map(f => (
                  <label key={f.key} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.state}
                      onChange={() => f.set(!f.state)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className={`h-2 w-2 rounded-full ${f.color}`} />
                    <span className="text-xs text-gray-700">{f.label}</span>
                  </label>
                ))}
              </div>

              {/* Zone */}
              <select
                value={zoneFilter}
                onChange={e => setZoneFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">All zones</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>

              {/* Selected bin detail */}
              {selectedBin && (
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-900">{selectedBin.bin_code}</h4>
                    <FillBadge status={selectedBin.fill_status} pct={selectedBin.fill_pct} />
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{selectedBin.location_name}</p>
                  <FillBar pct={selectedBin.fill_pct} status={selectedBin.fill_status} showLabel height="h-2.5" />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Map */}
      <BinMap
        bins={filteredBins}
        selectedBinId={selectedBin?.id}
        onBinClick={setSelectedBin}
        height="100%"
        className="rounded-none"
      />
    </div>
  )
}
