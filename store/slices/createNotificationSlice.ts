
import { StateCreator } from 'zustand';
import { AppState } from '../store';

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARN';
}

export interface NotificationSlice {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (message: string, type?: 'INFO' | 'SUCCESS' | 'WARN') => void;
  clearUnread: () => void;
}

export const createNotificationSlice: StateCreator<AppState, [], [], NotificationSlice> = (set) => ({
  notifications: [
    { id: '1', message: 'ברוכים הבאים למערכת אתגרים!', timestamp: new Date().toISOString(), type: 'INFO' }
  ],
  unreadCount: 1,

  addNotification: (message, type = 'INFO') => set((state) => ({
    notifications: [{ id: Math.random().toString(), message, timestamp: new Date().toISOString(), type }, ...state.notifications].slice(0, 20),
    unreadCount: state.unreadCount + 1
  })),

  clearUnread: () => set({ unreadCount: 0 })
});
