import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentProject } from '../utils/routing';
import { useProjectManager } from '../hooks/useProjectManager';
import { getProjectCode } from './ProjectSelector';

export function RedirectToCurrentProject() {
  const navigate = useNavigate();
  const { projects, loading } = useProjectManager({ autoSelectFirst: false });

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Projects Found</h2>
          <p className="text-muted-foreground">Create your first project to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
