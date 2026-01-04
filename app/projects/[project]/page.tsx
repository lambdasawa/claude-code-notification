"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useNotificationContext } from "@/lib/notification-context";
import { formatTimestamp } from "@/components/message-components";

interface Session {
  id: string;
  projectName: string;
  filePath: string;
  updatedAt: string;
  lastMessage?: string;
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = use(params);
  const projectName = decodeURIComponent(project);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const { connected } = useNotificationContext();

  useEffect(() => {
    fetch(`/api/projects/${encodeURIComponent(projectName)}/sessions`)
      .then((res) => res.json())
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectName]);

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/projects"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            &larr; Back to Projects
          </Link>
          <h1 className="text-2xl font-bold mt-2 font-mono">{projectName}</h1>
        </div>
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            connected
              ? "bg-green-900 text-green-300"
              : "bg-red-900 text-red-300"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-400" : "bg-red-400"
            }`}
          />
          {connected ? "Listening" : "Disconnected"}
        </span>
      </div>

      {sessions.length === 0 ? (
        <p className="text-gray-500">No sessions found.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/projects/${encodeURIComponent(projectName)}/sessions/${encodeURIComponent(session.id)}`}
              className="block bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-sm">{session.id}</h2>
                <span className="text-sm text-gray-500">
                  {formatTimestamp(session.updatedAt)}
                </span>
              </div>
              {session.lastMessage && (
                <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                  {session.lastMessage}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
