import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';

interface NominatimItem {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
  };
}

interface PlaceSearchInputProps {
  value: string;
  onChangeText: (name: string) => void;
  onSelectPlace: (name: string, coords?: { lat: number; lng: number }) => void;
  onSubmitEnter: () => void;
}

const formatPlaceSuggestion = (item: NominatimItem): { primary: string; secondary: string; combined: string } => {
  const parts = item.display_name.split(',').map((p) => p.trim()).filter(Boolean);
  const primary = (item.name || parts[0] || '').trim();
  const city =
    item.address?.city ||
    item.address?.town ||
    item.address?.village ||
    item.address?.municipality ||
    parts[1] ||
    '';
  const secondary = parts.slice(1, 3).join(', ');
  const combined =
    primary && city && !primary.includes(city) ? `${primary} (${city})` : primary || item.display_name;
  return { primary, secondary, combined };
};

export const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({
  value,
  onChangeText,
  onSelectPlace,
  onSubmitEnter,
}) => {
  const skipNextFetchRef = useRef(false);
  const [suggestions, setSuggestions] = useState<NominatimItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          format: 'jsonv2',
          addressdetails: '1',
          'accept-language': 'he',
          countrycodes: 'il',
          limit: '6',
          q: trimmed,
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as NominatimItem[];
        if (!controller.signal.aborted && Array.isArray(data)) {
          setSuggestions(data);
          setDropdownOpen(data.length > 0);
        }
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  const handlePick = (item: NominatimItem) => {
    const { combined } = formatPlaceSuggestion(item);
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const coords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
    skipNextFetchRef.current = true;
    setDropdownOpen(false);
    setSuggestions([]);
    onSelectPlace(combined, coords);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onFocus={() => suggestions.length > 0 && setDropdownOpen(true)}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setDropdownOpen(false);
              onSubmitEnter();
            } else if (e.key === 'Escape') {
              setDropdownOpen(false);
            }
          }}
          placeholder="חפש אזור / מרינה / חוף / כתובת בישראל, או הקלד שם..."
          className="w-full pr-9 pl-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
        />
        {isLoading ? (
          <Loader2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500 animate-spin" />
        ) : value ? (
          <button
            type="button"
            onClick={() => {
              onChangeText('');
              setSuggestions([]);
              setDropdownOpen(false);
            }}
            aria-label="נקה חיפוש"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400 font-medium">
        <span>חיפוש חינמי פתוח (OpenStreetMap) לשמירת אזור לחיווי מזג אוויר וגלים</span>
      </div>

      {dropdownOpen && suggestions.length > 0 && (
        <ul className="absolute right-0 left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
          {suggestions.map((item) => {
            const { primary, secondary } = formatPlaceSuggestion(item);
            return (
              <li key={item.place_id}>
                <button
                  type="button"
                  onClick={() => handlePick(item)}
                  className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-brand-50 flex items-start gap-2.5 transition-colors"
                >
                  <MapPin size={15} className="text-brand-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-800 whitespace-normal break-words leading-snug">
                      {primary}
                    </div>
                    {secondary && (
                      <div className="text-xs text-slate-500 whitespace-normal break-words mt-0.5">
                        {secondary}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
