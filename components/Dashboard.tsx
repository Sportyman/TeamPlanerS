
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Role, Person, AccessLevel } from '../types';
import { Trash2, UserPlus, Ship, Users, Calendar, CalendarClock, Clock, Sparkles, ArrowRight, MessageSquare, Waves, Link2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InviteManager } from './invites/InviteManager';
import { PeopleManagementView } from './dashboard/PeopleManagementView';
import { InventoryEditor } from './dashboard/InventoryEditor';
import { MembershipRequests } from './dashboard/MembershipRequests';
import { ClubScheduleView } from './dashboard/ClubScheduleView';
import { ClubWeatherSettingsView } from './dashboard/ClubWeatherSettingsView';
import { WhatsAppDashboardView } from './whatsapp/WhatsAppDashboardView';
import { approveMembership, saveUserProfile } from '../services/profileService';
import { getDefaultBoatDefs, saveClubBoatDefinitions } from '../services/clubEquipmentService';
import { formatScheduleSummary } from '../services/scheduleService';
import { formatWindUnitLabel, getDefaultWeatherConfig } from '../services/weather/weatherDefaults';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

type ViewMode = 'MENU' | 'PEOPLE' | 'INVENTORY' | 'MEMBERSHIPS' | 'INVITES' | 'WHATSAPP' | 'SCHEDULE' | 'WEATHER';

