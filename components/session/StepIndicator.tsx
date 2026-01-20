
import React from 'react';
import { Users, Ship } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  onStepClick: (step: 1 | 2) => void;
  isStep2Disabled: boolean;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick, isStep2Disabled }) => {
  return (
    <div className="flex items-center justify-center space-x-8 mb-8 flex-row-reverse">
      <button 
        onClick={() => onStepClick(1)} 
        className={`flex flex-col items-center transition-all duration-300 ${currentStep === 1 ? 'text-brand-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <div className={`p-3 rounded-full border-2 transition-colors ${currentStep === 1 ? 'bg-brand-50 border-brand-600 shadow-md' : 'bg-white border-slate-200'}`}>
          <Users size={24} />
        </div>
        <span className="font-bold text-xs mt-2 uppercase tracking-wider">נוכחות</span>
      </button>
      
      <div className={`w-16 h-1 bg-slate-100 mx-4 rounded-full overflow-hidden relative`}>
          <div className={`absolute inset-0 bg-brand-500 transition-transform duration-500 ${currentStep >= 2 ? 'translate-x-0' : 'translate-x-full'}`} />
      </div>

      <button 
        onClick={() => onStepClick(2)} 
        disabled={isStep2Disabled}
        className={`flex flex-col items-center transition-all duration-300 ${currentStep === 2 ? 'text-brand-600 scale-110' : 'text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed'}`}
      >
        <div className={`p-3 rounded-full border-2 transition-colors ${currentStep === 2 ? 'bg-brand-50 border-brand-600 shadow-md' : 'bg-white border-slate-200'}`}>
          <Ship size={24} />
        </div>
        <span className="font-bold text-xs mt-2 uppercase tracking-wider">ציוד</span>
      </button>
    </div>
  );
};
