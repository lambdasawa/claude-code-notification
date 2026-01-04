import { EventEmitter } from "events";

export interface Notification {
  id: string;
  type: "end_turn" | "tool_use";
  title: string;
  message: string;
  projectName: string;
  sessionId: string;
  timestamp: Date;
  lastResponse?: string;
}

class NotificationStore extends EventEmitter {
  private notifications: Notification[] = [];
  private maxNotifications = 100;

  add(notification: Notification): void {
    // Deduplicate by id
    if (this.notifications.some((n) => n.id === notification.id)) {
      console.log(`[NotificationStore] Duplicate notification, skipping: ${notification.id}`);
      return;
    }

    console.log(`[NotificationStore] Adding notification, listeners: ${this.listenerCount("notification")}`);
    this.notifications.unshift(notification);
    if (this.notifications.length > this.maxNotifications) {
      this.notifications.pop();
    }

    // Emit safely - catch errors from listeners
    const listeners = this.listeners("notification");
    for (const listener of listeners) {
      try {
        (listener as (n: Notification) => void)(notification);
      } catch (error) {
        console.log(`[NotificationStore] Listener error (removing):`, error);
        this.off("notification", listener as (n: Notification) => void);
      }
    }
    console.log(`[NotificationStore] Emitted notification to ${listeners.length} listeners`);
  }

  getRecent(count = 10): Notification[] {
    return this.notifications.slice(0, count);
  }

  clear(): void {
    this.notifications = [];
  }
}

// Use global to persist across hot reloads in development
const globalForNotification = globalThis as unknown as {
  notificationStore: NotificationStore | undefined;
};

export const notificationStore =
  globalForNotification.notificationStore ?? new NotificationStore();

if (process.env.NODE_ENV !== "production") {
  globalForNotification.notificationStore = notificationStore;
}
