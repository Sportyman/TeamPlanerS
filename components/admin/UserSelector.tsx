
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
        <>
          {/* Transparent backdrop to catch clicks outside while keeping results focused */}
          <div className="fixed inset-0 z-[990]" onClick={() => setQuery('')} />
          
          <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 overflow-hidden z-[999] animate-in fade-in slide-in-from-top-4 duration-200">
            {results.length > 0 ? (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                {results.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => handleSelectResult(person)}
                    className="w-full text-right p-5 hover:bg-brand-50 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-brand-600 transition-all">
                        <Check size={24} />
                      </div>
                      <div>
                        <div className="font-black text-slate-800 text-lg leading-tight">{person.name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{person.id}</div>
                      </div>
                    </div>
                    <div className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                      משתמש קיים
                    </div>
                  </button>
                ))}
              </div>
            ) : isManualEmail ? (
              <button
                onClick={handleManualEmail}
                className="w-full text-right p-8 hover:bg-emerald-50 flex items-center gap-5 transition-colors group"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-[1.5rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <UserPlus size={32} />
                </div>
                <div>
                  <div className="font-black text-emerald-800 text-xl">מנה משתמש חדש</div>
                  <div className="text-sm text-emerald-600 mt-1">לחץ כדי למנות את <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">{query}</span></div>
                </div>
              </button>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <Mail className="mx-auto mb-4 opacity-20" size={48} />
                <p className="text-sm font-bold">לא נמצאו תוצאות</p>
                <p className="text-xs mt-1 opacity-60">הקלד כתובת אימייל מלאה למינוי משתמש חדש שאינו במערכת</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
