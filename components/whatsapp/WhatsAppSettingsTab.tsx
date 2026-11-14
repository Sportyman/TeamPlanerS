import React, { useEffect, useState } from 'react';
import { ClubWhatsAppConfig, KeywordRule } from '../../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../../config/whatsappDefaults';
import { KeywordRulesEditor } from './KeywordRulesEditor';
import { Plus, Save } from 'lucide-react';

interface WhatsAppSettingsTabProps {
  config: ClubWhatsAppConfig;
  availableGroups: string[];
  onSave: (config: ClubWhatsAppConfig) => Promise<void>;
}

export const WhatsAppSettingsTab: React.FC<WhatsAppSettingsTabProps> = ({
  config,
  availableGroups,
  onSave,
}) => {
  const [linkedGroups, setLinkedGroups] = useState<string[]>(config.linkedGroups || []);
  const [customGroup, setCustomGroup] = useState('');
  const [rules, setRules] = useState<KeywordRule[]>(config.keywordRules || DEFAULT_KEYWORD_RULES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLinkedGroups(config.linkedGroups || []);
    setRules(config.keywordRules?.length ? config.keywordRules : DEFAULT_KEYWORD_RULES);
  }, [config]);

  const toggleGroup = (group: string) => {
    setLinkedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const addCustomGroup = () => {
    const trimmed = customGroup.trim();
    if (!trimmed) return;
    if (!linkedGroups.includes(trimmed)) setLinkedGroups((prev) => [...prev, trimmed]);
    setCustomGroup('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...config, linkedGroups, keywordRules: rules });
    } finally {
      setIsSaving(false);
    }
  };

  const allGroups = Array.from(new Set([...availableGroups, ...linkedGroups]));

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 rounded-2xl bg-white p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">קבוצות וואטסאפ מקושרות לחוג</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            סמן אילו קבוצות וואטסאפ שייכות לחוג זה כדי שהסקר הרלוונטי ייבחר אוטומטית לפני האימון.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {allGroups.length === 0 ? (
            <span className="text-xs text-slate-500">טרם זוהו קבוצות מ-polls_events. ניתן להוסיף שם קבוצה ידנית מטה.</span>
          ) : (
            allGroups.map((group) => {
              const active = linkedGroups.includes(group);
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => toggleGroup(group)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    active
                      ? 'border-brand-600 bg-brand-50 text-brand-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {group}
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={customGroup}
            onChange={(e) => setCustomGroup(e.target.value)}
            placeholder="הוסף שם/מזהה קבוצה ידנית..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={addCustomGroup}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center gap-1 whitespace-nowrap"
          >
            <Plus size={14} />
            <span>הוסף קבוצה</span>
          </button>
        </div>
      </div>

      <KeywordRulesEditor rules={rules} onChange={setRules} />

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} />
          <span>{isSaving ? 'שומר הגדרות...' : 'שמור הגדרות וואטסאפ'}</span>
        </button>
      </div>
    </div>
  );
};
