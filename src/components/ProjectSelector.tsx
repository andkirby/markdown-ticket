import { Badge } from './UI/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './UI/tooltip';
import { Project } from '../../shared/models/Project';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project) => void;
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
  
  console.warn(`Project ${project.id} missing code in .mdt-config.toml`);
  return project.id; // Return ID as-is, don't modify
};

export function ProjectSelector({ projects, selectedProject, onProjectSelect, loading = false }: ProjectSelectorProps) {
  if (projects.length === 0) {
    return null;
  }

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
                    onProjectSelect(project);
                  }}
                  disabled={loading}
                  className={`h-12 px-3 py-1.5 border-2 rounded-md text-center transition-colors bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700 shadow-md w-[40%] ${
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
        </div>
      </div>
    </TooltipProvider>
  );
}
