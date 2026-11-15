import React, { useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store';
import { resetAllParticipantsExceptSuperAdmins } from '../../services/auth/cleanResetService';

export const CleanResetPanel: React.FC = () => {
  const { superAdmins, protectedAdmins, addNotification } = useAppStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleCleanReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      const res = await resetAllParticipantsExceptSuperAdmins([...superAdmins, ...protectedAdmins]);
      setConfirmOpen(false);
      addNotification(
        `איפוס הושלם: נוקו ${res.deletedMemberships} חברים מכל החוגים ו-${res.deletedWhatsAppDocs} רשומות וואטסאפ (מנהלי העל נשמרו)`,
        'SUCCESS'
      );
    } catch {
      addNotification('שגיאה בביצוע האיפוס מול השרת', 'WARN');
    } finally {
      setIsResetting(false);
    }
  };

  if (!confirmOpen) {
    return (
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-2"
      >
        <RotateCcw size={14} />
        <span>איפוס נקי של המשתתפים (למעט מנהלי-על)</span>
      </button>
    );
  }

  return (
    <div className="w-full p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 text-right">
      <div className="flex items-start gap-2.5 text-rose-900">
        <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-600" />
        <div className="space-y-1">
          <div className="text-sm font-black">אישור איפוס משתתפים להתחלה נקייה</div>
          <p className="text-xs text-rose-800 leading-relaxed">
            פעולה זו תמחק את כל חברי החוגים (<span className="font-bold">מלבד מנהלי העל</span>) ואת זיכרון הסנכרון מוואטסאפ, ותנקה נוכחות וציוותים זמניים.
            רשימת החוגים, המיקומים, הסירות והרשאות מנהלי העל יישמרו במלואם.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={isResetting}
          onClick={() => setConfirmOpen(false)}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
        >
          ביטול
        </button>
        <button
          type="button"
          disabled={isResetting}
          onClick={handleCleanReset}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold"
        >
          {isResetting ? 'מנקה מסד נתונים...' : 'אשר ומחק את כל המשתתפים'}
        </button>
      </div>
    </div>
  );
};
