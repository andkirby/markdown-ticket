import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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

// Helper function to get project code from project data
const getProjectCode = (project: Project): string => {
  // Map known project IDs to their codes
  const codeMap: Record<string, string> = {
    'debug': 'DEB',
    'markdown-ticket': 'MDT', 
    'LlmTranslator': 'CR',
    'goto_dir': 'GT',
    'sentence-breakdown': 'SB'
  };
  
  return codeMap[project.id] || project.id.toUpperCase().slice(0, 3);
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
                  onClick={() => onProjectSelect(project)}
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
                    onClick={() => onProjectSelect(project)}
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
