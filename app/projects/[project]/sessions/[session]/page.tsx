"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useNotificationContext } from "@/lib/notification-context";
import { MessageContentView, formatTimestamp, type MessageContent } from "@/components/message-components";

interface Message {
  uuid: string;
  type: "user" | "assistant";
  timestamp: string;
  message: {
    role: "user" | "assistant";
    content: MessageContent[] | string;
    stop_reason?: string | null;
  };
  toolUseResult?: {
    stdout?: string;
    stderr?: string;
  };
}

export default function SessionPage({
  params,
}: {
  params: Promise<{ project: string; session: string }>;
}) {
  const { project, session } = use(params);
  const projectName = decodeURIComponent(project);
  const sessionId = decodeURIComponent(session);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const { connected, listeningEnabled } = useNotificationContext();

  useEffect(() => {
    const fetchMessages = () => {
      fetch(
        `/api/projects/${encodeURIComponent(projectName)}/sessions/${encodeURIComponent(sessionId)}`
      )
        .then((res) => res.json())
        .then((data) => {
          setMessages(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    // Initial fetch
    fetchMessages();

    // Auto-refresh every 2 seconds
    const interval = setInterval(fetchMessages, 2000);

    return () => clearInterval(interval);
  }, [projectName, sessionId]);

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/projects/${encodeURIComponent(projectName)}`}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            &larr; Back to {projectName}
          </Link>
          <h1 className="text-2xl font-bold mt-2">Session</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500 font-mono">{sessionId}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`claude --resume ${sessionId}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`px-2 py-0.5 rounded text-xs ${
                copied
                  ? "bg-green-600 text-green-100"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              {copied ? "Copied!" : "Copy resume command"}
            </button>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            listeningEnabled
              ? connected
                ? "bg-green-900 text-green-300"
                : "bg-yellow-900 text-yellow-300"
              : "bg-gray-800 text-gray-400"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              listeningEnabled
                ? connected
                  ? "bg-green-400"
                  : "bg-yellow-400 animate-pulse"
                : "bg-gray-500"
            }`}
          />
          {listeningEnabled ? (connected ? "Listening" : "Connecting...") : "Not listening"}
        </span>
      </div>

      {messages.length === 0 ? (
        <p className="text-gray-500">No messages found.</p>
      ) : (
        <div className="space-y-4">
          {[...messages].reverse().map((message) => {
            const content = message.message.content;
            const isToolResult = message.type === "user" && Array.isArray(content) && content.some((c) => c.type === "tool_result");

            return (
              <div
                key={message.uuid}
                className="rounded-lg border bg-gray-800 border-gray-700"
              >
                <div className="flex items-center gap-2 px-3 py-2 font-mono text-sm">
                  <span className="text-gray-500">{formatTimestamp(message.timestamp)}</span>
                  <span
                    className={`font-bold ${
                      message.type === "assistant"
                        ? "text-green-400"
                        : isToolResult
                        ? "text-purple-400"
                        : "text-blue-400"
                    }`}
                  >
                    {message.type === "assistant" ? "LLM" : isToolResult ? "Tool" : "Human"}
                  </span>
                  {message.message.stop_reason && (
                    <span className="text-gray-500 text-xs">
                      [{message.message.stop_reason}]
                    </span>
                  )}
                </div>
                <div className="px-3 py-2 border-t border-gray-700">
                  <div className="text-gray-200 break-words overflow-hidden">
                    <MessageContentView content={content} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
