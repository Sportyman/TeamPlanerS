
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { saveUserProfile } from '../../services/profileService';
import { addPersonToClubCloud } from '../../services/syncService';
import { UserProfile, Gender, GenderLabel, EmergencyContact, Certification, Role, Person } from '../../types';
import { User, Phone, Calendar, HeartPulse, Plus, Trash2, Save, LogOut, Mail, ShipWheel, Award, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProfileSetup: React.FC = () => {
  const { user, userProfile, memberships, setUserProfile, logout } = useAppStore();
  const navigate = useNavigate();

  const initialFirstName = userProfile?.firstName || user?.email.split('@')[0].split('.')[0] || '';
  const initialLastName = userProfile?.lastName || user?.email.split('@')[0].split('.')[1] || '';

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
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
    let val = e.target.value.replace(/\D/g, ''); 
    if (val.length > 0 && val[0] !== '0') val = '0' + val;
    val = val.slice(0, 10);
    let formatted = val;
    if (val.length > 6) formatted = `${val.slice(0, 3)}-${val.slice(3, 6)}-${val.slice(6)}`;
    else if (val.length > 3) formatted = `${val.slice(0, 3)}-${val.slice(3)}`;
    setPrimaryPhone(formatted);
  };

  const addCertification = () => {
    const name = prompt("הכנס שם הסמכה (למשל: עזרה ראשונה, מציל, וכו'):");
    if (name) setCertifications([...certifications, { id: Date.now().toString(), name }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (primaryPhone.replace(/\D/g, '').length < 10) {
      setError("מספר טלפון חייב להכיל 10 ספרות.");
      return;
    }

    setLoading(true);
    setError(null);

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      contactEmail,
      firstName,
      lastName,
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

      // CRITICAL FIX: Ensure the user is added to the "people" list of any club they just joined via Invite (Auto-Approve)
      for (const m of memberships) {
          if (m.status === 'ACTIVE') {
              const personData: Person = {
                  id: user.uid,
                  clubId: m.clubId,
                  name: `${firstName} ${lastName}`,
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

      navigate('/');
    } catch (err: any) {
      console.error("Profile save error:", err);
      setError("שגיאה בשמירת הפרופיל. נסה שנית.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
      if (confirm('האם להתנתק כדי להחליף משתמש?')) {
          await logout();
          navigate('/login');
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 bg-brand-600 text-white relative">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <UserCircle2 size={32} />
                </div>
                <button 
                    onClick={handleSwitchAccount}
                    className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-white/20"
                >
                    <LogOut size={14} /> החלף משתמש
                </button>
            </div>
            <h1 className="text-3xl font-black mb-1">תעודת זהות - אתגרים</h1>
            <p className="opacity-80 text-sm">אנא מלא את פרטיך האישיים להשלמת הרישום</p>
            {user?.photoURL && (
                <img src={user.photoURL} alt="Avatar" className="w-20 h-20 rounded-2xl border-4 border-white absolute -bottom-10 left-8 shadow-xl" />
            )}
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-16 space-y-8">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
                <Mail className="text-blue-500" size={20} />
                <div className="flex-1">
                    <p className="text-[10px] text-blue-400 font-bold uppercase">חשבון מחובר</p>
                    <p className="font-bold text-blue-900 text-sm">{user?.email}</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm font-bold">
                    <Trash2 size={20} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <User size={16} /> שם פרטי
                    </label>
                    <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <User size={16} /> שם משפחה
                    </label>
                    <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <Mail size={16} /> אימייל ליצירת קשר
                    </label>
                    <input required type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-left" dir="ltr" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <Phone size={16} /> טלפון (0XX-XXX-XXXX)
                    </label>
                    <input required type="tel" value={primaryPhone} onChange={handlePhoneChange} className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-left font-mono" dir="ltr" placeholder="050-000-0000" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <Calendar size={16} /> תאריך לידה
                    </label>
                    <input required type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">מין</label>
                    <div className="flex gap-2">
                        {Object.values(Gender).map(s => (
                            <button key={s} type="button" onClick={() => setGender(s)} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${gender === s ? 'bg-brand-50 border-brand-600 text-brand-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                                {GenderLabel[s]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Award size={20} className="text-brand-600" /> הסמכות ויכולות
                    </h3>
                    <button type="button" onClick={addCertification} className="text-brand-600 text-sm font-bold flex items-center gap-1 hover:underline">
                        <Plus size={16} /> הוסף הסמכה
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setIsSkipper(!isSkipper)} className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold transition-all ${isSkipper ? 'bg-blue-100 border-blue-600 text-blue-800' : 'bg-white border-slate-200 text-slate-400'}`}>
                        <ShipWheel size={18} /> סקיפר / משיט
                    </button>
                </div>
            </div>

            <div className="flex gap-4 pt-6">
                <button type="submit" disabled={loading} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? 'שומר...' : <><Save size={20} /> שמור וסיים</>}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
