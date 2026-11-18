import { StateCreator } from 'zustand';
import { AppState } from '../store';

export interface NotificationAction {
  to: string;
  label?: string;
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARN';
  action?: NotificationAction;
}

export interface NotificationSlice {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (message: string, type?: 'INFO' | 'SUCCESS' | 'WARN', action?: NotificationAction) => void;
  clearUnread: () => void;
}

export const createNotificationSlice: StateCreator<AppState, [], [], NotificationSlice> = (set) => ({
  notifications: [
    { id: '1', message: 'ברוכים הבאים למערכת אתגרים!', timestamp: new Date().toISOString(), type: 'INFO' }
  ],
  unreadCount: 1,

  addNotification: (message, type = 'INFO', action) => set((state) => ({
    notifications: [
      { id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, message, timestamp: new Date().toISOString(), type, ...(action ? { action } : {}) },
      ...state.notifications,
    ].slice(0, 20),
    unreadCount: state.unreadCount + 1
  })),

  clearUnread: () => set({ unreadCount: 0 })
});
