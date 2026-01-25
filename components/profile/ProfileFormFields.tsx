
import React from 'react';
import { User, Phone, Mail, ShipWheel } from 'lucide-react';
import { Gender, GenderLabel } from '../../types';

interface ProfileFormFieldsProps {
    firstName: string;
    setFirstName: (val: string) => void;
    lastName: string;
    setLastName: (val: string) => void;
    contactEmail: string;
    setContactEmail: (val: string) => void;
    gender: Gender;
    setGender: (val: Gender) => void;
    primaryPhone: string;
    setPrimaryPhone: (val: string) => void;
    isSkipper: boolean;
    setIsSkipper: (val: boolean) => void;
}

export const ProfileFormFields: React.FC<ProfileFormFieldsProps> = ({
    firstName, setFirstName, lastName, setLastName,
    contactEmail, setContactEmail, gender, setGender,
    primaryPhone, setPrimaryPhone, isSkipper, setIsSkipper
}) => {
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 10);
        if (val.length > 0 && val[0] !== '0') val = '0' + val;
        let formatted = val;
        if (val.length > 6) formatted = `${val.slice(0, 3)}-${val.slice(3, 6)}-${val.slice(6)}`;
        else if (val.length > 3) formatted = `${val.slice(0, 3)}-${val.slice(3)}`;
        setPrimaryPhone(formatted);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-right">
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2 justify-end">שם פרטי <User size={16} /></label>
                    <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border rounded-xl p-3 outline-none text-right focus:border-brand-500 transition-all" />
                </div>
                <div className="text-right">
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2 justify-end">שם משפחה <User size={16} /></label>
                    <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border rounded-xl p-3 outline-none text-right focus:border-brand-500 transition-all" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-right">
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2 justify-end">אימייל קשר <Mail size={16} /></label>
                    <input required type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full border rounded-xl p-3 outline-none text-left font-medium focus:border-brand-500 transition-all" dir="ltr" />
                </div>
                <div className="text-right">
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2 justify-end">טלפון <Phone size={16} /></label>
                    <input required type="tel" value={primaryPhone} onChange={handlePhoneChange} className="w-full border rounded-xl p-3 outline-none text-left font-mono focus:border-brand-500 transition-all" dir="ltr" placeholder="050-000-0000" />
                </div>
            </div>

            <div className="text-right">
                <label className="block text-sm font-bold text-slate-700 mb-1 text-right">מין</label>
                <div className="flex gap-2">
                    {Object.values(Gender).map(s => (
                        <button key={s} type="button" onClick={() => setGender(s)} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${gender === s ? 'bg-brand-50 border-brand-600 text-brand-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400'}`}>{GenderLabel[s]}</button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2 border p-4 rounded-2xl bg-slate-50 border-slate-100 group transition-all hover:bg-white hover:shadow-md flex-row-reverse">
                <input type="checkbox" id="isSkipperField" checked={isSkipper} onChange={e => setIsSkipper(e.target.checked)} className="w-5 h-5 text-brand-600 rounded cursor-pointer" />
                <label htmlFor="isSkipperField" className="flex-1 text-right text-sm font-bold text-slate-700 flex items-center gap-2 justify-end cursor-pointer">סקיפר / משיט <ShipWheel size={18} /></label>
            </div>
        </div>
    );
};
