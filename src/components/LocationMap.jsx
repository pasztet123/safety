import React from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapPicker.css'

// Fix leaflet default marker icons broken by bundlers (shared fix, idempotent)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/**
 * LocationMap — read-only map showing a saved pin.
 * Renders nothing when latitude/longitude are absent.
 *
 * Props:
 *   latitude  {number|null}
 *   longitude {number|null}
 *   height    {number}  — map height in px (default 200)
 */
export default function LocationMap({ latitude, longitude, height = 200 }) {
  if (latitude == null || longitude == null) return null

  return (
    <div className="location-map-wrap">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        style={{ height, width: '100%', borderRadius: 8 }}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        keyboard={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[latitude, longitude]} />
      </MapContainer>
      <p className="location-map-coords">
        📍 {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
      </p>
    </div>
  )
}
