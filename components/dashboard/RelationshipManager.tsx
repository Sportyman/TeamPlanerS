
import React, { useState } from 'react';
import { Person, Role, getRoleLabel } from '../../types';
import { Users2, Heart, Shield, Ban } from 'lucide-react';

interface RelationshipManagerProps {
    currentId?: string;
    must: string[];
    prefer: string[];
    cannot: string[];
    people: Person[];
    onToggle: (id: string, type: 'MUST' | 'PREFER' | 'CANNOT') => void;
    onClear: (id: string) => void;
}

export const RelationshipManager: React.FC<RelationshipManagerProps> = ({ 
    currentId, must, prefer, cannot, people, onToggle, onClear 
}) => {
    const [search, setSearch] = useState('');
    const candidates = people.filter(p => p.id !== currentId && p.name.includes(search));

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
             <div className="flex items-center justify-between mb-2">
                 <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                     <Users2 size={16} className="text-brand-600"/> מנהל קשרים והעדפות
                 </div>
                 <input 
                    type="text" 
                    placeholder="חפש חבר..." 
                    className="text-xs border rounded px-2 py-1 w-32 focus:ring-2 focus:ring-brand-500 outline-none"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onFocus={handleFocus}
                 />
             </div>
             
             <div className="grid grid-cols-[1fr_32px_32px_32px] gap-1 px-2 mb-1 text-[10px] text-slate-500 font-bold items-center">
                 <div></div>
                 <div className="text-center text-yellow-600">עדיף</div>
                 <div className="text-center text-green-600">חובה</div>
                 <div className="text-center text-red-600">אסור</div>
             </div>

             <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                 {candidates.map(p => {
                     const isMust = must.includes(p.id);
                     const isPrefer = prefer.includes(p.id);
                     const isCannot = cannot.includes(p.id);

                     return (
                         <div key={p.id} className="bg-white p-2 rounded border grid grid-cols-[1fr_32px_32px_32px] gap-1 items-center shadow-sm">
                             <div className="flex flex-col overflow-hidden">
                                 <span className="text-xs font-bold text-slate-700 truncate">{p.name}</span>
                                 <span className="text-[10px] text-slate-400 truncate">{getRoleLabel(p.role, p.gender)}</span>
                             </div>
                             
                             <button 
                                type="button" 
                                onClick={() => isPrefer ? onClear(p.id) : onToggle(p.id, 'PREFER')}
                                className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${isPrefer ? 'bg-yellow-100 text-yellow-600 ring-1 ring-yellow-400' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}
                             >
                                 <Heart size={14} className={isPrefer ? "fill-current" : ""}/>
                             </button>
                             <button 
                                type="button" 
                                onClick={() => isMust ? onClear(p.id) : onToggle(p.id, 'MUST')}
                                className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${isMust ? 'bg-green-100 text-green-600 ring-1 ring-green-400' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}
                             >
                                 <Shield size={14} />
                             </button>
                             <button 
                                type="button" 
                                onClick={() => isCannot ? onClear(p.id) : onToggle(p.id, 'CANNOT')}
                                className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${isCannot ? 'bg-red-100 text-red-600 ring-1 ring-red-400' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}
                             >
                                 <Ban size={14} />
                             </button>
                         </div>
                     )
                 })}
                 {candidates.length === 0 && <div className="text-center text-xs text-slate-400 py-4">לא נמצאו תוצאות</div>}
             </div>
        </div>
    );
};
