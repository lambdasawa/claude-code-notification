"use client";

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { MessageContent } from "@/lib/claude-data";

export type { MessageContent };

interface ToolInput {
  command?: string;
  file_path?: string;
  pattern?: string;
  query?: string;
  [key: string]: unknown;
}

export const markdownComponents = {
  code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode; node?: unknown }) => {
    const match = /language-(\w+)/.exec(className || "");
    const codeString = String(children).replace(/\n$/, "");

    if (match) {
      return (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
        >
          {codeString}
        </SyntaxHighlighter>
      );
    }

    return (
      <code className="bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
        {children}
      </code>
    );
  },
};

export function MessageContentView({ content }: { content: MessageContent[] | string | undefined }) {
  if (!content) {
    return null;
  }

  // Handle string content (common for user messages)
  if (typeof content === "string") {
    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </div>
    );
  }

  if (!Array.isArray(content)) {
    return null;
  }

  return (
    <>
      {content.map((item, index) => {
        if (item.type === "text" && item.text) {
          return (
            <div key={index} className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown components={markdownComponents}>{item.text}</ReactMarkdown>
            </div>
          );
        }
        if (item.type === "thinking" && item.thinking) {
          const thinkingText = item.thinking.replace(/\\n/g, "\n");
          return (
            <div key={index} className="my-2">
              <div className="text-gray-500 text-sm mb-1">Thinking</div>
              <div className="prose prose-invert prose-sm max-w-none text-gray-400">
                <ReactMarkdown components={markdownComponents}>{thinkingText}</ReactMarkdown>
              </div>
            </div>
          );
        }
        if (item.type === "tool_use" && item.name) {
          const input = item.input as ToolInput | undefined;
          let detail = "";
          if (input) {
            if (item.name === "Bash" && input.command) {
              detail = input.command;
            } else if (item.name === "Read" && input.file_path) {
              detail = input.file_path;
            } else if (item.name === "Write" && input.file_path) {
              detail = input.file_path;
            } else if (item.name === "Edit" && input.file_path) {
              detail = input.file_path;
            } else if (item.name === "Glob" && input.pattern) {
              detail = input.pattern;
            } else if (item.name === "Grep" && input.pattern) {
              detail = input.pattern;
            } else if (item.name === "WebSearch" && input.query) {
              detail = input.query;
            }
          }
          return (
            <div key={index} className="my-2">
              <div className="text-gray-500 text-sm mb-1">Tool: {item.name}</div>
              {detail && (
                <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">
                  {detail}
                </pre>
              )}
            </div>
          );
        }
        if (item.type === "tool_result") {
          return (
            <div key={index} className="my-2">
              <div className="text-gray-500 text-sm mb-1">Tool Result</div>
              {item.content && (
                <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">
                  {typeof item.content === "string"
                    ? item.content
                    : JSON.stringify(item.content, null, 2)}
                </pre>
              )}
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

export function formatTimestamp(timestamp: string | Date): string {
  const d = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`;
}

export function formatTime(timestamp: string | Date): string {
  const d = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mi}:${ss}`;
}
