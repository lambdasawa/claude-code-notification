"use client";

import { NotificationProvider } from "@/lib/notification-context";
import { NotificationSettings } from "./notification-settings";
import Link from "next/link";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <nav className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold hover:text-blue-400">
                Claude Code Notification
              </Link>
              <Link href="/projects" className="text-gray-300 hover:text-white">
                Projects
              </Link>
            </div>
            <NotificationSettings />
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </NotificationProvider>
  );
}
