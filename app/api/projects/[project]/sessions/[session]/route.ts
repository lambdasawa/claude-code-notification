import { getSessionMessages } from "@/lib/claude-data";
import { NextResponse } from "next/server";

function isValidPathSegment(segment: string): boolean {
  return !segment.includes("..") && !segment.includes("/") && !segment.includes("\\");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ project: string; session: string }> }
): Promise<NextResponse> {
  const { project, session } = await params;
  const projectName = decodeURIComponent(project);
  const sessionId = decodeURIComponent(session);

  if (!isValidPathSegment(projectName) || !isValidPathSegment(sessionId)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const messages = await getSessionMessages(projectName, sessionId);
  return NextResponse.json(messages);
}
