"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  projectName: string;
  sessionId: string;
  timestamp: string;
  lastResponse?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  connected: boolean;
  listeningEnabled: boolean;
  setListeningEnabled: (enabled: boolean) => void;
  permissionStatus: NotificationPermission;
  speechEnabled: boolean;
  setSpeechEnabled: (enabled: boolean) => void;
  requestPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Track if speech has been unlocked by user gesture
let speechUnlocked = false;

export function unlockSpeech(): void {
  if (speechUnlocked) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  // Speak empty utterance to unlock
  const utterance = new SpeechSynthesisUtterance("");
  utterance.volume = 0;
  speechSynthesis.speak(utterance);
  speechUnlocked = true;
  console.log("[NotificationProvider] Speech unlocked by user gesture");
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const [listeningEnabled, setListeningEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermission>("default");
  const [speechEnabled, setSpeechEnabled] = useState(true);

  const permissionRef = useRef(permissionStatus);
  const speechRef = useRef(speechEnabled);

  // Check notification permission on client side only
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    permissionRef.current = permissionStatus;
  }, [permissionStatus]);

  useEffect(() => {
    speechRef.current = speechEnabled;
  }, [speechEnabled]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
  }, []);

  const showNotification = useCallback((notification: Notification) => {
    console.log("[NotificationProvider] showNotification:", notification);
    console.log("[NotificationProvider] speechRef.current:", speechRef.current);
    console.log("[NotificationProvider] permissionRef.current:", permissionRef.current);

    // Desktop notification
    const currentPermission = permissionRef.current;
    if (currentPermission === "granted") {
      console.log("[NotificationProvider] Showing desktop notification");
      const body = notification.lastResponse
        ? notification.lastResponse.slice(0, 200)
        : "アイドル状態です";
      new Notification("Claude Code Notification", {
        body,
        tag: notification.id,
      });
    }

    // Speech notification - always try to speak if enabled
    const currentSpeech = speechRef.current;
    console.log("[NotificationProvider] Speech enabled:", currentSpeech);
    if (currentSpeech && typeof window !== "undefined" && "speechSynthesis" in window) {
      console.log("[NotificationProvider] Speaking in Japanese");
      // Cancel any pending speech first
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("アイドル状態です");
      utterance.lang = "ja-JP";
      utterance.rate = 1.0;
      utterance.onend = () => console.log("[NotificationProvider] Speech ended");
      utterance.onerror = (e) => console.log("[NotificationProvider] Speech error:", e);
      speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    if (!listeningEnabled) {
      setConnected(false);
      return;
    }

    const eventSource = new EventSource("/api/events");

    eventSource.addEventListener("ping", () => {
      setConnected(true);
    });

    eventSource.addEventListener("notification", (event) => {
      const notification = JSON.parse(event.data) as Notification;
      console.log("[NotificationProvider] Received notification:", notification);

      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) {
          return prev;
        }
        return [notification, ...prev].slice(0, 50);
      });

      showNotification(notification);
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [listeningEnabled, showNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        connected,
        listeningEnabled,
        setListeningEnabled,
        permissionStatus,
        speechEnabled,
        setSpeechEnabled,
        requestPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider"
    );
  }
  return context;
}
