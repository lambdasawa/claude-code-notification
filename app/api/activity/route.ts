import { activityStore, type Activity } from "@/lib/activity-store";
import { startWatcher } from "@/lib/watcher";

startWatcher();

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("event: ping\ndata: connected\n\n"));

      const recent = activityStore.getRecent(100);
      for (const activity of recent) {
        const data = JSON.stringify(activity);
        controller.enqueue(
          encoder.encode(`event: activity\ndata: ${data}\n\n`)
        );
      }

      let closed = false;
      const onActivity = (activity: Activity) => {
        if (closed) return;
        try {
          const data = JSON.stringify(activity);
          controller.enqueue(
            encoder.encode(`event: activity\ndata: ${data}\n\n`)
          );
        } catch {
          closed = true;
          activityStore.off("activity", onActivity);
        }
      };

      activityStore.on("activity", onActivity);

      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`)
          );
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      const cleanup = () => {
        closed = true;
        clearInterval(pingInterval);
        activityStore.off("activity", onActivity);
      };

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
