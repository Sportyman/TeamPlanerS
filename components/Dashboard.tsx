
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Role, getRoleLabel, Person, Gender, RoleColorClasses, Participant, ClubMembership, APP_VERSION } from '../types';
import { Trash2, UserPlus, Edit, X, ArrowRight, Ship, Users, Search, Globe, Palette, Settings, Calendar, Mail, Phone, ChevronLeft, Info, History } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type DashboardView = 'MENU' | 'PEOPLE' | 'SETTINGS' | 'ORGANIZATION' | 'PROFILE';

export const Dashboard: React.FC = () => {
  const { people, activeClub, clubs, clubSettings, updateParticipant, addParticipant, addMemberToClub, removeMemberFromClub, updateRoleColor } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<DashboardView>('MENU');
  const [selectedPerson, setSelectedPerson] = useState<Participant | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const v = searchParams.get('view') as DashboardView;
    if (v) setView(v);
  }, [searchParams]);

  if (!activeClub) return null;
  const currentClubLabel = clubs.find(c => c.id === activeClub)?.label || '';
  const settings = clubSettings[activeClub];

  // Map Participants to the UI Person model for the current club
  const clubPeople: Person[] = people
    .filter(p => p.memberships[activeClub])
    .map(p => ({ ...p.memberships[activeClub]!, id: p.id, name: p.name, gender: p.gender, phone: p.phone, email: p.email, clubId: activeClub }));

  const filteredClubPeople = clubPeople.filter(p => p.name.includes(search));

  const handleEditProfile = (p: Participant) => {
      setSelectedPerson(p);
      setView('PROFILE');
  };

  if (view === 'MENU') {
      return (
          <div className="max-w-4xl mx-auto py-8 px-4">
              <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-slate-800 mb-2">ניהול - {currentClubLabel}</h1>
                <p className="text-slate-500 font-medium">מרכז השליטה והמידע של המועדון</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <button onClick={() => setView('PEOPLE')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-brand-500 transition-all flex flex-col items-center gap-4 group">
                      <div className="bg-brand-50 text-brand-600 p-5 rounded-2xl group-hover:bg-brand-600 group-hover:text-white transition-all"><Users size={32} /></div>
                      <h3 className="font-black text-lg text-slate-800">ניהול משתתפים</h3>
                  </button>
                  <button onClick={() => setView('ORGANIZATION')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-emerald-500 transition-all flex flex-col items-center gap-4 group">
                      <div className="bg-emerald-50 text-emerald-600 p-5 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all"><Globe size={32} /></div>
                      <h3 className="font-black text-lg text-slate-800">מאגר ארגוני כללי</h3>
                  </button>
                  <button onClick={() => setView('SETTINGS')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-cyan-500 transition-all flex flex-col items-center gap-4 group">
                      <div className="bg-cyan-50 text-cyan-600 p-5 rounded-2xl group-hover:bg-cyan-600 group-hover:text-white transition-all"><Settings size={32} /></div>
                      <h3 className="font-black text-lg text-slate-800">הגדרות מועדון</h3>
                  </button>
              </div>
          </div>
      );
  }

  if (view === 'PEOPLE') {
      return (
          <div className="max-w-4xl mx-auto py-8 px-4">
              <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-black mb-8"><ArrowRight size={24} /> חזרה</button>
              
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                  <h2 className="text-3xl font-black text-slate-800">משתתפי המועדון</h2>
                  <div className="relative w-full md:w-64">
                      <Search className="absolute right-4 top-3 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="חיפוש..." 
                        className="w-full pr-12 pl-4 py-2.5 bg-white border rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                  </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-100 overflow-hidden">
                  <table className="w-full text-right">
                      <thead className="bg-slate-50 border-b">
                          <tr>
                              <th className="p-5 font-black text-slate-500">שם</th>
                              <th className="p-5 font-black text-slate-500">תפקיד</th>
                              <th className="p-5 font-black text-slate-500 text-center">פעולות</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {filteredClubPeople.map(p => (
                              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-5">
                                      <div className="font-black text-slate-800">{p.name}</div>
                                      <div className="text-xs text-slate-400">{p.phone || 'אין טלפון'}</div>
                                  </td>
                                  <td className="p-5">
                                      <span className={`px-3 py-1 rounded-full text-xs font-black ${RoleColorClasses[settings.roleColors[p.role]].badge}`}>
                                          {getRoleLabel(p.role, p.gender)}
                                      </span>
                                  </td>
                                  <td className="p-5">
                                      <div className="flex justify-center gap-4">
                                          <button onClick={() => handleEditProfile(people.find(part => part.id === p.id)!)} className="text-slate-400 hover:text-brand-600"><Info size={20} /></button>
                                          <button onClick={() => removeMemberFromClub(p.id, activeClub)} className="text-slate-400 hover:text-red-500"><Trash2 size={20} /></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  }

  if (view === 'PROFILE' && selectedPerson) {
      const membership = selectedPerson.memberships[activeClub];
      return (
          <div className="max-w-2xl mx-auto py-8 px-4">
              <button onClick={() => setView('PEOPLE')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-black mb-8"><ArrowRight size={24} /> חזרה</button>
              
              <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-50 overflow-hidden">
                  <div className="h-32 bg-brand-600 relative">
                      <div className="absolute -bottom-12 right-8 w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center text-4xl font-black text-brand-600 border-4 border-white">
                          {selectedPerson.name.charAt(0)}
                      </div>
                  </div>
                  <div className="pt-16 pb-8 px-8 space-y-8">
                      <div>
                          <h1 className="text-3xl font-black text-slate-800">{selectedPerson.name}</h1>
                          <p className="text-slate-500 font-bold mt-1">חבר במועדון מזה: {membership?.joinedClubAt.split('T')[0]}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                              <Phone className="text-brand-500" size={20} />
                              <div><div className="text-[10px] font-black uppercase text-slate-400">טלפון</div><div className="font-bold">{selectedPerson.phone || 'לא הוזן'}</div></div>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                              <Mail className="text-brand-500" size={20} />
                              <div><div className="text-[10px] font-black uppercase text-slate-400">אימייל</div><div className="font-bold">{selectedPerson.email || 'לא הוזן'}</div></div>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <h3 className="font-black text-slate-800 flex items-center gap-2"><History size={20} /> היסטוריית פעילות</h3>
                          <div className="flex flex-wrap gap-2">
                              {membership?.participationDates.map(d => (
                                  <span key={d} className="bg-white border-2 border-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{d}</span>
                              ))}
                              {(!membership?.participationDates || membership.participationDates.length === 0) && <p className="text-slate-400 text-sm">אין היסטוריה רשומה</p>}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (view === 'SETTINGS') {
      return (
          <div className="max-w-2xl mx-auto py-8 px-4">
              <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-black mb-8"><ArrowRight size={24} /> חזרה</button>
              <h2 className="text-3xl font-black text-slate-800 mb-8">הגדרות מראה</h2>
              <div className="bg-white p-8 rounded-3xl border-2 border-slate-50 space-y-10">
                  {Object.values(Role).map(role => (
                      <div key={role} className="space-y-4">
                          <div className="flex justify-between items-center">
                              <span className="font-black text-lg">{getRoleLabel(role, Gender.MALE)}</span>
                              <div className={`px-4 py-1.5 rounded-full font-black text-sm ${RoleColorClasses[settings.roleColors[role]].badge}`}>תצוגה מקדימה</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                              {['cyan', 'orange', 'purple', 'emerald', 'blue', 'indigo', 'pink', 'slate', 'red', 'amber'].map(color => (
                                  <button 
                                    key={color} 
                                    onClick={() => updateRoleColor(role, color as any)}
                                    className={`w-10 h-10 rounded-full border-4 transition-all ${RoleColorClasses[color as any].bg} ${settings.roleColors[role] === color ? 'border-slate-800 scale-110 shadow-lg' : 'border-transparent'}`}
                                  />
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  return null;
};
