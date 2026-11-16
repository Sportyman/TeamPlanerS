import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Link2, Loader2, MapPin, Search, X } from 'lucide-react';
import { GeoPlaceResult, reverseGeocodeCoords, searchPlacesInIsrael } from '../../services/geocodingService';
import { parseMapLinkOrCoords } from '../../services/placeLinkParser';

interface PlaceSearchInputProps {
  query: string;
  onChangeQuery: (q: string) => void;
  onSelectPlace: (place: GeoPlaceResult) => void;
}

export const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({
  query,
  onChangeQuery,
  onSelectPlace,
}) => {
  const skipNextFetchRef = useRef(false);
  const onSelectRef = useRef(onSelectPlace);
  onSelectRef.current = onSelectPlace;

  const [suggestions, setSuggestions] = useState<GeoPlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [noMatchForQuery, setNoMatchForQuery] = useState(false);
  const [shortLinkProvider, setShortLinkProvider] = useState<string | null>(null);
  const [linkAppliedNotice, setLinkAppliedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const trimmed = query.trim();
    setShortLinkProvider(null);
    if (trimmed.length < 2) {
      setSuggestions([]);
      setNoMatchForQuery(false);
      setIsLoading(false);
      setLinkAppliedNotice(null);
      return;
    }

    const parsed = parseMapLinkOrCoords(trimmed);
    if (parsed?.kind === 'SHORT_LINK') {
      setSuggestions([]);
      setNoMatchForQuery(false);
      setDropdownOpen(false);
      setIsLoading(false);
      setLinkAppliedNotice(null);
      setShortLinkProvider(parsed.provider);
      return;
    }

    if (parsed?.kind === 'COORDS') {
      const controller = new AbortController();
      setSuggestions([]);
      setNoMatchForQuery(false);
      setDropdownOpen(false);
      setIsLoading(true);
      (async () => {
        try {
          const resolved = parsed.label || (await reverseGeocodeCoords(parsed.lat, parsed.lng, controller.signal)) || '';
          if (controller.signal.aborted) return;
          const label = resolved || `${parsed.lat.toFixed(4)}, ${parsed.lng.toFixed(4)}`;
          skipNextFetchRef.current = true;
          setLinkAppliedNotice(`המיקום נקלט מהקישור: ${label}`);
          onSelectRef.current({
            placeId: -Date.now(),
            primaryName: label,
            secondaryText: 'נקלט מקישור / קואורדינטות',
            areaLabel: resolved,
            lat: parsed.lat,
            lng: parsed.lng,
            source: 'LINK',
          });
        } finally {
          if (!controller.signal.aborted) setIsLoading(false);
        }
      })();
      return () => controller.abort();
    }

    setLinkAppliedNotice(null);
    const controller = new AbortController();
    setIsLoading(true);
    setNoMatchForQuery(false);

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchPlacesInIsrael(trimmed, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(results);
          setDropdownOpen(results.length > 0);
          setNoMatchForQuery(results.length === 0);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setNoMatchForQuery(false);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const handlePick = (item: GeoPlaceResult) => {
    skipNextFetchRef.current = true;
    setDropdownOpen(false);
    setNoMatchForQuery(false);
    setShortLinkProvider(null);
    setLinkAppliedNotice(null);
    setSuggestions([]);
    onSelectPlace(item);
  };

  const handleClear = () => {
    onChangeQuery('');
    setSuggestions([]);
    setNoMatchForQuery(false);
    setShortLinkProvider(null);
    setLinkAppliedNotice(null);
    setDropdownOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => suggestions.length > 0 && setDropdownOpen(true)}
          onChange={(e) => onChangeQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') setDropdownOpen(false); }}
          placeholder="חפש כתובת או מקום ידוע, או הדבק קישור מ-Google Maps / Waze..."
          className="w-full pr-9 pl-9 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-brand-500 min-h-[44px]"
        />
        {isLoading ? (
          <Loader2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500 animate-spin" />
        ) : query ? (
          <button type="button" onClick={handleClear} aria-label="נקה חיפוש אזור" className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        ) : null}
      </div>

      {shortLinkProvider && !isLoading && (
        <div className="mt-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 flex items-start gap-2 leading-snug">
          <Link2 size={14} className="text-amber-700 shrink-0 mt-0.5" />
          <span>
            זהו קישור מקוצר מ-{shortLinkProvider}. פתח אותו בדפדפן והעתק את הכתובת המלאה משורת הכתובת (או העתק קואורדינטות כמו{' '}
            <span className="font-mono" dir="ltr">32.0972, 34.7783</span>) והדבק כאן.
          </span>
        </div>
      )}

      {linkAppliedNotice && !isLoading && (
        <p className="mt-1.5 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 leading-snug">
          <CheckCircle2 size={13} className="shrink-0" />
          <span>{linkAppliedNotice}</span>
        </p>
      )}

      {noMatchForQuery && !isLoading && !shortLinkProvider && (
        <p className="mt-1.5 text-[11px] text-amber-700 font-medium leading-snug">
          לא נמצאה תוצאה ישירה לשם זה — נסה רחוב קרוב, הדבק קישור מ-Google Maps / Waze, או לחץ ישירות על המפה למטה לנעיצת סיכה.
        </p>
      )}

      {dropdownOpen && suggestions.length > 0 && (
        <ul className="absolute right-0 left-0 top-full mt-1 z-[500] bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
          {suggestions.map((item) => (
            <li key={item.placeId}>
              <button type="button" onClick={() => handlePick(item)} className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-brand-50 flex items-start gap-2.5 transition-colors min-h-[44px]">
                <MapPin size={15} className="text-brand-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-800 whitespace-normal break-words leading-snug">{item.primaryName}</div>
                  {item.secondaryText && <div className="text-xs text-slate-500 whitespace-normal break-words mt-0.5">{item.secondaryText}</div>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
