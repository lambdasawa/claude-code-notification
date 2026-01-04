import { notificationStore, type Notification } from "@/lib/notification-store";
import { startWatcher } from "@/lib/watcher";

// Start watcher when this module loads
startWatcher();

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial ping
      controller.enqueue(encoder.encode("event: ping\ndata: connected\n\n"));

      // Send recent notifications
      const recent = notificationStore.getRecent(5);
      for (const notification of recent) {
        const data = JSON.stringify(notification);
        controller.enqueue(
          encoder.encode(`event: notification\ndata: ${data}\n\n`)
        );
      }

      // Listen for new notifications
      let closed = false;
      const onNotification = (notification: Notification) => {
        if (closed) return;
        try {
          const data = JSON.stringify(notification);
          controller.enqueue(
            encoder.encode(`event: notification\ndata: ${data}\n\n`)
          );
        } catch {
          closed = true;
          notificationStore.off("notification", onNotification);
        }
      };

      notificationStore.on("notification", onNotification);

      // Keep connection alive with pings
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`)
          );
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Cleanup on close
      const cleanup = () => {
        closed = true;
        clearInterval(pingInterval);
        notificationStore.off("notification", onNotification);
      };

      // Handle stream closing
      return cleanup;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
