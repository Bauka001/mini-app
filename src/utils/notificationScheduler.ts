import WebApp from '@twa-dev/sdk';
import { useStore } from '../store/useStore';

export interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'tournament' | 'reminder' | 'streak';
  scheduledTime: number;
  recurring?: 'daily' | 'weekly';
  actionUrl?: string;
}

class NotificationScheduler {
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== 'undefined') {
      this.loadScheduledNotifications();
      this.startChecker();
    }
  }

  private loadScheduledNotifications() {
    try {
      const stored = localStorage.getItem('scheduled_notifications');
      if (stored) {
        const notifications: ScheduledNotification[] = JSON.parse(stored);
        notifications.forEach(n => this.scheduledNotifications.set(n.id, n));
      }
    } catch (error) {
      console.error('Failed to load scheduled notifications:', error);
    }
  }

  private saveScheduledNotifications() {
    try {
      const notifications = Array.from(this.scheduledNotifications.values());
      localStorage.setItem('scheduled_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save scheduled notifications:', error);
    }
  }

  private startChecker() {
    this.checkInterval = setInterval(() => {
      this.checkAndTrigger();
    }, 60000); // Check every minute
  }

  private stopChecker() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private checkAndTrigger() {
    const now = Date.now();
    const store = useStore.getState();

    this.scheduledNotifications.forEach((notification, id) => {
      if (notification.scheduledTime <= now) {
        this.triggerNotification(notification);

        if (notification.recurring) {
          this.rescheduleNotification(notification);
        } else {
          this.scheduledNotifications.delete(id);
        }

        this.saveScheduledNotifications();
      }
    });
  }

  private triggerNotification(notification: ScheduledNotification) {
    try {
      if (WebApp.HapticFeedback) {
        WebApp.HapticFeedback.notificationOccurred('success');
      }

      const store = useStore.getState();
      store.addNotification({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        actionUrl: notification.actionUrl
      });

      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192.png',
          badge: '/icon-192.png'
        });
      }
    } catch (error) {
      console.error('Failed to trigger notification:', error);
    }
  }

  private rescheduleNotification(notification: ScheduledNotification) {
    let nextTime: number;

    switch (notification.recurring) {
      case 'daily':
        nextTime = notification.scheduledTime + 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        nextTime = notification.scheduledTime + 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        nextTime = notification.scheduledTime + 24 * 60 * 60 * 1000;
    }

    const updated: ScheduledNotification = {
      ...notification,
      scheduledTime: nextTime
    };

    this.scheduledNotifications.set(notification.id, updated);
  }

  schedule(notification: Omit<ScheduledNotification, 'id'>): string {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scheduled: ScheduledNotification = {
      ...notification,
      id
    };

    this.scheduledNotifications.set(id, scheduled);
    this.saveScheduledNotifications();

    return id;
  }

  scheduleDailyReminder(hour: number = 9, minute: number = 0): string {
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0,
      0
    ).getTime();

    const actualTime = scheduledTime <= now 
      ? scheduledTime + 24 * 60 * 60 * 1000 
      : scheduledTime;

    return this.schedule({
      title: '🎮 Күнделікті міндеттер!',
      message: 'Күнделікті міндеттерді орындау үшін басқыңыз!',
      type: 'reminder',
      scheduledTime: actualTime,
      recurring: 'daily',
      actionUrl: '/daily-workout'
    });
  }

  scheduleTournamentReminder(tournamentName: string, startTime: number): string {
    const reminderTime = startTime - 24 * 60 * 60 * 1000; // 24 hours before

    return this.schedule({
      title: '🏆 Турнир басталды!',
      message: `"${tournamentName}" турниріне 24 сағат қалды!`,
      type: 'tournament',
      scheduledTime: reminderTime,
      actionUrl: '/tournaments'
    });
  }

  scheduleStreakWarning(): string {
    const now = Date.now();
    const store = useStore.getState();
    const lastPlayTime = store.lastPlayTime || now;
    const hoursSinceLastPlay = (now - lastPlayTime) / (1000 * 60 * 60);

    if (hoursSinceLastPlay >= 20 && hoursSinceLastPlay < 24) {
      const warningTime = lastPlayTime + 24 * 60 * 60 * 1000;

      return this.schedule({
        title: '🔥 Стрикс жоғалады!',
        message: 'Стрикс жоғалмау үшін бүгін ойнаңыз!',
        type: 'streak',
        scheduledTime: warningTime,
        actionUrl: '/'
      });
    }

    return '';
  }

  cancel(scheduledId: string): boolean {
    const deleted = this.scheduledNotifications.delete(scheduledId);
    if (deleted) {
      this.saveScheduledNotifications();
    }
    return deleted;
  }

  cancelAll(): void {
    this.scheduledNotifications.clear();
    this.saveScheduledNotifications();
  }

  getScheduledNotifications(): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values())
      .sort((a, b) => a.scheduledTime - b.scheduledTime);
  }

  requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return Notification.requestPermission();
    }
    return Promise.resolve('denied');
  }

  destroy() {
    this.stopChecker();
  }
}

export const notificationScheduler = new NotificationScheduler();
