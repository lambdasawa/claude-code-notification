"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Project {
  name: string;
  path: string;
  displayName: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Projects</h1>
      {projects.length === 0 ? (
        <p className="text-gray-500">No projects found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((project) => (
            <Link
              key={project.name}
              href={`/projects/${encodeURIComponent(project.name)}`}
              className="block bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <h2 className="font-medium text-lg truncate font-mono">
                {project.name}
              </h2>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
