import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, ExternalLink } from 'lucide-react';

interface HospitalLocationMapProps {
  hospitalName: string;
  hospitalAddress: string;
  city: string;
  latitude: number;
  longitude: number;
  heightClass?: string;
}

const hospitalMarkerIcon = L.divIcon({
  className: 'custom-hospital-pin',
  html: `<div style="width:32px;height:32px;border-radius:9999px;background:#dc2626;border:3px solid #ffffff;box-shadow:0 4px 12px rgba(220,38,38,0.45);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:16px;line-height:1;">+</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

export function HospitalLocationMap({
  hospitalName,
  hospitalAddress,
  city,
  latitude,
  longitude,
  heightClass = 'h-56',
}: HospitalLocationMapProps) {
  const safeLat = Number.isFinite(latitude) ? latitude : 13.0827;
  const safeLng = Number.isFinite(longitude) ? longitude : 80.2707;
  const mapsDirectionsUrl = `https://www.openstreetmap.org/?mlat=${safeLat}&mlon=${safeLng}#map=15/${safeLat}/${safeLng}`;

  return (
    <div className="rounded-2xl overflow-hidden border border-red-200 dark:border-red-900/60 bg-slate-100 dark:bg-slate-900">
      <div className={heightClass + ' w-full relative z-0'}>
        <MapContainer
          key={`${safeLat.toFixed(4)}_${safeLng.toFixed(4)}`}
          center={[safeLat, safeLng]}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[safeLat, safeLng]} icon={hospitalMarkerIcon}>
            <Popup>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-slate-900">{hospitalName}</p>
                <p className="text-slate-600">{hospitalAddress}</p>
                <p className="text-slate-500">{city}</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-t border-red-100 dark:border-red-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
          <MapPin size={14} className="text-red-600 shrink-0" />
          <span className="truncate font-medium">
            {hospitalName} · {hospitalAddress}, {city}
          </span>
        </div>
        <a
          href={mapsDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-red-600 hover:text-red-700 shrink-0"
        >
          <span>Open Map</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
