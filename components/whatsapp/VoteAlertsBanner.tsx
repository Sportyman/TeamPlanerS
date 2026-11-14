import React from 'react';
import { VoteChangeAlert } from '../../types/whatsapp';
import { WhatsAppAvatar } from './WhatsAppAvatar';
import { BellRing, Check, X } from 'lucide-react';

interface VoteAlertsBannerProps {
  alerts: VoteChangeAlert[];
  presentIds: string[];
  onTogglePerson?: (personId: string) => void;
  onDismiss: (alertId: string) => void;
  onClearAll: () => void;
}

export const VoteAlertsBanner: React.FC<VoteAlertsBannerProps> = ({
  alerts,
  presentIds,
  onTogglePerson,
  onDismiss,
  onClearAll,
}) => {
  if (alerts.length === 0) return null;

  return (
    <div className="border border-amber-200 bg-amber-50/70 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
          <BellRing size={15} className="text-amber-700 shrink-0" />
          <span>שינויי הצבעה בזמן אמת ({alerts.length}) — הרשימה לא שונתה אוטומטית</span>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-semibold text-amber-800 hover:text-amber-950 whitespace-nowrap"
        >
          נקה הכל
        </button>
      </div>

      <div className="divide-y divide-amber-200/60">
        {alerts.slice(0, 4).map((alert) => {
          const prevLabel = alert.previousOptions.length ? alert.previousOptions.join(', ') : 'לא הצביע';
          const newLabel = alert.newOptions.length ? alert.newOptions.join(', ') : 'ביטל הצבעה';
          const isCurrentlyPresent = alert.personId ? presentIds.includes(alert.personId) : false;
          const needsManualAdd = alert.personId && alert.newIntent === 'ATTENDING' && !isCurrentlyPresent;
          const needsManualRemove = alert.personId && alert.newIntent === 'DECLINING' && isCurrentlyPresent;

          return (
            <div key={alert.id} className="py-2 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <WhatsAppAvatar name={alert.displayName} src={alert.profilePicUrl} sizeClass="w-8 h-8 text-[11px]" />
                <div className="min-w-0 text-xs">
                  <span className="font-bold text-slate-900">{alert.displayName}</span>{' '}
                  <span className="text-slate-700">שינה מ-״{prevLabel}״ ל-״{newLabel}״</span>
                  <span className="text-slate-500 mr-2 tabular-nums">
                    {new Date(alert.detectedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onTogglePerson && alert.personId && (needsManualAdd || needsManualRemove) && (
                  <button
                    type="button"
                    onClick={() => {
                      onTogglePerson(alert.personId!);
                      onDismiss(alert.id);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-bold text-slate-800 hover:bg-amber-100 flex items-center gap-1 whitespace-nowrap"
                  >
                    <Check size={13} />
                    <span>{needsManualAdd ? 'סמן כנוכח' : 'הסר מנוכחים'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDismiss(alert.id)}
                  aria-label="סגור התראה"
                  className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
