import React, { useMemo, useState } from 'react';
import { isRawWhatsAppJid } from '../../services/whatsapp/clubDedupSync';
import { Check, ChevronDown, ChevronUp, Link2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

interface ClubGroupPairingCardProps {
  clubName: string;
  linkedGroups: string[];
  availableGroups: string[];
  onLinkGroup: (groupName: string) => Promise<void>;
  onUnlinkGroup: (groupName: string) => Promise<void>;
  onRefresh: () => void;
}

export const ClubGroupPairingCard: React.FC<ClubGroupPairingCardProps> = ({
  clubName, linkedGroups, availableGroups, onLinkGroup, onUnlinkGroup, onRefresh,
}) => {
  const isUnlinked = linkedGroups.length === 0;
  const [isExpanded, setIsExpanded] = useState(isUnlinked);
  const [search, setSearch] = useState('');
  const [manualName, setManualName] = useState('');
  const [busyGroup, setBusyGroup] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const cleanCandidates = useMemo(
    () => availableGroups.filter((g) => !isRawWhatsAppJid(g) && !linkedGroups.includes(g)),
    [availableGroups, linkedGroups]
  );

  const selectableGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? cleanCandidates.filter((g) => g.toLowerCase().includes(q)) : cleanCandidates;
  }, [cleanCandidates, search]);

  const showOpen = isUnlinked || isExpanded;

  const handleLink = async (groupName: string) => {
    const trimmed = groupName.trim();
    if (!trimmed || busyGroup) return;
    setBusyGroup(trimmed);
    try {
      await onLinkGroup(trimmed);
      setManualName('');
      setSearch('');
      setIsExpanded(false);
    } finally {
      setBusyGroup(null);
    }
  };

  const handleUnlink = async (groupName: string) => {
    if (busyGroup) return;
    setBusyGroup(groupName);
    try {
      await onUnlinkGroup(groupName);
      setConfirmRemove(null);
    } finally {
      setBusyGroup(null);
    }
  };

  return (
    <section className={`border rounded-2xl transition-colors ${isUnlinked ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200 bg-white'}`}>
      <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Link2 size={14} className={isUnlinked ? 'text-amber-700 shrink-0' : 'text-emerald-700 shrink-0'} />
            <span className="truncate">ציוות קבוצת וואטסאפ לחוג: {clubName}</span>
          </div>
          {isUnlinked ? (
            <p className="text-sm font-black text-amber-950">טרם צוותה קבוצת וואטסאפ לחוג זה — בחר קבוצה כדי לקלוט סקרים וחברים</p>
          ) : (
            <p className="text-sm font-bold text-slate-900 break-words">{linkedGroups.join(' · ')}</p>
          )}
        </div>

        {!isUnlinked && (
          <button
            type="button" onClick={() => setIsExpanded((v) => !v)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 min-h-[44px] shrink-0"
          >
            <span>{showOpen ? 'סגור ניהול קבוצות' : 'שנה / הוסף קבוצה'}</span>
            {showOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>

      {showOpen && (
        <div className={`px-3.5 pb-4 sm:px-4 pt-3 border-t space-y-3 ${isUnlinked ? 'border-amber-200' : 'border-slate-100'}`}>
          {linkedGroups.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-600">קבוצות מצוותות לחוג כעת:</div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/70">
                {linkedGroups.map((group) => (
                  <div key={group} className="px-3 py-2 flex items-center justify-between gap-2 min-h-[48px]">
                    <span className="text-sm font-bold text-slate-900 truncate">{group}</span>
                    {confirmRemove === group ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" disabled={busyGroup === group} onClick={() => handleUnlink(group)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold min-h-[38px]">
                          {busyGroup === group ? 'מסיר...' : 'אשר הסרה'}
                        </button>
                        <button type="button" onClick={() => setConfirmRemove(null)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 min-h-[38px]">ביטול</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmRemove(group)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-700 hover:bg-red-50 flex items-center gap-1 shrink-0 min-h-[40px]">
                        <Trash2 size={14} /><span>הסר ציוות</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">בחר קבוצה זמינה מהבוט לחיבור מיידי:</span>
              <button type="button" onClick={onRefresh} className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1 px-2 py-1 min-h-[36px]">
                <RefreshCw size={13} /><span>רענן רשימה</span>
              </button>
            </div>

            {cleanCandidates.length > 4 && (
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="סנן לפי שם קבוצה..." className="w-full pr-9 pl-3 py-2 text-sm bg-white border border-slate-200 rounded-xl min-h-[44px] focus:outline-none focus:border-brand-500" />
              </div>
            )}

            {selectableGroups.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                {selectableGroups.map((group) => (
                  <button
                    key={group} type="button" disabled={busyGroup !== null} onClick={() => handleLink(group)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:bg-brand-50/40 text-right flex items-center justify-between gap-2 min-h-[48px] transition-colors"
                  >
                    <span className="text-sm font-bold text-slate-900 truncate">{group}</span>
                    <span className="text-xs font-bold text-brand-700 flex items-center gap-1 shrink-0">
                      <Check size={14} /><span>{busyGroup === group ? 'מחבר...' : 'צוות לחוג'}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-600 bg-white/80 border border-slate-200 rounded-xl p-3">
                לא נמצאו קבוצות נוספות ברשימה מהבוט. ניתן לרענן או להזין שם קבוצה מדויק מטה.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="או הזן שם קבוצת וואטסאפ מדויק..." className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl min-h-[44px] focus:outline-none focus:border-brand-500" />
            <button type="button" disabled={!manualName.trim() || busyGroup !== null} onClick={() => handleLink(manualName)} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] whitespace-nowrap">
              <Plus size={15} /><span>צוות לפי שם</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
