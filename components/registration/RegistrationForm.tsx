
import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { UserProfile, Gender, GenderLabel, MembershipStatus, Role } from '../../types';
import { saveUserProfile, joinClub } from '../../services/profileService';
import { User, Mail, Phone, Calendar, Save, Waves, Loader2 } from 'lucide-react';

export const RegistrationForm: React.FC = () => {
    const { clubId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, clubs, loadUserResources } = useAppStore();

    const inviteType = searchParams.get('type') || 'pending';
    const club = clubs.find(c => c.id === clubId);

    const [formData, setFormData] = useState({
        firstName: '', lastName: '', contactEmail: user?.email || '',
        phone: '', gender: Gender.MALE, birthDate: '', medicalNotes: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !clubId) return;
        setLoading(true);

        const profile: UserProfile = {
            uid: user.uid, email: user.email,
            firstName: formData.firstName, lastName: formData.lastName,
            contactEmail: formData.contactEmail,
            gender: formData.gender, birthDate: formData.birthDate,
            primaryPhone: formData.phone, medicalNotes: formData.medicalNotes,
            emergencyContacts: [], certifications: [], isSkipper: false,
            joinedSystemDate: new Date().toISOString()
        };

        try {
            await saveUserProfile(profile);
            await joinClub({
                uid: user.uid, clubId, role: Role.MEMBER,
                status: inviteType === 'auto' ? MembershipStatus.ACTIVE : MembershipStatus.PENDING,
                joinedClubDate: new Date().toISOString(), rank: 3
            });
            await loadUserResources(user.uid);
            navigate('/registration-success');
        } catch (err) {
            alert("שגיאה ברישום. נסה שנית.");
        } finally { setLoading(false); }
    };

    if (!club) return <div className="p-10 text-center">מועדון לא נמצא.</div>;

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center">
            <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                <div className="p-8 bg-brand-600 text-white text-center">
                    <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Waves size={32} />
                    </div>
                    <h1 className="text-3xl font-black mb-2">טופס הצטרפות</h1>
                    <p className="opacity-80">חוג {club.label} - עמותת אתגרים</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><User size={16}/> שם פרטי</label>
                            <input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full border rounded-xl p-3" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><User size={16}/> שם משפחה</label>
                            <input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full border rounded-xl p-3" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Mail size={16}/> מייל ליצירת קשר</label>
                            <input type="email" required value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} className="w-full border rounded-xl p-3 text-left" dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Phone size={16}/> טלפון</label>
                            <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border rounded-xl p-3 text-left" dir="ltr" placeholder="05X-XXXXXXX" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Calendar size={16}/> תאריך לידה</label>
                            <input type="date" required value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full border rounded-xl p-3" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">מין</label>
                            <div className="flex gap-2">
                                {Object.values(Gender).map(g => (
                                    <button key={g} type="button" onClick={() => setFormData({...formData, gender: g})} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${formData.gender === g ? 'bg-brand-50 border-brand-600 text-brand-700' : 'bg-white text-slate-400'}`}>
                                        {GenderLabel[g]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">הערות רלוונטיות</label>
                        <textarea value={formData.medicalNotes} onChange={e => setFormData({...formData, medicalNotes: e.target.value})} className="w-full border rounded-xl p-3 h-24" placeholder="מידע חשוב לצוות..." />
                    </div>

                    <button disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> שלח וסיים רישום</>}
                    </button>
                </form>
            </div>
        </div>
    );
};
