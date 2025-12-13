import path from 'path';
import { Plus } from 'lucide-react';
import { Badge } from './UI/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './UI/tooltip';
import { Project } from '@mdt/shared/models/Project';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project) => void;
  onNewProject?: () => void;
  loading?: boolean;
}

// Helper function to get project code from project data
export const getProjectCode = (project: Project): string => {
  // Safety check for undefined/null project
  if (!project || !project.project) {
    console.error('getProjectCode called with invalid project object:', project);
    return 'UNKNOWN';
  }

  // Use the project.code from config if available
  if (project.project.code) {
    return project.project.code;
  }

  // This should not happen with the new validation, but keep as safety fallback
  return project.id; // Return ID as-is, don't modify
};

export function ProjectSelector({ projects, selectedProject, onProjectSelect, onNewProject, loading = false }: ProjectSelectorProps) {
  if (projects.length === 0) {
    return null;
  }

  const handleNewProject = () => {
    console.log('ProjectSelector: New project button clicked');
    if (onNewProject) {
      onNewProject();
    } else {
      // Default behavior: prompt user for project path
      const projectPath = prompt('Enter the path to a new project directory:');
      if (projectPath && projectPath.trim()) {
        console.log('ProjectSelector: User wants to create project at:', projectPath.trim());
        // TODO: Implement project creation logic
        alert('Project creation not yet implemented. This would create a project at: ' + projectPath.trim());
      }
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2">
        <div className="flex gap-2">
          {projects.map((project) => {
            const isActive = selectedProject?.id === project.id;

            if (isActive) {
              // Active project - expanded view
              return (
                <button
                  key={project.id}
                  onClick={() => {
                    console.log('ProjectSelector: Selecting project:', { id: project.id, name: project.project.name });
                    onProjectSelect(project);
                  }}
                  disabled={loading}
                  className={`h-12 px-4 py-1.5 border-2 rounded-md text-center transition-colors bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700 shadow-md min-w-[200px] max-w-[300px] flex-1 ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2 h-full">
                    <div className="text-sm font-medium flex-shrink-0">{getProjectCode(project)}</div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-xs text-muted-foreground break-words leading-tight">{project.project.name}</div>
                    </div>
                  </div>
                </button>
              );
            }

            // Inactive project - compact view with tooltip
            return (
              <Tooltip key={project.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      console.log('ProjectSelector: Selecting project:', { id: project.id, name: project.project.name });
                      onProjectSelect(project);
                    }}
                    disabled={loading}
                    className={`h-12 px-2 py-1.5 border-2 border-transparent rounded-md text-center transition-colors hover:bg-accent hover:text-accent-foreground hover:border-blue-300 dark:hover:border-blue-700 ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <span className="text-sm font-medium text-muted-foreground">
                      {getProjectCode(project)}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <div className="font-medium">{project.project.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{project.project.description}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* New Project Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleNewProject}
                disabled={loading}
                className={`h-12 w-12 px-2 py-1.5 border-2 border-dashed rounded-md text-center transition-colors hover:bg-accent hover:text-accent-foreground hover:border-green-300 dark:hover:border-green-700 border-gray-300 dark:border-gray-600 ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                title="New Project"
              >
                <Plus className="h-5 w-5 mx-auto text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm font-medium">New Project</div>
              <div className="text-xs text-muted-foreground">Create a new project or add existing one</div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
