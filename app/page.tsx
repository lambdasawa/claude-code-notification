"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useNotificationContext } from "@/lib/notification-context";
import { MessageContentView, formatTime } from "@/components/message-components";
import type { MessageContent } from "@/components/message-components";

interface Activity {
  id: string;
  type: "change" | "add";
  filePath: string;
  projectName: string;
  sessionId: string;
  messageType?: string;
  stopReason?: string | null;
  timestamp: string;
  messageContent?: MessageContent[] | string;
}

export default function Home() {
  const { listeningEnabled } = useNotificationContext();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!listeningEnabled) {
      setConnected(false);
      return;
    }

    const eventSource = new EventSource("/api/activity");

    eventSource.addEventListener("ping", () => {
      setConnected(true);
    });

    eventSource.addEventListener("activity", (e) => {
      const activity = JSON.parse(e.data) as Activity;
      setActivities((prev) => {
        if (prev.some((a) => a.id === activity.id)) {
          return prev;
        }
        return [activity, ...prev].slice(0, 1000);
      });
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [listeningEnabled]);

  // Sort by timestamp descending
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity</h1>
        {listeningEnabled && (
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              connected
                ? "bg-green-900 text-green-300"
                : "bg-yellow-900 text-yellow-300"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-green-400" : "bg-yellow-400 animate-pulse"
              }`}
            />
            {connected ? "Connected" : "Connecting..."}
          </span>
        )}
      </div>

      {!listeningEnabled ? (
        <p className="text-gray-500">
          Enable listening to see agent activity and idle notifications.
        </p>
      ) : activities.length === 0 ? (
        <p className="text-gray-500">
          Waiting for activity...
        </p>
      ) : (
        <div className="space-y-4">
          {sortedActivities.map((activity) => (
            <div
              key={activity.id}
              className="rounded-lg border bg-gray-800 border-gray-700"
            >
              <Link
                href={`/projects/${encodeURIComponent(activity.projectName)}/sessions/${encodeURIComponent(activity.sessionId)}`}
                className="flex items-center gap-2 px-3 py-2 font-mono text-sm hover:bg-gray-700/50"
              >
                <span className="text-gray-500">{formatTime(activity.timestamp)}</span>
                <span
                  className={`font-bold ${
                    activity.messageType === "assistant"
                      ? "text-green-400"
                      : activity.messageType === "user" && Array.isArray(activity.messageContent) && activity.messageContent.some((c) => c.type === "tool_result")
                      ? "text-purple-400"
                      : activity.messageType === "user"
                      ? "text-blue-400"
                      : "text-gray-400"
                  }`}
                >
                  {activity.messageType === "assistant"
                    ? "LLM"
                    : activity.messageType === "user" && Array.isArray(activity.messageContent) && activity.messageContent.some((c) => c.type === "tool_result")
                    ? "Tool"
                    : activity.messageType === "user"
                    ? "Human"
                    : activity.messageType || "unknown"}
                </span>
                <span className="text-gray-400">{activity.projectName}</span>
                <span className="text-gray-600 text-xs">{activity.sessionId?.slice(0, 8)}</span>
                {activity.stopReason && (
                  <span className="text-gray-500 text-xs">
                    [{activity.stopReason}]
                  </span>
                )}
              </Link>

              {/* Message content */}
              {activity.messageContent && (
                <div className="px-3 py-2 border-t border-gray-700">
                  <div className="text-gray-200 break-words overflow-hidden">
                    <MessageContentView content={activity.messageContent} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
