
import React from 'react';
import { CheckCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RegistrationSuccess: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={48} />
        </div>
        <h1 className="text-3xl font-black text-slate-800">הרישום הושלם!</h1>
        <p className="text-slate-600 text-lg leading-relaxed">
          תודה על מילוי הפרטים. המידע הועבר לצוות המקצועי של אתגרים.
          ניפגש במים!
        </p>
        <button 
          onClick={() => navigate('/')}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
        >
          <Home size={20} /> חזרה לדף הבית
        </button>
      </div>
    </div>
  );
};
