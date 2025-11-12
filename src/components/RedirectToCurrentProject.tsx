import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Plus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './UI/tooltip';
import { getCurrentProject } from '../utils/routing';
import { useProjectManager } from '../hooks/useProjectManager';
import { getProjectCode } from './ProjectSelector';
import { AddProjectModal } from './AddProjectModal';
import { useTheme } from '../hooks/useTheme';

export function RedirectToCurrentProject() {
  const navigate = useNavigate();
  const { projects, loading, refreshProjects } = useProjectManager({ autoSelectFirst: false });
  const { theme, toggleTheme } = useTheme();
  const [configInfo, setConfigInfo] = useState<any>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);

  // Fetch configuration info when no projects are found
  useEffect(() => {
    if (!loading && projects.length === 0) {
      fetch('/api/config')
        .then(res => res.json())
        .then(setConfigInfo)
        .catch(err => console.error('Failed to fetch config info:', err));
    }
  }, [loading, projects.length]);

  useEffect(() => {
    if (loading) return;

    const currentProject = getCurrentProject();

    if (currentProject && projects.some(p => getProjectCode(p) === currentProject)) {
      navigate(`/prj/${currentProject}`, { replace: true });
    } else if (projects.length > 0) {
      // No current project or invalid project, redirect to first available
      const firstProjectCode = getProjectCode(projects[0]);
      navigate(`/prj/${firstProjectCode}`, { replace: true });
    } else {
      // No projects available, stay on root and show empty state
      // This will be handled by the main app
    }
  }, [navigate, projects, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background">
        {/* Simple Header - No project-specific elements */}
        <nav className="bg-card border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <div className="flex-shrink-0">
                  <img src="/logo.jpeg" alt="Logo" className="w-auto dark:invert" style={{ height: '3.8rem' }} />
                </div>
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold">Markdown Ticket Board</h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleTheme}
                  className="btn btn-ghost p-2 h-10 w-10"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* No Projects Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center max-w-2xl mx-auto p-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-2xl font-semibold">No Projects Found</h2>
              <button
                onClick={() => setShowAddProjectModal(true)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Project
              </button>
            </div>

            {configInfo && (
              <div className="bg-muted/50 rounded-lg p-6 text-left">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Configuration Information</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="btn btn-ghost p-2 h-8 w-8"
                        aria-label="What this means"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="text-sm text-muted-foreground">
                          What this means: The system is looking for projects with .mdt-config.toml files in {configInfo.discovery?.searchPaths?.join(', ') || 'your configured directories'} with auto-discovery {configInfo.discovery?.autoDiscover ? 'enabled' : 'disabled'}.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-sm">CONFIG_DIR:</span>
                    <code className="ml-2 px-2 py-1 bg-background rounded text-xs">{configInfo.configDir}</code>
                  </div>

                  <div>
                    <span className="font-medium text-sm">Discovery Status:</span>
                    <ul className="ml-4 mt-1 space-y-1 text-sm">
                      <li className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${configInfo.discovery?.autoDiscover ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        Auto Discover: <code className="ml-2 px-1 py-0.5 bg-background rounded text-xs">{configInfo.discovery?.autoDiscover ? 'enabled' : 'disabled'}</code>
                      </li>
                      <li className="text-muted-foreground">
                        Search Paths:
                        {configInfo.discovery?.searchPaths?.length > 0 ? (
                          <code className="ml-2 px-1 py-0.5 bg-background rounded text-xs">
                            {configInfo.discovery.searchPaths.join(', ')}
                          </code>
                        ) : (
                          <span className="ml-2 text-xs">No search paths configured</span>
                        )}
                      </li>
                      <li className="text-muted-foreground">
                        Max Depth: <code className="ml-2 px-1 py-0.5 bg-background rounded text-xs">{configInfo.discovery?.maxDepth || 3}</code>
                      </li>
                    </ul>
                  </div>
                </div>

                {configInfo?.discovery?.autoDiscover && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-3">Tip: You may change auto discovery paths:</p>
                    <pre className="my-2 p-2 bg-background rounded text-xs overflow-x-auto">
                      <code className="language-bash">
                        npm run config:set discovery.searchPaths $HOME/home,$HOME/projects
                      </code>
                    </pre>

                    <p className="text-sm font-medium mb-2 mt-4">If you are using docker, create a <code className="px-1 py-0.5 bg-background rounded text-xs">docker-compose.projects.yml</code> file:</p>
                    <pre className="my-2 p-2 bg-background rounded text-xs overflow-x-auto">
                      <code className="language-yaml">
{`x-shared-volumes: &project-volumes
    volumes:
      - $HOME/home/cool-project:/projects/cool-project
      - $HOME/myproject:/projects/myproject

services:
  backend:
    <<: *project-volumes
  mcp:
    <<: *project-volumes`}
                      </code>
                    </pre>

                    <p className="text-sm font-medium mb-2 mt-4">and recreate containers:</p>
                    <pre className="p-2 bg-background rounded text-xs overflow-x-auto">
                      <code className="language-bash">
                        bin/dc -f docker-compose.projects.yml up -d --force-recreate
                      </code>
                    </pre>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Add Project Modal */}
        <AddProjectModal
          isOpen={showAddProjectModal}
          onClose={() => setShowAddProjectModal(false)}
          onProjectCreated={async () => {
            setShowAddProjectModal(false);
            // Refresh projects to get the newly created project
            await refreshProjects();
            // Redirect to the new project
            if (projects.length > 0) {
              const firstProjectCode = getProjectCode(projects[0]);
              navigate(`/prj/${firstProjectCode}`, { replace: true });
            }
          }}
        />
      </TooltipProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
