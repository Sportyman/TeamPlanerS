
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { saveUserProfile, joinClub } from '../../services/profileService';
import { addPersonToClubCloud, addLog } from '../../services/syncService';
import { UserProfile, Gender, GenderLabel, EmergencyContact, Certification, Role, Person, MembershipStatus } from '../../types';
import { User, Phone, Calendar, HeartPulse, Plus, Trash2, Save, LogOut, Mail, ShipWheel, Award, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProfileSetup: React.FC = () => {
  const { user, userProfile, memberships, setUserProfile, logout, activeClub } = useAppStore();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [lastName, setLastName] = useState(userProfile?.lastName || '');
  const [contactEmail, setContactEmail] = useState(userProfile?.contactEmail || user?.email || '');
  const [gender, setGender] = useState<Gender>(userProfile?.gender || Gender.MALE);
  const [birthDate, setBirthDate] = useState(userProfile?.birthDate || '');
  const [primaryPhone, setPrimaryPhone] = useState(userProfile?.primaryPhone || '');
  const [medicalNotes, setMedicalNotes] = useState(userProfile?.medicalNotes || '');
  const [isSkipper, setIsSkipper] = useState(userProfile?.isSkipper || false);
  const [certifications, setCertifications] = useState<Certification[]>(userProfile?.certifications || []);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(userProfile?.emergencyContacts || []);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 10);
    if (val.length > 0 && val[0] !== '0') val = '0' + val;
    let formatted = val;
    if (val.length > 6) formatted = `${val.slice(0, 3)}-${val.slice(3, 6)}-${val.slice(6)}`;
    else if (val.length > 3) formatted = `${val.slice(0, 3)}-${val.slice(3)}`;
    setPrimaryPhone(formatted);
  };

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
      emergencyContacts,
      medicalNotes,
      certifications,
      isSkipper,
      joinedSystemDate: userProfile?.joinedSystemDate || new Date().toISOString()
    };

    try {
      await saveUserProfile(newProfile);
      setUserProfile(newProfile);

      // Sync existing active memberships to ensure name is updated in participants list
      for (const m of memberships) {
          if (m.status === MembershipStatus.ACTIVE) {
              const personData: Person = {
                  id: user.uid,
                  clubId: m.clubId,
                  name: fullName,
                  gender,
                  phone: primaryPhone,
                  role: m.role,
                  rank: m.rank || 3,
                  isSkipper: isSkipper,
                  notes: medicalNotes
              };
              await addPersonToClubCloud(m.clubId, personData);
          }
      }

      if (user.isAdmin) {
          navigate(activeClub ? '/app' : '/super-admin');
      } else {
          navigate('/');
      }
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
            <p className="opacity-80 text-sm">אנא מלא את פרטיך להשלמת הרישום</p>
            {user?.photoURL && <img src={user.photoURL} className="w-20 h-20 rounded-2xl border-4 border-white absolute -bottom-10 left-8 shadow-xl" alt="Profile" />}
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-16 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><User size={16} /> שם פרטי</label>
                    <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><User size={16} /> שם משפחה</label>
                    <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Mail size={16} /> אימייל קשר</label>
                    <input required type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-left" dir="ltr" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Phone size={16} /> טלפון</label>
                    <input required type="tel" value={primaryPhone} onChange={handlePhoneChange} className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-left font-mono" dir="ltr" placeholder="050-000-0000" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Calendar size={16} /> תאריך לידה</label>
                    <input required type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">מין</label>
                    <div className="flex gap-2">
                        {Object.values(Gender).map(s => (
                            <button key={s} type="button" onClick={() => setGender(s)} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${gender === s ? 'bg-brand-50 border-brand-600 text-brand-700' : 'bg-white border-slate-100 text-slate-400'}`}>{GenderLabel[s]}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 border p-4 rounded-2xl bg-slate-50 border-slate-100">
                <input type="checkbox" id="isSkipper" checked={isSkipper} onChange={e => setIsSkipper(e.target.checked)} className="w-5 h-5 text-brand-600 rounded" />
                <label htmlFor="isSkipper" className="text-sm font-bold text-slate-700 flex items-center gap-2"><ShipWheel size={18} /> סקיפר / משיט</label>
            </div>

            {error && <div className="text-red-500 text-sm font-bold text-center">{error}</div>}

            <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'שומר...' : <><Save size={20} /> שמור וסיים</>}
            </button>
        </form>
      </div>
    </div>
  );
};
