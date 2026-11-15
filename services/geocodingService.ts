export interface GeoPlaceResult {
  placeId: number;
  primaryName: string;
  secondaryText: string;
  areaLabel: string;
  lat: number;
  lng: number;
}

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  marina?: string;
  leisure?: string;
  beach?: string;
}

interface NominatimResponseItem {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

const getCityName = (addr?: NominatimAddress): string =>
  (addr?.city || addr?.town || addr?.village || addr?.municipality || '').trim();

export const buildAreaLabel = (item: Pick<NominatimResponseItem, 'name' | 'display_name' | 'address'>): string => {
  const parts = (item.display_name || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const addr = item.address;
  const city = getCityName(addr) || parts[1] || '';
  const spot = (
    item.name ||
    addr?.marina ||
    addr?.beach ||
    addr?.leisure ||
    addr?.neighbourhood ||
    addr?.suburb ||
    addr?.road ||
    addr?.pedestrian ||
    parts[0] ||
    ''
  ).trim();

  if (spot && city && !spot.includes(city) && spot !== city) {
    return `${spot}, ${city}`;
  }
  return spot || city || parts.slice(0, 2).join(', ');
};

export const searchPlacesInIsrael = async (
  query: string,
  signal?: AbortSignal
): Promise<GeoPlaceResult[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': 'he',
    countrycodes: 'il',
    limit: '6',
    q: trimmed,
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    signal,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as NominatimResponseItem[];
  if (!Array.isArray(data)) return [];

  const results: GeoPlaceResult[] = [];
  for (const item of data) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const parts = item.display_name.split(',').map((p) => p.trim()).filter(Boolean);
    const primaryName = (item.name || parts[0] || item.display_name).trim();
    const secondaryText = parts.slice(1, 3).join(', ');
    results.push({
      placeId: item.place_id,
      primaryName,
      secondaryText,
      areaLabel: buildAreaLabel(item),
      lat,
      lng,
    });
  }
  return results;
};

export const reverseGeocodeCoords = async (
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<string | null> => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': 'he',
    zoom: '15',
    lat: lat.toFixed(6),
    lon: lng.toFixed(6),
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    signal,
  });
  if (!res.ok) return null;

  const data = (await res.json()) as NominatimResponseItem & { error?: string };
  if (!data || data.error || !data.display_name) return null;

  const label = buildAreaLabel(data).trim();
  return label || null;
};
