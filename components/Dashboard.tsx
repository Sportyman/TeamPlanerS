import React, { useState } from 'react';
import { useAppStore } from '../store';
import { SessionManager } from './SessionManager';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { InviteManager } from './registration/InviteManager'; 
import { LogOut, Settings, Users, Link as LinkIcon, Sailboat } from 'lucide-react';

// שינוי קריטי: הוספנו 'export' גם כאן כדי לתמוך בייבוא עם סוגריים {}
export const Dashboard: React.FC = () => {
  const { 
    user, 
    activeClub, 
    clubs, 
    setActiveClub, 
    isManagerOf,
    logout 
  } = useAppStore();

  const [currentTab, setCurrentTab] = useState<'SESSION' | 'ADMIN' | 'INVITES'>('SESSION');

  if (!user) return null;

  const handleLogout = async () => {
    if (window.confirm('האם אתה בטוח שברצונך להתנתק?')) {
      await logout();
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-right" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* צד ימין - לוגו ובחירת מועדון */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 flex items-center gap-2">
                <Sailboat className="h-8 w-8 text-blue-600" />
                <span className="font-bold text-xl text-gray-800 hidden sm:block">TeamPlaner</span>
              </div>
              
              <select
                value={activeClub || ''}
                onChange={(e) => setActiveClub(e.target.value)}
                className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="" disabled>בחר מועדון...</option>
                {clubs.filter(c => isManagerOf(c.id)).map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </div>

            {/* צד שמאל - תפריט משתמש */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 hidden sm:flex flex-col items-end">
                <span className="font-medium text-gray-900">{user.email}</span>
                <span className="text-xs">{user.isAdmin ? 'מנהל מערכת' : 'מנהל חוג'}</span>
              </div>
              
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {user.email[0].toUpperCase()}
                </div>
              )}

              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="התנתק"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-6 mt-2 overflow-x-auto">
            <button
              onClick={() => setCurrentTab('SESSION')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                currentTab === 'SESSION'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4" />
              ניהול משמרת
            </button>

            <button
              onClick={() => setCurrentTab('INVITES')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                currentTab === 'INVITES'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <LinkIcon className="h-4 w-4" />
              קישורי הרשמה
            </button>

            {/* טאב ניהול מערכת - רק למנהל על! */}
            {user.isAdmin && (
              <button
                onClick={() => setCurrentTab('ADMIN')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                  currentTab === 'ADMIN'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="h-4 w-4" />
                ניהול מערכת
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!activeClub && currentTab !== 'ADMIN' ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Sailboat className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">לא נבחר מועדון</h3>
            <p className="mt-1 text-sm text-gray-500">אנא בחר מועדון מהתפריט העליון כדי להתחיל לנהל.</p>
          </div>
        ) : (
          <>
            {currentTab === 'SESSION' && activeClub && <SessionManager />}
            {currentTab === 'INVITES' && activeClub && <InviteManager />}
            {currentTab === 'ADMIN' && user.isAdmin && <SuperAdminDashboard />}
          </>
        )}
      </main>
    </div>
  );
};

// השארנו גם את זה לתמיכה לאחור
export default Dashboard;