
import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { saveUserProfile } from '../../services/profileService';
import { addPersonToClubCloud, sendNotificationToClub } from '../../services/syncService';
import { UserProfile, Gender, Role, Person, MembershipStatus } from '../../types';
import { Save, LogOut, UserCircle2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ProfileFormFields } from './ProfileFormFields';

export const ProfileSetup: React.FC = () => {
  const { user, userProfile, memberships, setUserProfile, logout } = useAppStore();
  const { isSuperAdmin } = usePermissions();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [lastName, setLastName] = useState(userProfile?.lastName || '');
  const [contactEmail, setContactEmail] = useState(userProfile?.contactEmail || user?.email || '');
  const [gender, setGender] = useState<Gender>(userProfile?.gender || Gender.MALE);
  const [birthDate, setBirthDate] = useState(userProfile?.birthDate || '');
  const [primaryPhone, setPrimaryPhone] = useState(userProfile?.primaryPhone || '');
  const [medicalNotes, setMedicalNotes] = useState(userProfile?.medicalNotes || '');
  const [isSkipper, setIsSkipper] = useState(userProfile?.isSkipper || false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      contactEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      photoURL: user.photoURL,
      gender,
      birthDate,
      primaryPhone,
      emergencyContacts: userProfile?.emergencyContacts || [],
      medicalNotes,
      certifications: userProfile?.certifications || [],
      isSkipper,
      joinedSystemDate: userProfile?.joinedSystemDate || new Date().toISOString()
    };

    try {
      await saveUserProfile(newProfile);
      setUserProfile(newProfile);

      for (const m of memberships) {
          if (m.status === MembershipStatus.ACTIVE || isSuperAdmin) {
              const personData: Person = {
                  id: user.uid,
                  clubId: m.clubId,
                  name: fullName,
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                  gender,
                  phone: primaryPhone,
                  role: m.role || Role.MEMBER,
                  rank: m.rank || 3,
                  isSkipper: isSkipper,
                  notes: medicalNotes
              };
              await addPersonToClubCloud(m.clubId, personData);
          } else if (m.status === MembershipStatus.PENDING) {
              const membershipId = `${m.clubId}_${user.uid}`;
              await updateDoc(doc(db, 'memberships', membershipId), {
                  lastProfileUpdate: new Date().toISOString()
              });
              await sendNotificationToClub(m.clubId, `משתמש סיים למלא פרופיל: ${fullName}`, 'SUCCESS');
          }
      }

      if (isSuperAdmin) navigate('/app');
      else navigate('/registration-status');
    } catch (err: any) {
      setError("שגיאה בשמירה. נסה שנית.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
      if (confirm('החלף משתמש?')) {
          await logout();
          navigate('/login');
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8 bg-brand-600 text-white relative">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md"><UserCircle2 size={32} /></div>
                <button onClick={handleSwitchAccount} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-white/20 flex items-center gap-2"><LogOut size={14} /> החלף משתמש</button>
            </div>
            <h1 className="text-3xl font-black mb-1">פרופיל אישי</h1>
            <p className="opacity-80 text-sm font-medium">אנא מלא את פרטיך להשלמת הרישום</p>
            {user?.photoURL && <img src={user.photoURL} className="w-20 h-20 rounded-2xl border-4 border-white absolute -bottom-10 left-8 shadow-xl" alt="Profile" />}
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-16 space-y-6">
            <ProfileFormFields 
                firstName={firstName} setFirstName={setFirstName}
                lastName={lastName} setLastName={setLastName}
                contactEmail={contactEmail} setContactEmail={setContactEmail}
                gender={gender} setGender={setGender}
                primaryPhone={primaryPhone} setPrimaryPhone={setPrimaryPhone}
                isSkipper={isSkipper} setIsSkipper={setIsSkipper}
            />

            <div className="text-right">
                <label className="block text-sm font-bold text-slate-700 mb-1 text-right">תאריך לידה <Calendar size={16} className="inline mr-1" /></label>
                <input required type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full border rounded-xl p-3 outline-none text-right focus:border-brand-500" />
            </div>

            <div className="text-right">
                <label className="block text-sm font-bold text-slate-700 mb-1 text-right">הערות רפואיות</label>
                <textarea value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)} className="w-full border rounded-xl p-3 outline-none text-right focus:border-brand-500 h-24" placeholder="רגישויות, מוגבלויות או כל דבר שחשוב שצוות האימון ידע..." />
            </div>

            {error && <div className="text-red-500 text-sm font-bold text-center animate-bounce">{error}</div>}

            <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'שומר...' : <><Save size={20} /> שמור וסיים</>}
            </button>
        </form>
      </div>
    </div>
  );
};
