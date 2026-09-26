import L from 'leaflet';
import { Crosshair, KeyRound } from 'lucide-react';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import type { Place } from '@stray-city/shared';

import type { Coordinates } from '../lib/geo';
import { categoryMeta } from '../lib/format';

interface MapViewProps {
  places: Place[];
  selectedId: string | null;
  userLocation: Coordinates | null;
  onSelect: (place: Place) => void;
}

function createPlaceIcon(place: Place, selected: boolean) {
  const meta = categoryMeta[place.category];
  return L.divIcon({
    className: 'custom-marker-shell',
    html: `<div class="map-pin ${selected ? 'map-pin-selected' : ''}" style="--pin:${meta.color}"><span>${meta.icon}</span><b>${meta.label}</b></div>`,
    iconSize: [112, 42],
    iconAnchor: [20, 40],
  });
}

const locationIcon = L.divIcon({
  className: 'custom-marker-shell',
  html: '<div class="location-pin"><span>⌖</span><b>You</b></div>',
  iconSize: [72, 42],
  iconAnchor: [20, 40],
});

function MapSync({
  place,
  userLocation,
}: {
  place: Place | undefined;
  userLocation: Coordinates | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (place) map.flyTo([place.lat, place.lng], 14, { duration: 0.65 });
    else if (userLocation) map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 0.65 });
  }, [map, place, userLocation]);
  return null;
}

export function MapView({ places, selectedId, userLocation, onSelect }: MapViewProps) {
  const selected = places.find((place) => place.id === selectedId);
  const mapKey = import.meta.env.VITE_STADIA_MAPS_API_KEY?.trim();

  return (
    <div className="relative h-full min-h-[430px] overflow-hidden rounded-[28px] border border-ink/10 bg-[#d9e3dc] shadow-card">
      <MapContainer
        center={[40.731, -73.957]}
        zoom={11}
        minZoom={10}
        className="h-full min-h-[430px] w-full"
        zoomControl={false}
      >
        {mapKey && (
          <TileLayer
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; OpenStreetMap contributors'
            url={`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${mapKey}`}
          />
        )}
        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={createPlaceIcon(place, place.id === selectedId)}
            eventHandlers={{ click: () => onSelect(place) }}
          />
        ))}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={locationIcon} />
        )}
        <MapSync place={selected} userLocation={userLocation} />
      </MapContainer>
      {!mapKey && (
        <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-xs rounded-2xl border border-ink/10 bg-cream/95 p-3 shadow-card backdrop-blur">
          <div className="flex gap-2">
            <KeyRound className="mt-0.5 shrink-0 text-coral" size={17} />
            <div>
              <p className="text-sm font-bold">Map tiles paused</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink/60">
                Add a Stadia Maps key to render tiles. Pins and the synced list still work.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex items-center gap-2 rounded-full bg-cream/90 px-3 py-2 text-xs font-bold shadow-card">
        <Crosshair size={14} className="text-blue" /> {places.length} discoveries in view
      </div>
    </div>
  );
}
