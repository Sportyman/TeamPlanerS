
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { saveUserProfile } from '../../services/profileService';
import { UserProfile, Gender, GenderLabel, EmergencyContact, Certification } from '../../types';
import { User, Phone, Calendar, HeartPulse, Plus, Trash2, Save, LogOut, Mail, ShipWheel, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProfileSetup: React.FC = () => {
  const { user, userProfile, setUserProfile, logout } = useAppStore();
  const navigate = useNavigate();

  // Initialize from Google if no profile exists
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

  // Phone Masking Logic: 0XX-XXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Force start with 0
    if (val.length > 0 && val[0] !== '0') {
      val = '0' + val;
    }

    // Limit to 10 digits
    val = val.slice(0, 10);

    // Format with hyphens
    let formatted = val;
    if (val.length > 6) {
      formatted = `${val.slice(0, 3)}-${val.slice(3, 6)}-${val.slice(6)}`;
    } else if (val.length > 3) {
      formatted = `${val.slice(0, 3)}-${val.slice(3)}`;
    }

    setPrimaryPhone(formatted);
  };

  const addContact = () => {
    setEmergencyContacts([...emergencyContacts, { name: '', phone: '', relation: '' }]);
  };

  const removeContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    const updated = [...emergencyContacts];
    updated[index][field] = value;
    setEmergencyContacts(updated);
  };

  const addCertification = () => {
    const name = prompt("הכנס שם הסמכה (למשל: עזרה ראשונה, מציל, וכו'):");
    if (name) {
      setCertifications([...certifications, { id: Date.now().toString(), name }]);
    }
  };

  const removeCertification = (id: string) => {
    setCertifications(certifications.filter(c => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Basic validation
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
      navigate('/');
    } catch (err: any) {
      console.error("Profile save error:", err);
      if (err.message?.includes('permissions')) {
        setError("שגיאת הרשאות ב-Firebase. וודא שעדכנת את ה-Security Rules כפי שמופיע בהוראות ה-CTO.");
      } else {
        setError("שגיאה בשמירת הפרופיל. נסה שנית.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 bg-brand-600 text-white text-center relative">
            <h1 className="text-3xl font-black mb-2">תעודת זהות - אתגרים</h1>
            <p className="opacity-80">אנא מלא את פרטיך האישיים להשלמת הרישום למערכת</p>
            {user?.photoURL && (
                <img src={user.photoURL} alt="Avatar" className="w-16 h-16 rounded-full border-4 border-white absolute -bottom-8 left-8 shadow-md" />
            )}
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-12 space-y-8">
            
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm font-bold">
                    <Trash2 size={20} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Name Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <User size={16} /> שם פרטי
                    </label>
                    <input 
                        required 
                        type="text" 
                        value={firstName} 
                        onChange={e => setFirstName(e.target.value)} 
                        className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <User size={16} /> שם משפחה
                    </label>
                    <input 
                        required 
                        type="text" 
                        value={lastName} 
                        onChange={e => setLastName(e.target.value)} 
                        className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
            </div>

            {/* Email & Phone Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <Mail size={16} /> אימייל ליצירת קשר
                    </label>
                    <input 
                        required 
                        type="email" 
                        value={contactEmail} 
                        onChange={e => setContactEmail(e.target.value)} 
                        className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-left"
                        dir="ltr"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <Phone size={16} /> טלפון (0XX-XXX-XXXX)
                    </label>
                    <input 
                        required 
                        type="tel" 
                        value={primaryPhone} 
                        onChange={handlePhoneChange} 
                        className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-left font-mono"
                        dir="ltr"
                        placeholder="050-000-0000"
                    />
                </div>
            </div>

            {/* Gender & BirthDate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <Calendar size={16} /> תאריך לידה
                    </label>
                    <input 
                        required 
                        type="date" 
                        value={birthDate} 
                        onChange={e => setBirthDate(e.target.value)} 
                        className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">מין</label>
                    <div className="flex gap-2">
                        {Object.values(Gender).map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setGender(s)}
                                className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${gender === s ? 'bg-brand-50 border-brand-600 text-brand-700' : 'bg-white border-slate-100 text-slate-400'}`}
                            >
                                {GenderLabel[s]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Certifications Section */}
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
                    <button
                        type="button"
                        onClick={() => setIsSkipper(!isSkipper)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold transition-all ${isSkipper ? 'bg-blue-100 border-blue-600 text-blue-800' : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                        <ShipWheel size={18} /> סקיפר / משיט
                    </button>
                    {certifications.map(cert => (
                        <div key={cert.id} className="bg-brand-100 text-brand-800 px-4 py-2 rounded-full flex items-center gap-2 border border-brand-200">
                            <span className="text-sm font-bold">{cert.name}</span>
                            <button type="button" onClick={() => removeCertification(cert.id)} className="text-brand-400 hover:text-red-500">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Emergency Contacts Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Phone size={20} className="text-orange-500" /> אנשי קשר לחירום
                    </h3>
                    <button type="button" onClick={addContact} className="text-brand-600 text-sm font-bold flex items-center gap-1 hover:underline">
                        <Plus size={16} /> הוסף איש קשר
                    </button>
                </div>
                {emergencyContacts.length === 0 && <p className="text-xs text-slate-400 italic">לא נוספו אנשי קשר לחירום</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {emergencyContacts.map((contact, index) => (
                        <div key={index} className="p-4 bg-white rounded-2xl border border-slate-200 relative animate-in fade-in slide-in-from-right-4">
                            <button type="button" onClick={() => removeContact(index)} className="absolute top-2 left-2 text-slate-300 hover:text-red-500 p-1">
                                <Trash2 size={16} />
                            </button>
                            <div className="space-y-2">
                                <input placeholder="שם איש קשר" required value={contact.name} onChange={e => updateContact(index, 'name', e.target.value)} className="w-full border-b text-sm font-bold p-1 outline-none focus:border-brand-500" />
                                <input placeholder="טלפון" required value={contact.phone} onChange={e => updateContact(index, 'phone', e.target.value)} className="w-full border-b text-sm p-1 outline-none focus:border-brand-500 text-left" dir="ltr" />
                                <input placeholder="קרבה" required value={contact.relation} onChange={e => updateContact(index, 'relation', e.target.value)} className="w-full text-[10px] text-slate-500 outline-none p-1" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Notes Section */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                    <HeartPulse size={16} className="text-slate-400" /> הערות כלליות / רפואיות (אופציונלי)
                </label>
                <textarea 
                    value={medicalNotes} 
                    onChange={e => setMedicalNotes(e.target.value)} 
                    className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none h-24 text-sm"
                    placeholder="מידע רלוונטי לצוות המקצועי..."
                />
            </div>

            <div className="flex gap-4 pt-6">
                <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? 'שומר...' : <><Save size={20} /> שמור וסיים</>}
                </button>
                <button 
                    type="button" 
                    onClick={() => { logout(); navigate('/'); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-6 py-4 rounded-2xl transition-all flex items-center gap-2"
                >
                    <LogOut size={20} /> ביטול
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
