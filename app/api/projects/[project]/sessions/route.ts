import { getSessions } from "@/lib/claude-data";
import { NextResponse } from "next/server";

function isValidPathSegment(segment: string): boolean {
  return !segment.includes("..") && !segment.includes("/") && !segment.includes("\\");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ project: string }> }
): Promise<NextResponse> {
  const { project } = await params;
  const projectName = decodeURIComponent(project);

  if (!isValidPathSegment(projectName)) {
    return NextResponse.json({ error: "Invalid project name" }, { status: 400 });
  }

  const sessions = await getSessions(projectName);
  return NextResponse.json(sessions);
}
