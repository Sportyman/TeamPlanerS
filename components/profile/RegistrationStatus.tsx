
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store';
import { MembershipStatus, getRoleLabel, ClubMembership } from '../../types';
import { Clock, CheckCircle, Waves, Ship, ArrowRight, LogOut, UserCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const RegistrationStatus: React.FC = () => {
  const { user, userProfile, memberships, clubs, logout, activeClub } = useAppStore();
  const [liveMembership, setLiveMembership] = useState<ClubMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. Resolve which membership to show
  useEffect(() => {
    if (!user) return;

    // Try to find membership for active club, or just the first one available
    const target = (activeClub ? memberships.find(m => m.clubId === activeClub) : null) || memberships[0];
    
    if (target) {
        setLiveMembership(target);
        setLoading(false);
    } else {
        // If no memberships in store, wait a bit or keep loading
        const timeout = setTimeout(() => {
            if (loading) setLoading(false);
        }, 3000);
        return () => clearTimeout(timeout);
    }
  }, [user, memberships, activeClub]);

  // 2. Listen to the specific membership document for status changes
  useEffect(() => {
    if (!user || !liveMembership) return;
    
    const membershipId = `${liveMembership.clubId}_${user.uid}`;
    const unsubscribe = onSnapshot(doc(db, 'memberships', membershipId), (snap) => {
        if (snap.exists()) {
            const data = snap.data() as ClubMembership;
            setLiveMembership(data);
            setLoading(false);
            
            // Auto-navigate if approved while on this page
            if (data.status === MembershipStatus.ACTIVE) {
                // We give the user a moment to see the "Approved" state
            }
        }
    });
    
    return () => unsubscribe();
  }, [user, liveMembership?.clubId]);

  if (!user || !userProfile) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <Loader2 className="animate-spin text-brand-600 mb-4 mx-auto" size={48} />
                <p className="text-slate-500">טוען נתוני משתמש...</p>
                <button onClick={() => navigate('/login')} className="mt-4 text-brand-600 font-bold underline">חזרה להתחברות</button>
            </div>
        </div>
    );
  }

  if (loading && !liveMembership) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
              <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-800">בודק סטטוס הצטרפות...</h2>
                  <p className="text-slate-400 text-sm mt-1">אנחנו מוודאים את פרטי הרישום שלך</p>
              </div>
          </div>
      );
  }

  // Final fallback if no membership found at all
  if (!liveMembership) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm">
                  <h2 className="text-xl font-bold text-slate-800 mb-4">לא נמצאה בקשת הצטרפות</h2>
                  <p className="text-slate-500 mb-6 text-sm">נראה שלא הצטרפת לאף חוג עדיין. השתמש בלינק הזמנה כדי להצטרף.</p>
                  <button onClick={() => navigate('/')} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold">חזרה לדף הבית</button>
              </div>
          </div>
      );
  }

  const club = clubs.find(c => c.id === liveMembership.clubId);
  const status = liveMembership.status;

  const handleAction = () => {
    if (status === MembershipStatus.ACTIVE) {
        navigate('/app');
    }
  };

  const handleSwitchAccount = async () => {
    if (confirm('להתנתק ולהחליף חשבון?')) {
        await logout();
        navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-500">
        <div className={`p-10 text-center text-white transition-colors duration-500 ${status === MembershipStatus.ACTIVE ? 'bg-emerald-600' : 'bg-brand-600'}`}>
            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-6 text-brand-600">
                {status === MembershipStatus.ACTIVE ? <CheckCircle size={48} className="text-emerald-600 animate-in zoom-in duration-500" /> : <Clock size={48} className="text-brand-600 animate-pulse" />}
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
                    <div className="overflow-hidden">
                        <h4 className="font-bold text-slate-800 truncate">{club?.label || 'המועדון'}</h4>
                        <span className="text-xs text-slate-400">{getRoleLabel(liveMembership.role || 'MEMBER' as any, userProfile.gender)}</span>
                    </div>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-xl font-bold text-sm transition-all ${
                    status === MembershipStatus.ACTIVE ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                    {status === MembershipStatus.ACTIVE ? <UserCheck size={20} /> : <Clock size={20} />}
                    <span>סטטוס: {status === MembershipStatus.ACTIVE ? 'פעיל ומאושר' : 'ממתין לאישור מנהל'}</span>
                </div>
            </div>

            <div className="text-center text-sm text-slate-500 space-y-4 min-h-[60px]">
                {status === MembershipStatus.PENDING ? (
                    <p className="leading-relaxed animate-in fade-in duration-700">בקשתך נשלחה למנהלי החוג. ברגע שיאשרו את הצטרפותך תוכל להיכנס למערכת השיבוץ ולנהל את האימונים.</p>
                ) : (
                    <p className="leading-relaxed animate-in slide-in-from-bottom-2 duration-700">החשבון שלך אושר! כעת אתה יכול להיכנס ולהתחיל להשתמש במערכת.</p>
                )}
            </div>

            <div className="flex flex-col gap-3">
                {status === MembershipStatus.ACTIVE ? (
                    <button onClick={handleAction} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg animate-in zoom-in">
                        כניסה למערכת <ArrowRight size={20} />
                    </button>
                ) : (
                    <div className="text-center bg-slate-100 p-4 rounded-2xl text-slate-400 font-bold text-sm border-2 border-dashed border-slate-200">
                        המערכת תהיה זמינה עבורך לאחר האישור
                    </div>
                )}
                <button onClick={handleSwitchAccount} className="text-slate-400 hover:text-red-500 text-xs font-bold py-2 flex items-center justify-center gap-2 transition-colors"><LogOut size={14} /> התנתקות והחלפת חשבון</button>
            </div>
        </div>
      </div>
    </div>
  );
};