export const Dashboard: React.FC = () => {
  const { people, activeClub, clubs, clubSettings, addNotification } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>('MENU');

  useEffect(() => {
    setView((searchParams.get('view') as ViewMode) || 'MENU');
  }, [searchParams]);

  if (!activeClub) return null;
  const currentClub = clubs.find(c => c.id === activeClub);
  const currentClubLabel = currentClub?.label || '';
  const clubPeople = people.filter(p => p.clubId === activeClub);
  const rawSettings = clubSettings[activeClub];
  const boatDefs = rawSettings?.boatDefinitions?.length ? rawSettings.boatDefinitions : getDefaultBoatDefs(activeClub, currentClubLabel);

  const handleApprove = async (m: any) => {
      try {
          let accessLevel = AccessLevel.MEMBER;
          if (m.role === Role.INSTRUCTOR) accessLevel = AccessLevel.CLUB_ADMIN;
          else if (m.role === Role.VOLUNTEER) accessLevel = AccessLevel.STAFF;

          await approveMembership(m.id, {
            role: m.role,
            rank: m.rank,
            accessLevel,
            clubSpecificNotes: m.clubSpecificNotes || '',
            ...(typeof m.isSkipper === 'boolean' ? { isSkipper: m.isSkipper } : {}),
            ...(typeof m.medicalNotes === 'string' ? { notes: m.medicalNotes } : {}),
          } as any);
          if (m.profile) {
            await saveUserProfile({
              ...m.profile,
              isSkipper: Boolean(m.isSkipper),
              medicalNotes: typeof m.medicalNotes === 'string' ? m.medicalNotes : m.profile.medicalNotes,
            });
          }

          addNotification(`אושר חבר חדש: ${m.profile?.firstName || m.displayName || m.uid}`, 'SUCCESS');
          navigate('/app/manage');
      } catch (err) {
          addNotification('שגיאה בתהליך האישור.', 'WARN');
      }
  };

  const handleRemovePerson = async (uid: string) => {
      if (confirm('להסיר את המשתמש מהחוג? פעולה זו תבטל את חברותו.')) {
          try {
              const membershipId = `${activeClub}_${uid}`;
              await deleteDoc(doc(db, 'memberships', membershipId));
              addNotification('חבר הוסר מהחוג', 'INFO');
          } catch (e) {
              addNotification('שגיאה במחיקה.', 'WARN');
          }
      }
  };

  if (view === 'INVITES') return <div className="max-w-4xl mx-auto py-6"><button onClick={() => navigate('/app/manage')} className="flex items-center gap-2 text-slate-500 mb-6"><ArrowRight size={20} /> חזרה</button><InviteManager /></div>;
  if (view === 'WHATSAPP') return <WhatsAppDashboardView />;
  if (view === 'SCHEDULE' && currentClub) return <ClubScheduleView club={currentClub} onBack={() => navigate('/app/manage')} />;
  if (view === 'WEATHER' && currentClub) return <ClubWeatherSettingsView club={currentClub} onBack={() => navigate('/app/manage')} />;
  if (view === 'MEMBERSHIPS') return <MembershipRequests clubId={activeClub} onApprove={handleApprove} onBack={() => navigate('/app/manage')} />;
  if (view === 'INVENTORY') return (
    <InventoryEditor
      clubId={activeClub}
      definitions={boatDefs}
      onSave={async (defs) => {
        await saveClubBoatDefinitions(activeClub, defs);
        addNotification('הגדרות הציוד נשמרו בהצלחה', 'SUCCESS');
        navigate('/app');
      }}
      onCancel={() => navigate('/app/manage')}
    />
  );
  if (view === 'PEOPLE') return (
    <PeopleManagementView
      activeClub={activeClub}
      people={clubPeople}
      boatDefinitions={boatDefs}
      onBack={() => navigate('/app/manage')}
      onDelete={handleRemovePerson}
      onNotify={addNotification}
    />
  );

  return (
      <div className="max-w-4xl mx-auto py-8">
          <h1 className="text-3xl font-black text-slate-800 mb-8 text-center tracking-tight">ניהול {currentClubLabel}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button onClick={() => navigate('/app')} className="col-span-1 md:col-span-2 bg-brand-600 text-white p-8 rounded-3xl flex items-center justify-center gap-6 shadow-xl hover:bg-brand-500 transition-all transform hover:-translate-y-1"><Calendar size={36} /><div><h3 className="font-black text-2xl text-right">מעבר לשיבוץ</h3><p className="text-sm opacity-80 text-right">ניהול האימון הפעיל</p></div></button>
              <button onClick={() => navigate('/app/manage?view=PEOPLE')} className="bg-white p-8 rounded-3xl border flex flex-col items-center gap-4 shadow-sm hover:shadow-lg transition-all"><Users size={32} className="text-slate-600"/><h3 className="font-bold">ניהול משתתפים</h3></button>
              <button onClick={() => navigate('/app/manage?view=INVITES')} className="bg-white p-8 rounded-3xl border flex flex-col items-center gap-4 shadow-sm hover:shadow-lg transition-all"><Sparkles size={32} className="text-brand-600"/><h3 className="font-bold">לינקים וצירוף</h3></button>
              <button onClick={() => navigate('/app/manage?view=MEMBERSHIPS')} className="bg-white p-8 rounded-3xl border flex flex-col items-center gap-4 shadow-sm hover:shadow-lg transition-all"><Clock size={32} className="text-emerald-600"/><h3 className="font-bold">בקשות הצטרפות</h3></button>
              <button onClick={() => navigate('/app/manage?view=INVENTORY')} className="bg-white p-8 rounded-3xl border flex flex-col items-center gap-4 shadow-sm hover:shadow-lg transition-all"><Ship size={32} className="text-orange-600"/><h3 className="font-bold">ניהול ציוד</h3></button>
              <button onClick={() => navigate('/app/manage?view=SCHEDULE')} className="col-span-1 md:col-span-2 bg-white p-6 rounded-3xl border flex items-center justify-center gap-4 shadow-sm hover:shadow-lg transition-all"><CalendarClock size={28} className="text-brand-600"/><div className="text-right"><h3 className="font-bold text-slate-900">לו״ז ומיקום קבוע</h3><p className="text-xs text-slate-500">{formatScheduleSummary(currentClub?.defaultSchedule)}</p></div></button>
              {(() => {
                const wc = currentClub?.weatherConfig || getDefaultWeatherConfig(activeClub, currentClubLabel);
                return (
                  <button onClick={() => navigate('/app/manage?view=WEATHER')} className="col-span-1 md:col-span-2 bg-white p-6 rounded-3xl border flex items-center justify-center gap-4 shadow-sm hover:shadow-lg transition-all">
                    <Waves size={28} className="text-sky-600"/>
                    <div className="text-right">
                      <h3 className="font-bold text-slate-900">ניטור ים, רוח וגלים</h3>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {wc.enabled ? `פעיל · סף ${wc.maxWaveCm} ס״מ גלים · ${wc.maxWindSpeed} ${formatWindUnitLabel(wc.windUnit)} רוח` : 'מושבת כרגע — לחץ להפעלה'}
                      </p>
                    </div>
                  </button>
                );
              })()}
              <button onClick={() => navigate('/app/whatsapp/pairing')} className="col-span-1 md:col-span-2 bg-white p-6 rounded-3xl border flex items-center justify-center gap-4 shadow-sm hover:shadow-lg transition-all"><Link2 size={28} className="text-brand-600"/><div className="text-right"><h3 className="font-bold text-slate-900">שיוך חוג לקבוצת וואטסאפ</h3><p className="text-xs text-slate-500">דף ייעודי לחיבור וניתוק קבוצת הוואטסאפ של החוג</p></div></button>
              <button onClick={() => navigate('/app/manage?view=WHATSAPP')} className="col-span-1 md:col-span-2 bg-white p-6 rounded-3xl border flex items-center justify-center gap-4 shadow-sm hover:shadow-lg transition-all"><MessageSquare size={28} className="text-emerald-600"/><div className="text-right"><h3 className="font-bold text-slate-900">ניהול וואטסאפ ומיפוי</h3><p className="text-xs text-slate-500">סיכום הצבעות, שיוך תמונות פרופיל והגדרות קבוצה</p></div></button>
          </div>
      </div>
  );
};
