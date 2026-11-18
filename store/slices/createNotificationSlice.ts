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
  read?: boolean;
}

export interface AddNotificationOptions {
  dedupeKey?: string;
}

export interface NotificationSlice {
  notifications: Notification[];
  unreadCount: number;
  seenNotificationKeys: string[];
  addNotification: (
    message: string,
    type?: 'INFO' | 'SUCCESS' | 'WARN',
    action?: NotificationAction,
    options?: AddNotificationOptions
  ) => void;
  clearUnread: () => void;
}

export const createNotificationSlice: StateCreator<AppState, [], [], NotificationSlice> = (set) => ({
  notifications: [
    { id: '1', message: 'ברוכים הבאים למערכת אתגרים!', timestamp: new Date().toISOString(), type: 'INFO', read: true },
  ],
  unreadCount: 0,
  seenNotificationKeys: [],

  addNotification: (message, type = 'INFO', action, options) => set((state) => {
    const key = options?.dedupeKey;
    if (key && state.seenNotificationKeys.includes(key)) {
      return state;
    }
    const nextItem: Notification = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      message,
      timestamp: new Date().toISOString(),
      type,
      read: false,
      ...(action ? { action } : {}),
    };
    return {
      notifications: [nextItem, ...state.notifications].slice(0, 25),
      unreadCount: state.unreadCount + 1,
      seenNotificationKeys: key
        ? [...state.seenNotificationKeys, key].slice(-120)
        : state.seenNotificationKeys,
    };
  }),

  clearUnread: () => set((state) => ({
    unreadCount: 0,
    notifications: state.notifications.map((n) => (n.read ? n : { ...n, read: true })),
  })),
});
