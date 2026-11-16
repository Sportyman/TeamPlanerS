import React, { useState } from 'react';
import { Role } from '../../types';
import { KeywordRule } from '../../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../../config/whatsappDefaults';
import { KeywordGuideModal } from './KeywordGuideModal';
import { HelpCircle, Plus, RotateCcw, Trash2 } from 'lucide-react';

interface KeywordRulesEditorProps {
  rules: KeywordRule[];
  onChange: (rules: KeywordRule[]) => void;
}

export const KeywordRulesEditor: React.FC<KeywordRulesEditorProps> = ({ rules, onChange }) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newIntent, setNewIntent] = useState<'ATTENDING' | 'DECLINING' | 'MAYBE'>('ATTENDING');
  const [newRole, setNewRole] = useState('');
  const [newIsSkipper, setNewIsSkipper] = useState(false);
  const [newTags, setNewTags] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const addRule = () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    const parsedTags = newTags.split(',').map((t) => t.trim()).filter(Boolean);

    const rule: KeywordRule = {
      id: `rule-${Date.now()}`,
      keyword: kw,
      intent: newIntent,
      role: newIntent === 'ATTENDING' && newRole ? (newRole as Role) : undefined,
      isSkipper: newIntent === 'ATTENDING' && newIsSkipper ? true : undefined,
      grantedTags: newIntent === 'ATTENDING' && parsedTags.length > 0 ? parsedTags : undefined,
    };
    onChange([rule, ...rules]);
    setNewKeyword('');
    setNewRole('');
    setNewIsSkipper(false);
    setNewTags('');
  };

  return (
    <div className="border border-slate-200 rounded-2xl bg-white p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">מילות מפתח לזיהוי תשובות, תפקידים ותגיות</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            זיהוי אוטומטי מאפשרויות הסקר (מתנדב, חבר, מדריך, מפקד סירה, אורח או תגיות פעילות).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="px-3 py-2 rounded-xl border border-brand-200 bg-brand-50 text-xs font-bold text-brand-800 hover:bg-brand-100 flex items-center gap-1.5 min-h-[40px]"
          >
            <HelpCircle size={14} />
            <span>איך זה עובד?</span>
          </button>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_KEYWORD_RULES)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 min-h-[40px]"
          >
            <RotateCcw size={13} />
            <span>ברירת מחדל</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 items-stretch sm:items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="ביטוי בסקר (למשל: מתנדב מגיע)"
          className="sm:flex-1 sm:min-w-[160px] px-3 py-2 text-sm sm:text-xs bg-white border border-slate-200 rounded-xl min-h-[44px]"
        />
        <select
          value={newIntent}
          onChange={(e) => setNewIntent(e.target.value as any)}
          className="px-3 py-2 text-sm sm:text-xs bg-white border border-slate-200 rounded-xl min-h-[44px]"
        >
          <option value="ATTENDING">מגיע</option>
          <option value="DECLINING">לא מגיע</option>
          <option value="MAYBE">אולי / אחר</option>
        </select>
        {newIntent === 'ATTENDING' && (
          <>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="px-3 py-2 text-sm sm:text-xs bg-white border border-slate-200 rounded-xl min-h-[44px]"
            >
              <option value="">לפי תפקיד קיים בחוג</option>
              <option value={Role.VOLUNTEER}>סמן כמתנדב</option>
              <option value={Role.MEMBER}>סמן כחבר</option>
              <option value={Role.GUEST}>סמן כאורח</option>
              <option value={Role.INSTRUCTOR}>סמן כמדריך</option>
            </select>
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="תגיות (מופרד בפסיק)"
              className="sm:w-36 px-3 py-2 text-sm sm:text-xs bg-white border border-slate-200 rounded-xl min-h-[44px]"
            />
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 px-2 min-h-[44px]">
              <input
                type="checkbox"
                checked={newIsSkipper}
                onChange={(e) => setNewIsSkipper(e.target.checked)}
                className="rounded border-slate-300 w-4 h-4"
              />
              <span>מפקד סירה</span>
            </label>
          </>
        )}
        <button
          type="button"
          onClick={addRule}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[44px]"
        >
          <Plus size={15} />
          <span>הוסף כלל</span>
        </button>
      </div>

      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto border border-slate-100 rounded-xl">
        {rules.map((r) => (
          <div key={r.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs min-h-[48px]">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-bold text-slate-900">{r.keyword}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-600">
                {r.intent === 'ATTENDING' ? 'מגיע' : r.intent === 'DECLINING' ? 'לא מגיע' : 'אולי'}
              </span>
              {r.role && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-brand-700 font-semibold">{r.role}</span>
                </>
              )}
              {r.isSkipper && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-blue-700 font-semibold">מפקד סירה</span>
                </>
              )}
              {r.grantedTags && r.grantedTags.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500">תגיות: {r.grantedTags.join(', ')}</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => onChange(rules.filter((item) => item.id !== r.id))}
              aria-label={`מחק כלל ${r.keyword}`}
              className="p-2 text-slate-400 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      {showGuide && <KeywordGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
};
