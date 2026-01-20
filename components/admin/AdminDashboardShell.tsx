
import React, { useState } from 'react';
import { UserSelector } from './UserSelector';
import { AdminTable } from './AdminTable';
import { RoleAssignmentModal } from './RoleAssignmentModal';
import { useAdminActions } from '../../hooks/admin/useAdminActions';
import { Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';

export const AdminDashboardShell: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<{ uid?: string; email: string; name?: string } | null>(null);
  const { promoteToSuper, updateClubLevel, demoteSuper, isProcessing, error, setError } = useAdminActions();

  const handlePromotion = async (data: { scope: 'GLOBAL' | 'CLUB'; clubId?: string; level: number }) => {
    if (!selectedUser) return;

    let success = false;
    if (data.scope === 'GLOBAL') {
      success = await promoteToSuper(selectedUser.email);
    } else if (data.clubId && selectedUser.uid) {
      success = await updateClubLevel(data.clubId, selectedUser.uid, data.level);
    }

    if (success) {
      setSelectedUser(null);
      alert('ההרשאות עודכנו בהצלחה!');
    }
  };

  const handleRemoveSuper = async (email: string) => {
    const confirmed = window.confirm(`האם אתה בטוח שברצונך להסיר את הרשאת הניהול של ${email}?`);
    if (confirmed) {
      const success = await demoteSuper(email);
      if (success) alert('הרשאת מנהל-על הוסרה.');
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Header & Search Area */}
      <section className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Sparkles className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight">מינוי בעלי תפקידים</h2>
              <p className="text-slate-400 font-medium">חפש משתמש קיים או הזן אימייל למינוי מנהל חדש</p>
            </div>
          </div>

          <UserSelector onSelect={setSelectedUser} />
        </div>
      </section>

      {/* 2. Feedback Messages */}
      {error && (
        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl flex items-start gap-4 animate-in shake duration-300">
          <AlertCircle className="text-red-500 shrink-0" size={24} />
          <div className="text-red-800">
            <p className="font-black mb-1">שגיאה בביצוע הפעולה</p>
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-xs font-bold underline">סגור הודעה</button>
          </div>
        </div>
      )}

      {/* 3. The Management List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-4">
          <ShieldCheck className="text-brand-600" size={20} />
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">בעלי הרשאות נוכחיים</h3>
        </div>
        <AdminTable 
          onRemoveSuper={handleRemoveSuper} 
          onRemoveClubAdmin={() => alert('ניהול הסרה של מנהל חוג יבוצע דרך מסך המשתמש')}
        />
      </div>

      {/* 4. The Promotion Modal */}
      {selectedUser && (
        <RoleAssignmentModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onConfirm={handlePromotion}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};
