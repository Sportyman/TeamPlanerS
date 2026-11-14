import React, { useState } from 'react';
import { Role } from '../../types';
import { KeywordRule } from '../../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../../config/whatsappDefaults';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';

interface KeywordRulesEditorProps {
  rules: KeywordRule[];
  onChange: (rules: KeywordRule[]) => void;
}

export const KeywordRulesEditor: React.FC<KeywordRulesEditorProps> = ({ rules, onChange }) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newIntent, setNewIntent] = useState<'ATTENDING' | 'DECLINING' | 'MAYBE'>('ATTENDING');
  const [newRole, setNewRole] = useState('');

  const addRule = () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    onChange([
      {
        id: `rule-${Date.now()}`,
        keyword: kw,
        intent: newIntent,
        role: newIntent === 'ATTENDING' && newRole ? (newRole as Role) : undefined,
      },
      ...rules,
    ]);
    setNewKeyword('');
    setNewRole('');
  };

  return (
    <div className="border border-slate-200 rounded-2xl bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-slate-900">מילות מפתח לזיהוי תשובות ותפקידים</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            זיהוי אוטומטי לפי מילים באפשרות הסקר (מתנדב, חבר, אורח, מגיע, לא מגיע).
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_KEYWORD_RULES)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1"
        >
          <RotateCcw size={13} />
          <span>שחזר ברירת מחדל</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="ביטוי בסקר (למשל: אורח כבוד)"
          className="flex-1 min-w-[160px] px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
        />
        <select
          value={newIntent}
          onChange={(e) => setNewIntent(e.target.value as any)}
          className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
        >
          <option value="ATTENDING">מגיע</option>
          <option value="DECLINING">לא מגיע</option>
          <option value="MAYBE">אולי / אחר</option>
        </select>
        {newIntent === 'ATTENDING' && (
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
          >
            <option value="">לפי תפקיד קיים בחוג</option>
            <option value={Role.VOLUNTEER}>סמן כמתנדב</option>
            <option value={Role.MEMBER}>סמן כחבר</option>
            <option value={Role.GUEST}>סמן כאורח</option>
            <option value={Role.INSTRUCTOR}>סמן כמדריך</option>
          </select>
        )}
        <button
          type="button"
          onClick={addRule}
          className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap"
        >
          <Plus size={14} />
          <span>הוסף כלל</span>
        </button>
      </div>

      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto border border-slate-100 rounded-xl">
        {rules.map((r) => (
          <div key={r.id} className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
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
            </div>
            <button
              type="button"
              onClick={() => onChange(rules.filter((item) => item.id !== r.id))}
              className="p-1 text-slate-400 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
