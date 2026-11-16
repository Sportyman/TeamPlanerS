import type { GeoPlaceResult } from './geocodingService';

export type ParsedMapLinkResult =
  | { kind: 'COORDS'; lat: number; lng: number; label?: string }
  | { kind: 'SHORT_LINK'; provider: string };

const isValidLatLng = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const isWithinIsraelRegion = (lat: number, lng: number): boolean =>
  lat >= 29.0 && lat <= 33.6 && lng >= 34.0 && lng <= 36.2;

const decodePlaceSegment = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  try {
    const cleaned = decodeURIComponent(raw.replace(/\+/g, ' ')).trim();
    if (!cleaned || /^-?\d+\.\d+[, ]+-?\d+\.\d+$/.test(cleaned)) return undefined;
    return cleaned;
  } catch {
    return undefined;
  }
};

export const parseMapLinkOrCoords = (rawInput: string): ParsedMapLinkResult | null => {
  const input = rawInput.trim();
  if (!input) return null;

  const lower = input.toLowerCase();
  if (/https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com\/ul|ul\.waze\.com)\b/.test(lower)) {
    const provider = lower.includes('waze') ? 'Waze' : 'Google Maps';
    return { kind: 'SHORT_LINK', provider };
  }

  // Raw decimal coordinates (e.g. "32.0972, 34.7783" or "32.0972 34.7783")
  const rawCoordMatch = input.match(/^\s*(-?\d{1,2}\.\d{3,})\s*[,\s]\s*(-?\d{1,3}\.\d{3,})\s*$/);
  if (rawCoordMatch) {
    const lat = parseFloat(rawCoordMatch[1]);
    const lng = parseFloat(rawCoordMatch[2]);
    if (isValidLatLng(lat, lng)) return { kind: 'COORDS', lat, lng };
  }

  if (!/https?:\/\/|google\.com\/maps|waze\.com|openstreetmap\.org|maps\.apple\.com/i.test(input)) {
    return null;
  }

  const placeNameMatch = input.match(/\/maps\/place\/([^/?@#]+)/i);
  const queryLabelMatch = input.match(/[?&](?:q|query)=([^&]+)/i);
  const decodedQuery = decodePlaceSegment(queryLabelMatch?.[1]);
  const extractedLabel = decodePlaceSegment(placeNameMatch?.[1]) || decodedQuery;

  // Prefer exact pin marker (!3dLAT!4dLNG) in Google Maps URLs over viewport (@LAT,LNG)
  const pinMatch = input.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pinMatch) {
    const lat = parseFloat(pinMatch[1]);
    const lng = parseFloat(pinMatch[2]);
    if (isValidLatLng(lat, lng)) return { kind: 'COORDS', lat, lng, label: extractedLabel };
  }

  // Waze / Google / Apple ll= or q=lat,lng or mlat=/mlon= or OSM #map=zoom/lat/lng
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:q|ll|query|destination|sll|center)=(-?\d+\.\d+)(?:,|%2C|\s)(-?\d+\.\d+)/i,
    /#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/i,
  ];
  for (const rx of patterns) {
    const m = input.match(rx);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (isValidLatLng(lat, lng)) return { kind: 'COORDS', lat, lng, label: extractedLabel };
    }
  }

  const mlat = input.match(/[?&]mlat=(-?\d+\.\d+)/i);
  const mlon = input.match(/[?&]mlon=(-?\d+\.\d+)/i);
  if (mlat && mlon) {
    const lat = parseFloat(mlat[1]);
    const lng = parseFloat(mlon[1]);
    if (isValidLatLng(lat, lng)) return { kind: 'COORDS', lat, lng, label: extractedLabel };
  }

  return null;
};

interface WikiPageItem {
  pageid: number;
  title: string;
  index?: number;
  description?: string;
  coordinates?: Array<{ lat: number; lon: number }>;
}

export const searchHebrewWikipediaPlaces = async (
  query: string,
  signal?: AbortSignal
): Promise<GeoPlaceResult[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: trimmed,
    gsrlimit: '8',
    prop: 'coordinates|description',
    colimit: 'max',
    origin: '*',
    format: 'json',
  });

  const res = await fetch(`https://he.wikipedia.org/w/api.php?${params.toString()}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { query?: { pages?: Record<string, WikiPageItem> } };
  const pages = Object.values(data.query?.pages || {});

  return pages
    .filter((p) => {
      const c = p.coordinates?.[0];
      return Boolean(c && isWithinIsraelRegion(c.lat, c.lon));
    })
    .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
    .slice(0, 4)
    .map((p) => {
      const c = p.coordinates![0];
      return {
        placeId: -Math.abs(p.pageid),
        primaryName: p.title,
        secondaryText: p.description ? `${p.description} · אתר מוכר` : 'אתר / מוסד מוכר',
        areaLabel: p.title,
        lat: c.lat,
        lng: c.lon,
        source: 'WIKIPEDIA',
      };
    });
};

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    countrycode?: string;
  };
}

export const searchPhotonPlacesInIsrael = async (
  query: string,
  signal?: AbortSignal
): Promise<GeoPlaceResult[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    lat: '32.0853',
    lon: '34.7818',
    limit: '5',
  });

  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const features = Array.isArray(data.features) ? data.features : [];

  const results: GeoPlaceResult[] = [];
  for (let i = 0; i < features.length; i += 1) {
    const f = features[i];
    const p = f.properties || {};
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lng, lat] = coords;
    if (!isValidLatLng(lat, lng)) continue;
    if (p.countrycode && p.countrycode.toUpperCase() !== 'IL' && !isWithinIsraelRegion(lat, lng)) continue;

    const streetLine = [p.street, p.housenumber].filter(Boolean).join(' ').trim();
    const primaryName = (p.name || streetLine || p.city || '').trim();
    if (!primaryName) continue;
    const secondaryParts = [p.name ? streetLine : '', p.district, p.city].filter(
      (part) => Boolean(part && part !== primaryName)
    );
    const secondaryText = secondaryParts.slice(0, 2).join(', ');
    const areaLabel = p.city && !primaryName.includes(p.city) ? `${primaryName}, ${p.city}` : primaryName;

    results.push({
      placeId: (p.osm_id || 100000 + i) * 10 + 7,
      primaryName,
      secondaryText,
      areaLabel,
      lat,
      lng,
      source: 'OSM',
    });
  }
  return results;
};
