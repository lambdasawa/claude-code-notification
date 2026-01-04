import { promises as fs } from "fs";
import path from "path";
import os from "os";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");

export interface Project {
  name: string;
  path: string;
  displayName: string;
}

export interface Session {
  id: string;
  projectName: string;
  filePath: string;
  updatedAt: Date;
  lastMessage?: string;
}

export interface MessageContent {
  type: string;
  text?: string;
  thinking?: string;
  tool_use_id?: string;
  name?: string;
  input?: unknown;
  content?: string;
}

export interface Message {
  uuid: string;
  type: "user" | "assistant";
  timestamp: string;
  sessionId: string;
  message: {
    role: "user" | "assistant";
    content: MessageContent[] | string;
    stop_reason?: string | null;
    model?: string;
  };
  toolUseResult?: {
    stdout?: string;
    stderr?: string;
  };
}

export async function getProjects(): Promise<Project[]> {
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects: Project[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("-")) {
        projects.push({
          name: entry.name,
          path: path.join(PROJECTS_DIR, entry.name),
          displayName: entry.name,
        });
      }
    }

    return projects.sort((a, b) => b.displayName.localeCompare(a.displayName));
  } catch {
    return [];
  }
}

async function getLastMessage(filePath: string): Promise<string | undefined> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.trim().split("\n");
    // Find last assistant message with text content
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const msg = JSON.parse(lines[i]) as Message;
        if (msg.type === "assistant" && msg.message?.content) {
          const msgContent = msg.message.content;
          if (typeof msgContent === "string") {
            return msgContent.slice(0, 200);
          }
          if (Array.isArray(msgContent)) {
            for (const item of msgContent) {
              if (item.type === "text" && item.text) {
                return item.text.slice(0, 200);
              }
            }
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

export async function getSessions(projectName: string): Promise<Session[]> {
  const projectPath = path.join(PROJECTS_DIR, projectName);

  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });
    const sessions: Session[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        const sessionId = entry.name.replace(".jsonl", "");
        const filePath = path.join(projectPath, entry.name);
        const stat = await fs.stat(filePath);
        const lastMessage = await getLastMessage(filePath);

        sessions.push({
          id: sessionId,
          projectName,
          filePath,
          updatedAt: stat.mtime,
          lastMessage,
        });
      }
    }

    return sessions.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  } catch {
    return [];
  }
}

export async function getSessionMessages(
  projectName: string,
  sessionId: string
): Promise<Message[]> {
  const filePath = path.join(PROJECTS_DIR, projectName, `${sessionId}.jsonl`);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.trim().split("\n");
    const messages: Message[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as Message;
        if (parsed.type === "user" || parsed.type === "assistant") {
          messages.push(parsed);
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    return messages;
  } catch {
    return [];
  }
}

export function getClaudeProjectsDir(): string {
  return PROJECTS_DIR;
}
