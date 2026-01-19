
import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Link, Copy, Check, Send, AlertCircle } from 'lucide-react';

export const InviteManager: React.FC = () => {
  const { activeClub } = useAppStore();
  const [inviteType, setInviteType] = useState<'AUTO_APPROVE' | 'REQUIRE_APPROVAL'>('REQUIRE_APPROVAL');
  const [copied, setCopied] = useState(false);

  if (!activeClub) return null;

  const generateLink = () => {
      const origin = window.location.origin;
      const path = window.location.pathname;
      const type = inviteType === 'AUTO_APPROVE' ? 'auto' : 'pending';
      return `${origin}${path}#/register/${activeClub}?type=${type}`;
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(generateLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="bg-brand-100 text-brand-600 p-2 rounded-lg"><Link size={24}/></div>
        <h2 className="text-xl font-bold text-slate-800">קישורי רישום לחברים</h2>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-slate-500 font-medium">בחר סוג לינק לשליחה:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
                onClick={() => setInviteType('REQUIRE_APPROVAL')}
                className={`p-4 rounded-xl border-2 text-right transition-all ${inviteType === 'REQUIRE_APPROVAL' ? 'border-brand-600 bg-brand-50' : 'border-slate-100 hover:border-slate-200'}`}
            >
                <div className="font-bold text-slate-800">דורש אישור מנהל</div>
                <div className="text-xs text-slate-500 mt-1">הנרשם יופיע ברשימת הממתינים</div>
            </button>
            <button 
                onClick={() => setInviteType('AUTO_APPROVE')}
                className={`p-4 rounded-xl border-2 text-right transition-all ${inviteType === 'AUTO_APPROVE' ? 'border-brand-600 bg-brand-50' : 'border-slate-100 hover:border-slate-200'}`}
            >
                <div className="font-bold text-slate-800">אישור אוטומטי</div>
                <div className="text-xs text-slate-500 mt-1">הנרשם יכנס ישר למאגר הפעיל</div>
            </button>
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-between gap-4">
            <div className="flex-1 overflow-hidden">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">הקישור שלך:</div>
                <div className="text-xs font-mono text-slate-600 truncate">{generateLink()}</div>
            </div>
            <button 
                onClick={handleCopy}
                className={`shrink-0 p-3 rounded-lg flex items-center gap-2 font-bold text-sm transition-all ${copied ? 'bg-green-600 text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'}`}
            >
                {copied ? <><Check size={16}/> הועתק</> : <><Copy size={16}/> העתק</>}
            </button>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-800 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>שלח את הקישור הזה למשתתפים. לאחר הרישום הם יראו מסך אישור בלבד ולא תהיה להם גישה למערכת.</span>
        </div>
      </div>
    </div>
  );
};
