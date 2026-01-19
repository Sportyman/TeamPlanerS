

import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { saveUserProfile } from '../../services/profileService';
import { UserProfile, Gender, GenderLabel, EmergencyContact } from '../../types';
import { User, Phone, Calendar, HeartPulse, Plus, Trash2, Save, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProfileSetup: React.FC = () => {
  const { user, userProfile, setUserProfile, logout } = useAppStore();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(userProfile?.fullName || user?.email.split('@')[0] || '');
  const [gender, setGender] = useState<Gender>(userProfile?.gender || Gender.MALE);
  const [birthDate, setBirthDate] = useState(userProfile?.birthDate || '');
  const [primaryPhone, setPrimaryPhone] = useState(userProfile?.primaryPhone || '');
  const [medicalNotes, setMedicalNotes] = useState(userProfile?.medicalNotes || '');
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(userProfile?.emergencyContacts || []);
  
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      fullName,
      photoURL: user.photoURL,
      gender,
      birthDate,
      primaryPhone,
      emergencyContacts,
      medicalNotes,
      certifications: userProfile?.certifications || [],
      joinedSystemDate: userProfile?.joinedSystemDate || new Date().toISOString()
    };

    try {
      await saveUserProfile(newProfile);
      setUserProfile(newProfile);
      navigate('/');
    } catch (err) {
      alert("שגיאה בשמירת הפרופיל.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 bg-brand-600 text-white text-center">
            <h1 className="text-3xl font-black mb-2">תעודת זהות - אתגרים</h1>
            <p className="opacity-80">בוא נכיר אותך קצת יותר טוב כדי להבטיח את הבטיחות שלך</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <User size={16} /> שם מלא
                    </label>
                    <input 
                        required 
                        type="text" 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)} 
                        className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="כפי שיופיע במערכת"
                    />
                </div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <Phone size={16} /> טלפון ראשי
                    </label>
                    <input 
                        required 
                        type="tel" 
                        value={primaryPhone} 
                        onChange={e => setPrimaryPhone(e.target.value)} 
                        className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none text-left"
                        dir="ltr"
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

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                    <HeartPulse size={16} className="text-red-500" /> הערות רפואיות (חובה)
                </label>
                <textarea 
                    required 
                    value={medicalNotes} 
                    onChange={e => setMedicalNotes(e.target.value)} 
                    className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-brand-500 outline-none h-24"
                    placeholder="ציין כל מידע רפואי רלוונטי לפעילות ימית..."
                />
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">אנשי קשר לחירום</h3>
                    <button type="button" onClick={addContact} className="text-brand-600 text-sm font-bold flex items-center gap-1 hover:underline">
                        <Plus size={16} /> הוסף איש קשר
                    </button>
                </div>
                {emergencyContacts.map((contact, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 relative animate-in fade-in slide-in-from-right-4">
                        <button type="button" onClick={() => removeContact(index)} className="absolute -top-2 -left-2 bg-white text-red-500 rounded-full p-1 shadow-sm border border-red-50">
                            <Trash2 size={14} />
                        </button>
                        <input 
                            placeholder="שם" 
                            required 
                            value={contact.name} 
                            onChange={e => updateContact(index, 'name', e.target.value)}
                            className="w-full border rounded-lg p-2 text-sm"
                        />
                        <input 
                            placeholder="טלפון" 
                            required 
                            value={contact.phone} 
                            onChange={e => updateContact(index, 'phone', e.target.value)}
                            className="w-full border rounded-lg p-2 text-sm text-left"
                            dir="ltr"
                        />
                        <input 
                            placeholder="קרבה (למשל: אמא)" 
                            required 
                            value={contact.relation} 
                            onChange={e => updateContact(index, 'relation', e.target.value)}
                            className="w-full border rounded-lg p-2 text-sm"
                        />
                    </div>
                ))}
            </div>

            <div className="flex gap-4 pt-6">
                <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? 'שומר...' : <><Save size={20} /> שמור תעודת זהות</>}
                </button>
                <button 
                    type="button" 
                    onClick={() => { logout(); navigate('/'); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-6 py-4 rounded-2xl transition-all flex items-center gap-2"
                >
                    <LogOut size={20} /> התנתק
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
