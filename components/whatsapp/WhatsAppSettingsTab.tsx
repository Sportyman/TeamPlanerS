import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClubWhatsAppConfig, KeywordRule } from '../../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../../config/whatsappDefaults';
import { KeywordRulesEditor } from './KeywordRulesEditor';
import { ArrowLeft, Link2, Save } from 'lucide-react';

interface WhatsAppSettingsTabProps {
  config: ClubWhatsAppConfig;
  onSave: (config: ClubWhatsAppConfig) => Promise<void>;
}

export const WhatsAppSettingsTab: React.FC<WhatsAppSettingsTabProps> = ({
  config,
  onSave,
}) => {
  const [rules, setRules] = useState<KeywordRule[]>(config.keywordRules || DEFAULT_KEYWORD_RULES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRules(config.keywordRules?.length ? config.keywordRules : DEFAULT_KEYWORD_RULES);
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...config, keywordRules: rules });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="border border-slate-200 rounded-2xl bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Link2 size={15} className="text-brand-600" />
            <span>שיוך קבוצת וואטסאפ לחוג</span>
          </h3>
          <p className="text-xs text-slate-500">
            ניהול בחירת הקבוצה המקושרת לחוג עבר לדף ייעודי ונפרד.
          </p>
        </div>
        <Link
          to="/app/whatsapp/pairing"
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[44px]"
        >
          <span>עבור לדף שיוך קבוצות</span>
          <ArrowLeft size={14} />
        </Link>
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
