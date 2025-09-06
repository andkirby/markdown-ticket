import React from 'react';

interface Project {
  id: string;
  project: {
    name: string;
    path: string;
    configFile: string;
    active: boolean;
    description: string;
  };
  metadata: {
    dateRegistered: string;
    lastAccessed: string;
    version: string;
  };
  tickets?: {
    codePattern?: string;
  };
  autoDiscovered?: boolean;
}

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project) => void;
  loading?: boolean;
}

export function ProjectSelector({ projects, selectedProject, onProjectSelect, loading = false }: ProjectSelectorProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex gap-2">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onProjectSelect(project)}
            disabled={loading}
            className={`h-12 px-3 py-1.5 border-2 rounded-md text-center transition-colors ${
              selectedProject?.id === project.id
                ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700 shadow-md'
                : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="text-sm font-medium">{project.id}</div>
            <div className="text-xs text-muted-foreground truncate max-w-20">{project.project.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
