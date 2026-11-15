import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface GooglePlaceSearchInputProps {
  value: string;
  onChangeText: (name: string) => void;
  onSelectPlace: (name: string, placeId?: string) => void;
  onSubmitEnter: () => void;
}

const isQuotaError = (err: unknown): boolean => {
  const msg = String((err as any)?.message || (err as any)?.status || err || '').toUpperCase();
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('429') ||
    msg.includes('QUOTA')
  );
};

export const GooglePlaceSearchInput: React.FC<GooglePlaceSearchInputProps> = ({
  value,
  onChangeText,
  onSelectPlace,
  onSubmitEnter,
}) => {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const skipNextFetchRef = useRef(false);

  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const trimmed = value.trim();
    if (!placesLib || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['il'],
          language: 'he',
        });
        if (!cancelled) {
          setSuggestions(res?.suggestions || []);
          setDropdownOpen((res?.suggestions?.length || 0) > 0);
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, value]);

  const handlePickSuggestion = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;

    const mainLabel = prediction.mainText?.text || prediction.text?.text || '';
    const secondaryLabel = prediction.secondaryText?.text || '';
    const fallbackLabel = secondaryLabel && !mainLabel.includes(secondaryLabel)
      ? `${mainLabel} — ${secondaryLabel}`
      : mainLabel;

    setDropdownOpen(false);
    setSuggestions([]);
    skipNextFetchRef.current = true;

    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'id'] });
      const title = (place.displayName || mainLabel || '').trim();
      const shortCity = secondaryLabel.split(',')[0]?.trim();
      const formattedLabel =
        title && shortCity && !title.includes(shortCity) ? `${title} (${shortCity})` : title || fallbackLabel;
      onSelectPlace(formattedLabel, place.id || prediction.placeId);
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      onSelectPlace(fallbackLabel, prediction.placeId);
    } finally {
      sessionTokenRef.current = null;
    }
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
          placeholder="חפש מקום מוכר (למשל: מרכז דניאל לחתירה, מרינה הרצליה) או הקלד..."
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

      {placesLib && (
        <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400 font-medium">
          <span>השלמה אוטומטית ממפות Google פעילה</span>
          <span>Powered by Google</span>
        </div>
      )}

      {dropdownOpen && suggestions.length > 0 && (
        <ul className="absolute right-0 left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
          {suggestions.map((sug, idx) => {
            const pred = sug.placePrediction;
            if (!pred) return null;
            const main = pred.mainText?.text || pred.text?.text || '';
            const secondary = pred.secondaryText?.text || '';
            return (
              <li key={pred.placeId || idx}>
                <button
                  type="button"
                  onClick={() => handlePickSuggestion(sug)}
                  className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-brand-50 flex items-start gap-2.5 transition-colors"
                >
                  <MapPin size={15} className="text-brand-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-800 whitespace-normal break-words leading-snug">
                      {main}
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
