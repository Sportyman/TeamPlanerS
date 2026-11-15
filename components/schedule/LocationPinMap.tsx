import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPinMapProps {
  lat?: number;
  lng?: number;
  onChangePin: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER: [number, number] = [32.0853, 34.7818];
const DEFAULT_ZOOM = 8;
const PIN_ZOOM = 15;

const createPinIcon = (): L.DivIcon =>
  L.divIcon({
    className: '',
    iconSize: [30, 40],
    iconAnchor: [15, 38],
    html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 6px rgba(15,23,42,0.35));display:block;">
      <path d="M15 1C7.82 1 2 6.82 2 14c0 9.6 13 24.5 13 24.5S28 23.6 28 14C28 6.82 22.18 1 15 1z" fill="#0284c7" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="15" cy="14" r="5" fill="#ffffff"/>
    </svg>`,
  });

export const LocationPinMap: React.FC<LocationPinMapProps> = ({ lat, lng, onChangePin }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangePinRef = useRef(onChangePin);
  onChangePinRef.current = onChangePin;

  const hasCoords = typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const initialCenter: [number, number] = hasCoords ? [lat!, lng!] : DEFAULT_CENTER;
    const initialZoom = hasCoords ? PIN_ZOOM : DEFAULT_ZOOM;

    const map = L.map(el, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      onChangePinRef.current(
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6))
      );
    });

    mapRef.current = map;

    const invalidateTimer = window.setTimeout(() => map.invalidateSize(), 120);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.invalidateSize()) : null;
    resizeObserver?.observe(el);

    return () => {
      window.clearTimeout(invalidateTimer);
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!hasCoords) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const targetLatLng: [number, number] = [lat!, lng!];
    if (!markerRef.current) {
      const marker = L.marker(targetLatLng, {
        draggable: true,
        icon: createPinIcon(),
      }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChangePinRef.current(
          Number(pos.lat.toFixed(6)),
          Number(pos.lng.toFixed(6))
        );
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(targetLatLng);
    }

    const currentZoom = map.getZoom();
    if (currentZoom < 13) {
      map.setView(targetLatLng, PIN_ZOOM, { animate: true });
    } else {
      map.panTo(targetLatLng, { animate: true });
    }
  }, [hasCoords, lat, lng]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
      <div
        ref={containerRef}
        dir="ltr"
        className="w-full h-56 sm:h-64 cursor-crosshair z-0"
        aria-label="מפה אינטראקטיבית לנעיצת סיכת מיקום"
      />
      <div className="pointer-events-none absolute top-2.5 right-2.5 z-[400] bg-white/95 border border-slate-200 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-sm">
        {hasCoords ? 'ניתן ללחוץ במפה או לגרור את הסיכה לדיוק מרבי' : 'לחץ על המפה להצבת סיכה'}
      </div>
    </div>
  );
};
