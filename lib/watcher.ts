import chokidar, { type FSWatcher } from "chokidar";
import { promises as fs } from "fs";
import path from "path";
import { getClaudeProjectsDir, type Message } from "./claude-data";
import { notificationStore, type Notification } from "./notification-store";
import { activityStore, type Activity } from "./activity-store";

// Track file positions to only read new content
const filePositions = new Map<string, number>();

// Track notified message UUIDs to prevent duplicates
const notifiedUuids = new Set<string>();

// Debounce timers for pending notifications per session
const pendingNotifications = new Map<string, {
  timer: ReturnType<typeof setTimeout>;
  message: Message;
  filePath: string;
}>();

async function processNewLines(filePath: string): Promise<void> {
  try {
    const stat = await fs.stat(filePath);
    const currentSize = stat.size;
    const lastPosition = filePositions.get(filePath) || 0;

    console.log(`[Watcher] File changed: ${filePath}, size: ${currentSize}, lastPos: ${lastPosition}`);

    if (currentSize <= lastPosition) {
      // File was truncated or no new content
      filePositions.set(filePath, currentSize);
      return;
    }

    // Read only new content
    const fileHandle = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(currentSize - lastPosition);
    await fileHandle.read(buffer, 0, buffer.length, lastPosition);
    await fileHandle.close();

    const newContent = buffer.toString("utf-8");
    const lines = newContent.split("\n").filter((line) => line.trim());

    console.log(`[Watcher] Processing ${lines.length} new lines`);

    for (const line of lines) {
      try {
        const message = JSON.parse(line) as Message;
        await processMessage(message, filePath);
      } catch {
        // Skip invalid JSON
      }
    }

    filePositions.set(filePath, currentSize);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

async function processMessage(
  message: Message,
  filePath: string
): Promise<void> {
  const stopReason = message.message?.stop_reason;
  const sessionId = message.sessionId;
  console.log(`[Watcher] Message type: ${message.type}, stop_reason: ${stopReason}, session: ${sessionId}`);

  // Extract project name for event
  const projectsDir = getClaudeProjectsDir();
  const relativePath = path.relative(projectsDir, filePath);
  const projectName = relativePath.split(path.sep)[0];

  // Record all activities with raw message content
  const activity: Activity = {
    id: `${message.uuid}-${Date.now()}`,
    type: "change",
    filePath,
    projectName,
    sessionId,
    messageType: message.type,
    stopReason,
    timestamp: new Date(),
    messageContent: message.message?.content,
  };
  activityStore.add(activity);

  // Cancel any pending notification for this session when new message arrives
  const pending = pendingNotifications.get(sessionId);
  if (pending) {
    console.log(`[Watcher] Cancelling pending notification for session ${sessionId}`);
    clearTimeout(pending.timer);
    pendingNotifications.delete(sessionId);
  }

  // User message means assistant finished - trigger immediate notification for last pending
  if (message.type === "user") {
    console.log(`[Watcher] User message received, assistant turn ended`);
    return;
  }

  if (message.type !== "assistant") return;

  // Check content for tool_use
  const content = message.message?.content;
  const hasToolUse = Array.isArray(content) && content.some(
    (item: { type: string }) => item.type === "tool_use"
  );

  // Check for text content
  const hasText = Array.isArray(content) && content.some(
    (item: { type: string }) => item.type === "text"
  );

  // Immediate notification for explicit end_turn
  const isEndTurn = stopReason === "end_turn";
  if (isEndTurn) {
    console.log(`[Watcher] Immediate notify: end_turn`);
    createNotification(message, filePath);
    return;
  }

  // If has tool_use, don't schedule notification (Claude is still working)
  if (hasToolUse) {
    console.log(`[Watcher] Tool use detected, not scheduling notification`);
    return;
  }

  // For assistant messages with text but no tool_use, schedule a debounced notification
  // This handles cases where stop_reason is null during streaming
  if (hasText) {
    console.log(`[Watcher] Scheduling debounced notification (1.5s) for session ${sessionId}`);
    const timer = setTimeout(() => {
      console.log(`[Watcher] Debounce timer fired for session ${sessionId}`);
      pendingNotifications.delete(sessionId);
      createNotification(message, filePath);
    }, 1500);

    pendingNotifications.set(sessionId, { timer, message, filePath });
  }
}

function extractTextContent(message: Message): string {
  const content = message.message?.content;
  if (!content) return "";

  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const textParts = content
      .filter((item: { type: string; text?: string }) => item.type === "text" && item.text)
      .map((item: { text?: string }) => item.text || "");
    return textParts.join("\n");
  }

  return "";
}

function createNotification(message: Message, filePath: string): void {
  // Prevent duplicate notifications for same message
  if (notifiedUuids.has(message.uuid)) {
    console.log(`[Watcher] Already notified for ${message.uuid}, skipping`);
    return;
  }
  notifiedUuids.add(message.uuid);

  // Limit set size to prevent memory leak
  if (notifiedUuids.size > 1000) {
    const first = notifiedUuids.values().next().value;
    if (first) notifiedUuids.delete(first);
  }

  // Extract project name from path
  const projectsDir = getClaudeProjectsDir();
  const relativePath = path.relative(projectsDir, filePath);
  const projectName = relativePath.split(path.sep)[0];

  // Extract text content from message
  const lastResponse = extractTextContent(message);
  console.log(`[Watcher] lastResponse length: ${lastResponse.length}, preview: ${lastResponse.slice(0, 100)}`);

  // Create notification - use uuid only for deduplication
  const notification: Notification = {
    id: message.uuid,
    type: "end_turn",
    title: "Claude Code",
    message: `Input needed (${projectName})`,
    projectName,
    sessionId: message.sessionId,
    timestamp: new Date(),
    lastResponse: lastResponse || undefined,
  };

  console.log(`[Watcher] Notification created, lastResponse: ${notification.lastResponse?.slice(0, 50) || 'none'}`);
  notificationStore.add(notification);
}

// Use global to persist across hot reloads in development
const globalForWatcher = globalThis as unknown as {
  watcher: FSWatcher | undefined;
  watcherStarted: boolean | undefined;
};

export function startWatcher(): void {
  if (globalForWatcher.watcherStarted) {
    console.log(`[Watcher] Already started, skipping`);
    return;
  }

  const projectsDir = getClaudeProjectsDir();

  console.log(`[Watcher] Starting file watcher on: ${projectsDir}`);

  globalForWatcher.watcher = chokidar.watch(projectsDir, {
    persistent: true,
    ignoreInitial: false,
    usePolling: true,
    interval: 300,
    depth: 5,
  });

  globalForWatcher.watcher.on("ready", () => {
    const watched = globalForWatcher.watcher?.getWatched();
    console.log(`[Watcher] Ready. Watching directories:`, Object.keys(watched || {}));
    const fileCount = Object.values(watched || {}).reduce((acc, files) => acc + files.length, 0);
    console.log(`[Watcher] Total files being watched: ${fileCount}`);
  });

  globalForWatcher.watcher.on("change", (filePath) => {
    if (!filePath.endsWith('.jsonl')) return;
    console.log(`[Watcher] Change detected: ${filePath}`);
    processNewLines(filePath);
  });

  globalForWatcher.watcher.on("add", async (filePath) => {
    if (!filePath.endsWith('.jsonl')) return;
    console.log(`[Watcher] New file detected: ${filePath}`);
    // Initialize position for new files
    try {
      const stat = await fs.stat(filePath);
      filePositions.set(filePath, stat.size);
    } catch {
      // Ignore errors
    }
  });

  globalForWatcher.watcher.on("error", (error) => {
    console.error("[Watcher] Error:", error);
  });

  globalForWatcher.watcherStarted = true;
  console.log(`[Watcher] Started successfully`);
}

export function stopWatcher(): void {
  if (globalForWatcher.watcher) {
    globalForWatcher.watcher.close();
    globalForWatcher.watcher = undefined;
    globalForWatcher.watcherStarted = false;
  }
}
