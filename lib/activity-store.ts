import { EventEmitter } from "events";
import type { MessageContent } from "./claude-data";

export interface Activity {
  id: string;
  type: "change" | "add";
  filePath: string;
  projectName: string;
  sessionId: string;
  messageType?: string;
  stopReason?: string | null;
  timestamp: Date;
  messageContent?: MessageContent[] | string;
}

class ActivityStore extends EventEmitter {
  private activities: Activity[] = [];
  private maxActivities = 1000;

  add(activity: Activity): void {
    console.log(`[ActivityStore] Adding: ${activity.messageType} ${activity.projectName}, listeners: ${this.listenerCount("activity")}`);
    this.activities.unshift(activity);
    if (this.activities.length > this.maxActivities) {
      this.activities.pop();
    }
    this.emit("activity", activity);
  }

  getRecent(count = 100): Activity[] {
    return this.activities.slice(0, count);
  }

  clear(): void {
    this.activities = [];
  }
}

const globalForActivity = globalThis as unknown as {
  activityStore: ActivityStore | undefined;
};

export const activityStore =
  globalForActivity.activityStore ?? new ActivityStore();

if (process.env.NODE_ENV !== "production") {
  globalForActivity.activityStore = activityStore;
}
