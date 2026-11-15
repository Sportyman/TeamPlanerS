import React from 'react';
import { HelpCircle, X } from 'lucide-react';

interface KeywordGuideModalProps {
  onClose: () => void;
}

export const KeywordGuideModal: React.FC<KeywordGuideModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
    <div
      className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto text-right"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={20} className="text-brand-600" />
          <h3 className="text-lg font-black text-slate-900">איך עובד מיפוי מילות המפתח?</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="סגור הסבר" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <p>
          כשמישהו מצביע בסקר בוואטסאפ, המערכת קוראת את הטקסט של האפשרות שבה בחר ומחפשת בתוכה את הביטויים שהגדרת כאן — וכך יודעת אוטומטית לסמן נוכחות ולהבין מה תפקיד המשתתף.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <div className="font-bold text-slate-900">מה אומר כל שדה?</div>
          <ul className="space-y-1.5 list-disc pr-4 text-xs">
            <li><strong>ביטוי בסקר:</strong> מילה או צמד מילים שמופיעים באפשרות הסקר (למשל: ״מתנדב מגיע״, ״לא מגיע״, ״מפקד סירה״).</li>
            <li><strong>מגיע / לא מגיע / אולי:</strong> קובע האם לסמן את המשתתף כנוכח בדף ״מי הגיע היום?״.</li>
            <li><strong>תפקיד (אופציונלי):</strong> אם משתתף חדש הצביע דרך אפשרות כזו, המערכת תשמור אוטומטית אם הוא חבר, מתנדב, מדריך או אורח.</li>
            <li><strong>תגיות ומפקד סירה (אופציונלי):</strong> מעניק אוטומטית תגיות לציוות הציוד (כמו סקיפר / מפקד סירה).</li>
          </ul>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
          <div className="font-bold text-emerald-950">דוגמה מסקר אמיתי בוואטסאפ:</div>
          <div className="text-xs text-emerald-900 font-semibold">שאלת הסקר: ״מי מגיע לחוג בשישי ב־06:30?״</div>
          <div className="grid gap-1.5 text-xs">
            <div className="bg-white/80 rounded-lg px-2.5 py-1.5 border border-emerald-200">
              אפשרות <strong>״חבר מגיע״</strong> ← ביטוי: <span className="font-bold">חבר</span> · סטטוס: <span className="text-emerald-700 font-bold">מגיע</span> · תפקיד: <span className="font-bold">חבר</span>
            </div>
            <div className="bg-white/80 rounded-lg px-2.5 py-1.5 border border-emerald-200">
              אפשרות <strong>״מתנדב מגיע״</strong> ← ביטוי: <span className="font-bold">מתנדב</span> · סטטוס: <span className="text-emerald-700 font-bold">מגיע</span> · תפקיד: <span className="font-bold">מתנדב</span>
            </div>
            <div className="bg-white/80 rounded-lg px-2.5 py-1.5 border border-emerald-200">
              אפשרות <strong>״לא מגיע״</strong> ← ביטוי: <span className="font-bold">לא מגיע</span> · סטטוס: <span className="text-red-700 font-bold">לא מגיע</span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-800">
            * ביטוי ארוך יותר נבדק ראשון — לכן ״לא מגיע״ תמיד גובר על ״מגיע״.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">
          הבנתי, סגור
        </button>
      </div>
    </div>
  </div>
);
