
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { validateInviteToken, incrementInviteUsage } from '../../services/inviteService';
import { joinClub } from '../../services/profileService';
import { addPersonToClubCloud, addLog } from '../../services/syncService';
import { ClubInvite, Role, MembershipStatus, ClubID, Gender, Person } from '../../types';
import { Waves, Ship, Loader2, ShieldCheck, ArrowLeft, AlertCircle, LogIn, Anchor } from 'lucide-react';

export const InviteLanding: React.FC = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, clubs, loginWithGoogle, setActiveClub } = useAppStore();
  
  const [invite, setInvite] = useState<ClubInvite | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      if (!token) return;
      const validInvite = await validateInviteToken(token);
      if (validInvite) {
        setInvite(validInvite);
      } else {
        setError("הלינק אינו תקין, פג תוקף או שבוטל על ידי מנהל.");
      }
      setIsValidating(false);
    };
    checkToken();
  }, [token]);

  const handleJoin = async () => {
    if (!user || !invite) return;
    setIsProcessing(true);
    
    try {
        const membership = {
            uid: user.uid,
            clubId: invite.clubId,
            role: invite.role,
            accessLevel: invite.accessLevel || (invite.role === Role.INSTRUCTOR ? 3 : 2),
            status: invite.autoApprove ? MembershipStatus.ACTIVE : MembershipStatus.PENDING,
            joinedClubDate: new Date().toISOString(),
            rank: 3 
        };

        // 1. Update Membership Collection (Auth)
        await joinClub(membership);
        await incrementInviteUsage(invite.id);
        
        // 2. If Auto-Approve, Sync to People List (Display/Pairing)
        if (invite.autoApprove) {
            const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user.email.split('@')[0];
            const personData: Person = {
                id: user.uid,
                clubId: invite.clubId,
                name: displayName,
                gender: userProfile?.gender || Gender.MALE,
                phone: userProfile?.primaryPhone || '',
                role: invite.role,
                rank: 3,
                isSkipper: userProfile?.isSkipper || false
            };
            await addPersonToClubCloud(invite.clubId, personData);
            addLog(`InviteLanding: User ${user.uid} synced to People list of ${invite.clubId}`, 'SYNC');
        }

        setActiveClub(invite.clubId);

        if (!userProfile) {
            navigate('/profile-setup');
        } else {
            navigate('/app');
        }
    } catch (err) {
        console.error("Join error:", err);
        setError("שגיאה בתהליך ההצטרפות. נסה שנית מאוחר יותר.");
    } finally {
        setIsProcessing(false);
    }
  };

  if (isValidating) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
            <h2 className="text-xl font-bold text-slate-800">בודק הזמנה...</h2>
        </div>
    );
  }

  if (error) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md border border-slate-100">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-slate-800 mb-4">אופס! משהו לא עובד</h2>
                <p className="text-slate-500 mb-8">{error}</p>
                <button onClick={() => navigate('/')} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold">חזרה לדף הבית</button>
            </div>
        </div>
      );
  }

  const club = clubs.find(c => c.id === invite?.clubId);
  const clubName = club?.label || 'המועדון';

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        <div className="p-10 bg-brand-600 text-white text-center relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-brand-600">
                {clubName.includes('שייט') ? <Ship size={48} /> : <Waves size={48} />}
            </div>
            <div className="mt-8 space-y-2">
                <h1 className="text-3xl font-black leading-tight">הוזמנת להצטרף ל{clubName}!</h1>
                <p className="opacity-80 font-medium">אנחנו מחכים לך במים</p>
            </div>
        </div>

        <div className="p-10 flex-1 flex flex-col">
            <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4">
                    <div className="bg-brand-50 p-2 rounded-lg text-brand-600"><ShieldCheck size={20} /></div>
                    <div>
                        <h4 className="font-bold text-slate-800">הצטרפות מאובטחת</h4>
                        <p className="text-xs text-slate-400">הזדהות עם חשבון Google לשמירה על פרטיותך</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="bg-brand-50 p-2 rounded-lg text-brand-600"><Anchor size={20} /></div>
                    <div>
                        <h4 className="font-bold text-slate-800">פרופיל אישי</h4>
                        <p className="text-xs text-slate-400">לאחר הכניסה תתבקש למלא תעודת זהות קצרה</p>
                    </div>
                </div>
            </div>

            {!user ? (
                <button 
                    onClick={loginWithGoogle}
                    className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-100 hover:border-brand-500 py-4 rounded-2xl font-black text-slate-800 transition-all group"
                >
                    <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                    התחבר עם Google כדי להצטרף
                </button>
            ) : (
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                        {user.photoURL && <img src={user.photoURL} alt="User" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />}
                        <div className="overflow-hidden">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">מחובר כרגע</p>
                            <p className="font-bold text-slate-800 truncate">{user.email}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleJoin}
                        disabled={isProcessing}
                        className="w-full bg-brand-600 hover:bg-brand-500 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-brand-100 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <>אני רוצה להצטרף <ArrowLeft size={24} /></>}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
