import React, { useEffect, useMemo, useState } from 'react';
import { ClubWhatsAppConfig, KeywordRule } from '../../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../../config/whatsappDefaults';
import { KeywordRulesEditor } from './KeywordRulesEditor';
import {
  buildLinkGroupConfigPatch,
  buildUnlinkGroupConfigPatch,
  resolveLinkedGroupItems,
  WhatsAppGroupEntry,
} from '../../services/whatsapp/groupCatalog';
import { Plus, Save, X } from 'lucide-react';

interface WhatsAppSettingsTabProps {
  config: ClubWhatsAppConfig;
  groupCatalog: WhatsAppGroupEntry[];
  onSave: (config: ClubWhatsAppConfig) => Promise<void>;
}

export const WhatsAppSettingsTab: React.FC<WhatsAppSettingsTabProps> = ({
  config,
  groupCatalog,
  onSave,
}) => {
  const [draftConfig, setDraftConfig] = useState<ClubWhatsAppConfig>(config);
  const [customGroup, setCustomGroup] = useState('');
  const [rules, setRules] = useState<KeywordRule[]>(config.keywordRules || DEFAULT_KEYWORD_RULES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftConfig(config);
    setRules(config.keywordRules?.length ? config.keywordRules : DEFAULT_KEYWORD_RULES);
  }, [config]);

  const linkedItems = useMemo(() => resolveLinkedGroupItems(draftConfig, groupCatalog), [draftConfig, groupCatalog]);

  const allOptions = useMemo(() => {
    const map = new Map<string, { key: string; name: string; active: boolean }>();
    groupCatalog.forEach((g) => {
      const isActive = linkedItems.some((i) => (g.id && i.id === g.id) || i.name.toLowerCase() === g.name.toLowerCase());
      map.set(g.key, { key: g.key, name: g.name, active: isActive });
    });
    linkedItems.forEach((i) => {
      if (!map.has(i.key) && !(i.id && map.has(i.id))) {
        map.set(i.key, { key: i.key, name: i.name, active: true });
      }
    });
    return Array.from(map.values());
  }, [groupCatalog, linkedItems]);

  const toggleGroup = (key: string, isActive: boolean) => {
    setDraftConfig((prev) =>
      isActive ? buildUnlinkGroupConfigPatch(prev, key, groupCatalog) : buildLinkGroupConfigPatch(prev, key, groupCatalog).nextConfig
    );
  };

  const addCustomGroup = () => {
    const trimmed = customGroup.trim();
    if (!trimmed) return;
    setDraftConfig((prev) => buildLinkGroupConfigPatch(prev, trimmed, groupCatalog).nextConfig);
    setCustomGroup('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...draftConfig, keywordRules: rules });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="border border-slate-200 rounded-2xl bg-white p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">קבוצות וואטסאפ מקושרות לחוג</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            סמן אילו קבוצות שייכות לחוג זה. השיוך נשמר לפי מזהה הקבוצה הקבוע כך ששינוי שם הקבוצה בוואטסאפ לא ינתק אותה.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
          {allOptions.length === 0 ? (
            <span className="text-xs text-slate-500">טרם זוהו קבוצות תקינות מהבוט. ניתן להוסיף שם קבוצה ידנית מטה.</span>
          ) : (
            allOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleGroup(opt.key, opt.active)}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-colors flex items-center justify-between sm:justify-start gap-2 min-h-[44px] ${
                  opt.active
                    ? 'border-brand-600 bg-brand-50 text-brand-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{opt.name}</span>
                {opt.active && <X size={15} className="text-brand-700 shrink-0" />}
              </button>
            ))
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 max-w-md">
          <input
            type="text"
            value={customGroup}
            onChange={(e) => setCustomGroup(e.target.value)}
            placeholder="הוסף שם/מזהה קבוצה ידנית..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px] focus:outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={addCustomGroup}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[44px]"
          >
            <Plus size={15} />
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
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px]"
        >
          <Save size={16} />
          <span>{isSaving ? 'שומר הגדרות...' : 'שמור הגדרות וואטסאפ'}</span>
        </button>
      </div>
    </div>
  );
};
