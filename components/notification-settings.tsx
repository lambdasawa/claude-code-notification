"use client";

import { useNotificationContext, unlockSpeech } from "@/lib/notification-context";

type ToggleStatus = "on" | "off" | "pending" | "denied";

function ToggleButton({
  label,
  status,
  onClick,
}: {
  label: string;
  status: ToggleStatus;
  onClick: () => void;
}) {
  const statusConfig = {
    on: {
      bg: "bg-green-600 hover:bg-green-700",
      dot: "bg-green-300",
      text: "On",
    },
    off: {
      bg: "bg-gray-600 hover:bg-gray-700",
      dot: "bg-gray-400",
      text: "Off",
    },
    pending: {
      bg: "bg-yellow-600 hover:bg-yellow-700",
      dot: "bg-yellow-300 animate-pulse",
      text: "...",
    },
    denied: {
      bg: "bg-red-600 cursor-not-allowed",
      dot: "bg-red-300",
      text: "Denied",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-400">{label}:</span>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${config.bg}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.text}
      </button>
    </div>
  );
}

export function NotificationSettings() {
  const {
    connected,
    listeningEnabled,
    setListeningEnabled,
    permissionStatus,
    speechEnabled,
    setSpeechEnabled,
    requestPermission,
  } = useNotificationContext();

  const listeningStatus: ToggleStatus = listeningEnabled
    ? connected
      ? "on"
      : "pending"
    : "off";

  const desktopStatus: ToggleStatus =
    permissionStatus === "granted"
      ? "on"
      : permissionStatus === "denied"
      ? "denied"
      : "off";

  const speechStatus: ToggleStatus = speechEnabled ? "on" : "off";

  return (
    <div className="flex items-center gap-4 text-sm">
      <ToggleButton
        label="Listening"
        status={listeningStatus}
        onClick={() => {
          if (!listeningEnabled) {
            unlockSpeech();
          }
          setListeningEnabled(!listeningEnabled);
        }}
      />

      <ToggleButton
        label="Desktop Notification"
        status={desktopStatus}
        onClick={() => {
          if (permissionStatus !== "granted") {
            requestPermission();
          }
        }}
      />

      <ToggleButton
        label="Speech"
        status={speechStatus}
        onClick={() => {
          if (!speechEnabled) {
            unlockSpeech();
          }
          setSpeechEnabled(!speechEnabled);
        }}
      />
    </div>
  );
}
