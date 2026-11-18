import React, { useMemo, useState } from 'react';
import { LinkedGroupDisplayItem, WhatsAppGroupEntry } from '../../services/whatsapp/groupCatalog';
import { Check, CheckCircle2, ChevronDown, ChevronUp, Link2, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from 'lucide-react';

interface ClubGroupPairingCardProps {
  clubName: string;
  linkedItems: LinkedGroupDisplayItem[];
  groupCatalog: WhatsAppGroupEntry[];
  alwaysOpen?: boolean;
  onLinkGroup: (groupKeyOrName: string) => Promise<void>;
  onUnlinkGroup: (groupKeyOrName: string) => Promise<void>;
  onRefresh: () => void;
}

export const ClubGroupPairingCard: React.FC<ClubGroupPairingCardProps> = ({
  clubName, linkedItems, groupCatalog, alwaysOpen = false, onLinkGroup, onUnlinkGroup, onRefresh,
}) => {
  const isUnlinked = linkedItems.length === 0;
  const [isExpanded, setIsExpanded] = useState(alwaysOpen || isUnlinked);
  const [search, setSearch] = useState('');
  const [manualName, setManualName] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const cleanCandidates = useMemo(() => {
    const linkedIds = new Set(linkedItems.map((i) => i.id).filter(Boolean));
    const linkedNames = new Set(linkedItems.map((i) => i.name.trim().toLowerCase()));
    return groupCatalog.filter((g) => !(g.id && linkedIds.has(g.id)) && !linkedNames.has(g.name.trim().toLowerCase()));
  }, [groupCatalog, linkedItems]);

  const selectableGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? cleanCandidates.filter((g) => g.name.toLowerCase().includes(q)) : cleanCandidates;
  }, [cleanCandidates, search]);

  const showOpen = alwaysOpen || isUnlinked || isExpanded;

  const handleLink = async (keyOrName: string) => {
    const trimmed = keyOrName.trim();
    if (!trimmed || busyKey) return;
    setBusyKey(trimmed);
    try {
      await onLinkGroup(trimmed);
      setManualName('');
      setSearch('');
      if (!alwaysOpen) setIsExpanded(false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleUnlink = async (keyOrName: string) => {
    if (busyKey) return;
    setBusyKey(keyOrName);
    try {
      await onUnlinkGroup(keyOrName);
      setConfirmRemove(null);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className={`border-2 rounded-2xl transition-colors ${isUnlinked ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Link2 size={15} className={isUnlinked ? 'text-amber-700 shrink-0' : 'text-emerald-700 shrink-0'} />
            <span>שיוך קבוצת וואטסאפ לחוג: {clubName}</span>
          </div>
          {isUnlinked ? (
            <p className="text-base font-black text-amber-950">טרם נבחרה קבוצה — בחר קבוצה מהרשימה מטה</p>
          ) : (
            <div className="space-y-1">
              <p className="text-lg sm:text-xl font-black text-emerald-800 tracking-normal">{linkedItems.map((i) => i.name).join(' · ')}</p>
              {linkedItems.some((i) => Boolean(i.id)) && (
                <p className="text-xs text-emerald-700 flex items-center gap-1 font-semibold">
                  <ShieldCheck size={14} className="shrink-0" />
                  <span>מזהה קבוצה קבוע משויך ברקע — שינוי שם הקבוצה בוואטסאפ לא ישבור את השיוך</span>
                </p>
              )}
            </div>
          )}
        </div>

        {!isUnlinked && !alwaysOpen && (
          <button
            type="button" onClick={() => setIsExpanded((v) => !v)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 min-h-[44px] shrink-0"
          >
            <span>{showOpen ? 'סגור רשימת קבוצות' : 'החלף / הוסף קבוצה'}</span>
            {showOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>

      {showOpen && (
        <div className={`px-4 pb-5 sm:px-5 pt-4 border-t space-y-4 ${isUnlinked ? 'border-amber-200' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-800">רשימת קבוצות הוואטסאפ מהבוט:</span>
            <button type="button" onClick={onRefresh} className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 min-h-[36px]">
              <RefreshCw size={14} /><span>רענן רשימה</span>
            </button>
          </div>

          {cleanCandidates.length > 4 && (
            <div className="relative">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="סינון לפי שם קבוצה..." className="w-full pr-10 pl-3 py-2.5 text-base font-medium bg-white border border-slate-300 rounded-xl min-h-[48px] focus:outline-none focus:border-brand-600" />
            </div>
          )}

          <div className="flex flex-col gap-3">
            {linkedItems.map((item) => (
              <div
                key={item.key}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-emerald-700 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 size={24} className="text-white shrink-0" />
                  <div className="min-w-0">
                    <div className="text-lg sm:text-xl font-extrabold tracking-normal leading-snug text-white break-words">{item.name}</div>
                    <div className="text-xs font-bold text-emerald-100">קבוצה נבחרה ומשויכת לחוג זה</div>
                  </div>
                </div>
                {confirmRemove === item.key ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" disabled={busyKey === item.key} onClick={() => handleUnlink(item.key)} className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold min-h-[40px]">
                      {busyKey === item.key ? 'מסיר...' : 'אשר הסרה'}
                    </button>
                    <button type="button" onClick={() => setConfirmRemove(null)} className="px-3 py-2 rounded-xl bg-white text-slate-800 text-xs font-bold min-h-[40px]">ביטול</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmRemove(item.key)} className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 min-h-[40px] self-end sm:self-center">
                    <Trash2 size={14} /><span>הסר שיוך</span>
                  </button>
                )}
              </div>
            ))}

            {selectableGroups.map((group) => (
              <button
                key={group.key} type="button" disabled={busyKey !== null} onClick={() => handleLink(group.key)}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 bg-white hover:border-brand-600 hover:bg-brand-50/40 text-right flex items-center justify-between gap-3 min-h-[60px] transition-all"
              >
                <span className="text-lg sm:text-xl font-extrabold tracking-normal leading-snug text-slate-950 break-words">{group.name}</span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-brand-700 text-xs font-bold flex items-center gap-1.5 shrink-0">
                  <Check size={14} /><span>{busyKey === group.key ? 'משייך...' : 'בחר קבוצה'}</span>
                </span>
              </button>
            ))}

            {linkedItems.length === 0 && selectableGroups.length === 0 && (
              <div className="text-sm text-slate-600 bg-white border border-slate-200 rounded-2xl p-4">
                לא נמצאו קבוצות מהבוט. ניתן ללחוץ על ״רענן רשימה״ או להזין את שם הקבוצה ידנית מטה.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
            <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="הזנה ידנית: כתוב שם קבוצת וואטסאפ מדויק..." className="flex-1 px-4 py-2.5 text-base font-medium bg-white border border-slate-300 rounded-xl min-h-[48px] focus:outline-none focus:border-brand-600" />
            <button type="button" disabled={!manualName.trim() || busyKey !== null} onClick={() => handleLink(manualName)} className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-1.5 min-h-[48px] whitespace-nowrap">
              <Plus size={16} /><span>שייך לפי שם</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

