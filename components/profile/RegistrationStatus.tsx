
import React from 'react';
import { useAppStore } from '../../store';
import { MembershipStatus, getRoleLabel } from '../../types';
import { Clock, CheckCircle, ShieldAlert, Waves, Ship, ArrowRight, LogOut, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RegistrationStatus: React.FC = () => {
  const { user, userProfile, memberships, clubs, logout } = useAppStore();
  const navigate = useNavigate();

  if (!user || !userProfile) {
    return <div className="min-h-screen flex items-center justify-center"><button onClick={() => navigate('/login')} className="bg-brand-600 text-white px-6 py-2 rounded-xl">חזרה להתחברות</button></div>;
  }

  // Find the primary membership (if multiple, find active one or the most recent)
  const membership = memberships[0];
  const club = clubs.find(c => c.id === membership?.clubId);
  const status = membership?.status || MembershipStatus.PENDING;

  const handleAction = () => {
    if (status === MembershipStatus.ACTIVE) {
        navigate('/app');
    } else {
        navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-500">
        <div className={`p-10 text-center text-white ${status === MembershipStatus.ACTIVE ? 'bg-emerald-600' : 'bg-brand-600'}`}>
            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-6 text-brand-600 animate-pulse">
                {status === MembershipStatus.ACTIVE ? <CheckCircle size={48} className="text-emerald-600" /> : <Clock size={48} className="text-brand-600" />}
            </div>
            <h1 className="text-3xl font-black mb-2">
                {status === MembershipStatus.ACTIVE ? 'ברוך הבא!' : 'תודה שנרשמת!'}
            </h1>
            <p className="opacity-90 font-medium">שלום {userProfile.firstName}, אנחנו שמחים שהצטרפת</p>
        </div>

        <div className="p-10 space-y-8">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                        {club?.label.includes('שייט') ? <Ship size={24} /> : <Waves size={24} />}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">{club?.label || 'המועדון'}</h4>
                        <span className="text-xs text-slate-400">{getRoleLabel(membership?.role || 'MEMBER' as any, userProfile.gender)}</span>
                    </div>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-xl font-bold text-sm ${
                    status === MembershipStatus.ACTIVE ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                    {status === MembershipStatus.ACTIVE ? <UserCheck size={20} /> : <Clock size={20} />}
                    <span>סטטוס: {status === MembershipStatus.ACTIVE ? 'פעיל ומאושר' : 'ממתין לאישור מנהל'}</span>
                </div>
            </div>

            <div className="text-center text-sm text-slate-500 space-y-4">
                {status === MembershipStatus.PENDING ? (
                    <p className="leading-relaxed">בקשתך נשלחה למנהלי החוג. ברגע שיאשרו את הצטרפותך תוכל להיכנס למערכת השיבוץ ולנהל את האימונים.</p>
                ) : (
                    <p className="leading-relaxed">החשבון שלך אושר! כעת אתה יכול להיכנס ולהתחיל להשתמש במערכת.</p>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <button onClick={handleAction} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg">
                    {status === MembershipStatus.ACTIVE ? 'כניסה למערכת' : 'חזרה לדף הבית'}
                    <ArrowRight size={20} />
                </button>
                <button onClick={logout} className="text-slate-400 hover:text-red-500 text-xs font-bold py-2 flex items-center justify-center gap-2"><LogOut size={14} /> התנתקות והחלפת חשבון</button>
            </div>
        </div>
      </div>
    </div>
  );
};
