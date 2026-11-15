import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { GeoPlaceResult, searchPlacesInIsrael } from '../../services/geocodingService';

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
  const [suggestions, setSuggestions] = useState<GeoPlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [noMatchForQuery, setNoMatchForQuery] = useState(false);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setNoMatchForQuery(false);
      setIsLoading(false);
      return;
    }

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
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const handlePick = (item: GeoPlaceResult) => {
    skipNextFetchRef.current = true;
    setDropdownOpen(false);
    setNoMatchForQuery(false);
    setSuggestions([]);
    onSelectPlace(item);
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
          onKeyDown={(e) => {
            if (e.key === 'Escape') setDropdownOpen(false);
          }}
          placeholder="חפש אזור למיקוד המפה (למשל: מרינה תל אביב, חוף הכרמל)..."
          className="w-full pr-9 pl-9 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-brand-500"
        />
        {isLoading ? (
          <Loader2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              onChangeQuery('');
              setSuggestions([]);
              setNoMatchForQuery(false);
              setDropdownOpen(false);
            }}
            aria-label="נקה חיפוש אזור"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {noMatchForQuery && !isLoading && (
        <p className="mt-1.5 text-[11px] text-amber-700 font-medium leading-snug">
          לא נמצאה כתובת מדויקת לשם זה — חפש אזור כללי (כמו &ldquo;מרינה תל אביב&rdquo;) או לחץ ישירות על המפה למטה כדי לנעוץ סיכה.
        </p>
      )}

      {dropdownOpen && suggestions.length > 0 && (
        <ul className="absolute right-0 left-0 top-full mt-1 z-[500] bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
          {suggestions.map((item) => (
            <li key={item.placeId}>
              <button
                type="button"
                onClick={() => handlePick(item)}
                className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-brand-50 flex items-start gap-2.5 transition-colors"
              >
                <MapPin size={15} className="text-brand-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-800 whitespace-normal break-words leading-snug">
                    {item.primaryName}
                  </div>
                  {item.secondaryText && (
                    <div className="text-xs text-slate-500 whitespace-normal break-words mt-0.5">
                      {item.secondaryText}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
