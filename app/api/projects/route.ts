import { getProjects } from "@/lib/claude-data";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const projects = await getProjects();
  return NextResponse.json(projects);
}
