
import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'טוען נתונים מהענן...' }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
    <div className="relative">
        <Loader2 size={64} className="text-brand-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-brand-600 rounded-full animate-ping" />
        </div>
    </div>
    <div className="text-center animate-pulse">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{message}</h2>
        <p className="text-slate-400 text-sm mt-1">אנחנו מוודאים שהמידע שלך מעודכן</p>
    </div>
  </div>
);
