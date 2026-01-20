
import React from 'react';
import { useUserSearch } from '../../hooks/admin/useUserSearch';
import { Search, UserPlus, Mail, Check } from 'lucide-react';
import { Person } from '../../types';

interface UserSelectorProps {
  onSelect: (user: { uid?: string; email: string; name?: string }) => void;
}

export const UserSelector: React.FC<UserSelectorProps> = ({ onSelect }) => {
  const { query, setQuery, results, isManualEmail } = useUserSearch();

  const handleSelectResult = (person: Person) => {
    onSelect({ uid: person.id, email: person.id, name: person.name });
    setQuery('');
  };

  const handleManualEmail = () => {
    if (isManualEmail) {
      onSelect({ email: query.trim().toLowerCase() });
      setQuery('');
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש לפי שם, אימייל או טלפון..."
          className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-brand-500 focus:bg-white outline-none transition-all font-medium text-slate-800"
        />
      </div>

      {query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {results.length > 0 ? (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {results.map((person) => (
                <button
                  key={person.id}
                  onClick={() => handleSelectResult(person)}
                  className="w-full text-right p-4 hover:bg-brand-50 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-brand-600">
                      <Check size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{person.name}</div>
                      <div className="text-xs text-slate-400">{person.id}</div>
                    </div>
                  </div>
                  <div className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold uppercase">
                    משתמש קיים
                  </div>
                </button>
              ))}
            </div>
          ) : isManualEmail ? (
            <button
              onClick={handleManualEmail}
              className="w-full text-right p-6 hover:bg-emerald-50 flex items-center gap-4 transition-colors"
            >
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <UserPlus size={24} />
              </div>
              <div>
                <div className="font-bold text-emerald-800">מנה משתמש חדש</div>
                <div className="text-sm text-emerald-600">לחץ כדי למנות את <span className="font-mono">{query}</span></div>
              </div>
            </button>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <Mail className="mx-auto mb-2 opacity-20" size={32} />
              <p className="text-sm">לא נמצאו תוצאות. הקלד כתובת אימייל מלאה למינוי משתמש חדש.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
