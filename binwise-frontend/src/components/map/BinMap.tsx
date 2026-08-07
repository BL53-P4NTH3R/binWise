import { useEffect, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  Marker,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import type { BinLive, WaypointRead } from '../../types'
import { fillStatusHex } from '../../utils'
import { FillBadge, FillBar } from '../ui'

// ─── Constants ────────────────────────────────────────────────────────────────

const SAMARU_CENTER: [number, number] = [11.1558, 7.6228]
const DEFAULT_ZOOM = 15

// ─── Fix default marker icons ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── Numbered marker icon ─────────────────────────────────────────────────────

function createNumberedIcon(num: number, color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background:${color};
      color:white;
      width:28px; height:28px;
      border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:12px; font-weight:700;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    ">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// ─── Map center helper ────────────────────────────────────────────────────────

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const initial = useRef(true)
  useEffect(() => {
    if (initial.current) {
      initial.current = false
      map.setView(center, zoom)
    }
  }, [map, center, zoom])
  return null
}

// ─── BinMap component ─────────────────────────────────────────────────────────

interface BinMapProps {
  bins: BinLive[]
  selectedBinId?: string | null
  onBinClick?: (bin: BinLive) => void
  height?: string
  className?: string
  // Route overlay
  routeWaypoints?: WaypointRead[]
  routeBins?: BinLive[]
  showPolyline?: boolean
  center?: [number, number]
  zoom?: number
}

export default function BinMap({
  bins,
  selectedBinId,
  onBinClick,
  height = '100%',
  className = '',
  routeWaypoints,
  routeBins,
  showPolyline = false,
  center = SAMARU_CENTER,
  zoom = DEFAULT_ZOOM,
}: BinMapProps) {
  // Build polyline coordinates from waypoints
  const polylineCoords: [number, number][] = []
  if (showPolyline && routeWaypoints && routeBins) {
    const sorted = [...routeWaypoints].sort((a, b) => a.stop_order - b.stop_order)
    for (const wp of sorted) {
      const bin = routeBins.find(b => b.id === wp.bin_id)
      if (bin) polylineCoords.push([bin.latitude, bin.longitude])
    }
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%' }}
      className={`rounded-xl ${className}`}
      scrollWheelZoom
    >
      <MapUpdater center={center} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Bin CircleMarkers */}
      {bins.map(bin => {
        const isOverflow = bin.fill_status === 'overflow'
        const color = fillStatusHex(bin.fill_status)
        const isSelected = selectedBinId === bin.id

        return (
          <CircleMarker
            key={bin.id}
            center={[bin.latitude, bin.longitude]}
            radius={isSelected ? 12 : 9}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.85,
              color: isSelected ? '#111827' : 'white',
              weight: isSelected ? 3 : 2,
              className: isOverflow ? 'bin-marker-overflow' : '',
            }}
            eventHandlers={{
              click: () => onBinClick?.(bin),
            }}
          >
            <Popup>
              <div className="min-w-[180px] p-1">
                <p className="text-sm font-bold text-gray-900">{bin.bin_code}</p>
                <p className="text-xs text-gray-500 mb-2">{bin.location_name}</p>
                <FillBar pct={bin.fill_pct} status={bin.fill_status} showLabel />
                <div className="flex items-center justify-between mt-2">
                  <FillBadge status={bin.fill_status} pct={bin.fill_pct} />
                  <span className="text-[10px] text-gray-400">{bin.status}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {/* Route polyline */}
      {showPolyline && polylineCoords.length > 1 && (
        <Polyline
          positions={polylineCoords}
          pathOptions={{
            color: '#1D9E75',
            weight: 3,
            dashArray: '8 6',
            opacity: 0.8,
          }}
        />
      )}

      {/* Route numbered markers */}
      {showPolyline && routeWaypoints && routeBins && (
        <>
          {[...routeWaypoints]
            .sort((a, b) => a.stop_order - b.stop_order)
            .map(wp => {
              const bin = routeBins.find(b => b.id === wp.bin_id)
              if (!bin) return null
              const isCollected = wp.status === 'collected'
              const color = isCollected ? '#9CA3AF' : '#1D9E75'
              return (
                <Marker
                  key={wp.id}
                  position={[bin.latitude, bin.longitude]}
                  icon={createNumberedIcon(wp.stop_order, color)}
                >
                  <Popup>
                    <div className="min-w-[160px] p-1">
                      <p className="text-sm font-bold">Stop {wp.stop_order}</p>
                      <p className="text-xs text-gray-600">{bin.bin_code} — {bin.location_name}</p>
                      <p className="text-xs mt-1">
                        {isCollected ? '✓ Collected' : wp.status === 'skipped' ? '⊘ Skipped' : '○ Pending'}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
        </>
      )}
    </MapContainer>
  )
}
