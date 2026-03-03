import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapPicker.css'

// Fix leaflet default marker icons broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/** Flies the map view to updated coordinates */
function MapMover({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.5 })
    }
  }, [lat, lng]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/** Fires onClick when user clicks anywhere on the map */
function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) })
  return null
}

/**
 * MapPicker — optional interactive location pin selector
 *
 * Props:
 *   latitude          {number|null}
 *   longitude         {number|null}
 *   onCoordinatesChange   ({ lat, lng }) => void
 *   onLocationTextChange  (text: string) => void   — called with reverse-geocoded address
 */
export default function MapPicker({ latitude, longitude, onCoordinatesChange, onLocationTextChange }) {
  const hasPin = latitude != null && longitude != null
  const [expanded, setExpanded] = useState(hasPin)

  // Reverse-geocode via Nominatim and propagate address text
  const reverseGeocode = async (lat, lng) => {
    if (!onLocationTextChange) return
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      )
      const d = await r.json()
      if (d.display_name) onLocationTextChange(d.display_name)
    } catch {}
  }

  const handleMapClick = ({ lat, lng }) => {
    onCoordinatesChange({ lat, lng })
    reverseGeocode(lat, lng)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onCoordinatesChange({ lat: null, lng: null })
  }

  const initCenter = hasPin ? [latitude, longitude] : [39.5, -98.35]
  const initZoom = hasPin ? 16 : 4

  return (
    <div className="map-picker">
      <div className="map-picker-header">
        <button
          type="button"
          className={`map-picker-toggle${hasPin ? ' has-pin' : ''}`}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="map-picker-icon">🗺️</span>
          {expanded
            ? 'Ukryj mapę'
            : hasPin
            ? 'Zmień lokalizację na mapie'
            : 'Wybierz lokalizację na mapie'}
          {!hasPin && <span className="map-picker-optional">(opcjonalne)</span>}
          {hasPin && !expanded && <span className="map-picker-check">✓</span>}
        </button>
        {hasPin && (
          <button type="button" className="map-picker-clear" onClick={handleClear} title="Usuń pinezkę">
            ✕
          </button>
        )}
      </div>

      {expanded && (
        <div className="map-picker-wrap">
          <MapContainer
            center={initCenter}
            zoom={initZoom}
            style={{ height: 280, width: '100%', borderRadius: '0 0 8px 8px' }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <ClickHandler onClick={handleMapClick} />
            <MapMover lat={latitude} lng={longitude} />
            {hasPin && (
              <Marker
                position={[latitude, longitude]}
                draggable
                eventHandlers={{ dragend: (e) => handleMapClick(e.target.getLatLng()) }}
              />
            )}
          </MapContainer>
          <p className="map-picker-hint">
            {hasPin
              ? `📍 ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)} · kliknij lub przeciągnij pinezkę, aby zmienić`
              : 'Kliknij na mapie, żeby ustawić pinezkę. Adres zostanie automatycznie wpisany powyżej.'}
          </p>
        </div>
      )}
    </div>
  )
}
