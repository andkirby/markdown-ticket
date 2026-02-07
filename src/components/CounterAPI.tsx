import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  Hash,
  Loader2,
  Mail,
  Plus,
  Power,
  PowerOff,
  Server,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useCounterAPI } from '../hooks/useCounterAPI'
import { Badge } from './UI/badge'
import { Button } from './UI/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './UI/Card'
import { Input } from './UI/Input'

type ViewState = 'loading' | 'setup' | 'dashboard' | 'projects' | 'users' | 'settings'
type UserRole = 'admin' | 'client' | 'guest'

interface Ticket {
  ticketId: string
  nextNumber: number
}

interface Project {
  id: string
  name?: string
  enabled: boolean
  count?: number
}

interface Config {
  endpoint: string
  api_key: string
  api_key_set: boolean
  enabled: boolean
}

interface CreateProjectData {
  id: string
  name?: string
}

interface UpdateProjectData {
  enabled?: boolean
}

interface CounterConfigResponse {
  enabled: boolean
  api_key_set: boolean
}

// Setup Flow - First Time Configuration
const SetupFlow: React.FC<{
  onComplete: () => void
}> = ({ onComplete }) => {
  const [step, setStep] = useState<'endpoint' | 'admin' | 'client'>('endpoint')
  const [endpoint, setEndpoint] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [registrationToken, setRegistrationToken] = useState('')

  const handleEndpointSave = async () => {
    // Save endpoint configuration
    setStep('admin')
  }

  const handleAdminInvite = async () => {
    // Send admin invitation
    setStep('client')
  }

  const handleClientRegistration = async () => {
    // Complete client registration
    onComplete()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Counter API Setup
        </h1>
        <p className="text-muted-foreground text-xl leading-7 mt-2">
          Configure your ticket numbering system
        </p>
      </div>

      {step === 'endpoint' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>Step 1: Configure API Endpoint</span>
            </CardTitle>
            <CardDescription>
              Enter your AWS Lambda API Gateway URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="https://your-api-gateway.amazonaws.com/Prod"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
            />
            <Button onClick={handleEndpointSave} disabled={!endpoint.trim()}>
              Save & Test Connection
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Step 2: Admin Setup</span>
            </CardTitle>
            <CardDescription>
              Use your admin key to get client access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Admin key from Lambda deployment"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Input
              placeholder="Your company/organization name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <Button onClick={handleAdminInvite} disabled={!adminKey.trim() || !email.trim()}>
              Send Invitation
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'client' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Step 3: Complete Registration</span>
            </CardTitle>
            <CardDescription>
              Check your email and enter the registration token
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                Registration email sent to
                {' '}
                {email}
              </p>
            </div>
            <Input
              placeholder="Registration token from email"
              value={registrationToken}
              onChange={e => setRegistrationToken(e.target.value)}
            />
            <Button onClick={handleClientRegistration} disabled={!registrationToken.trim()}>
              Complete Setup
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Main Dashboard
const Dashboard: React.FC<{
  userRole: UserRole
  onNavigate: (view: ViewState) => void
  onGenerateTicket: (projectId: string) => Promise<Ticket>
  getProjects: () => Promise<Project[]>
}> = ({ userRole, onNavigate, onGenerateTicket, getProjects }) => {
  const [projectId, setProjectId] = useState('WEB')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Ticket | null>(null)
  const [projectCount, setProjectCount] = useState(0)

  const loadProjectCount = useCallback(async () => {
    try {
      // Check if counter API is configured first
      const configResponse = await fetch('/api/counter/config')
      const config = (await configResponse.json()) as CounterConfigResponse

      if (!config.enabled || !config.api_key_set) {
        console.warn('Counter API not configured, skipping project count load')
        return
      }

      const projects = await getProjects()
      setProjectCount(projects.length)
    }
    catch (error) {
      console.error('Failed to load project count:', error)
      // Don't retry automatically on API key errors
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('API key invalid')) {
        console.warn('Invalid API key - please configure a valid client API key')
      }
    }
  }, [getProjects])

  // Load project count on mount
  useEffect(() => {
    loadProjectCount()
  }, [loadProjectCount])

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const ticket = await onGenerateTicket(projectId.toUpperCase())
      setResult(ticket)
    }
    catch (error) {
      console.error('Failed:', error)
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-2xl font-bold">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Hash className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Role</p>
                <p className="text-2xl font-bold capitalize">{userRole}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Projects</p>
                <p className="text-2xl font-bold">{projectCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generate Ticket */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Ticket</CardTitle>
            <CardDescription>Create next ticket number for a project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Project ID (e.g., WEB)"
                value={projectId}
                onChange={e => setProjectId(e.target.value.toUpperCase())}
                className="uppercase"
              />
              <Button onClick={handleGenerate} disabled={loading || !projectId.trim()}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Generate
              </Button>
            </div>

            {result && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">
                      {result.ticketId}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Number:
                      {' '}
                      {result.nextNumber}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(result.ticketId)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Management</CardTitle>
            <CardDescription>Manage your counter API resources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onNavigate('projects')}
            >
              <Hash className="h-4 w-4 mr-2" />
              Manage Projects
            </Button>

            {(userRole === 'admin' || userRole === 'client') && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onNavigate('users')}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onNavigate('settings')}
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Project Management
const ProjectManagement: React.FC<{
  onBack: () => void
  userRole: UserRole
  getProjects: () => Promise<Project[]>
  createProject: (data: CreateProjectData) => Promise<Project>
  updateProject: (id: string, updates: UpdateProjectData) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}> = ({ onBack, userRole, getProjects, createProject, updateProject, deleteProject }) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [newProjectId, setNewProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)

  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true)
      const data = await getProjects()
      setProjects(data)
    }
    catch (error) {
      console.error('Failed to load projects:', error)
    }
    finally {
      setLoadingProjects(false)
    }
  }, [getProjects])

  // Load projects on mount
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreateProject = async () => {
    if (!newProjectId.trim())
      return
    setLoading(true)
    try {
      await createProject({ id: newProjectId.toUpperCase() })
      setNewProjectId('')
      await loadProjects() // Reload projects
    }
    catch (error) {
      console.error('Failed to create project:', error)
    }
    finally {
      setLoading(false)
    }
  }

  const handleToggleProject = async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId)
      await updateProject(projectId, { enabled: !project.enabled })
      await loadProjects() // Reload projects
    }
    catch (error) {
      console.error('Failed to toggle project:', error)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId)
      await loadProjects() // Reload projects
    }
    catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight">
          Project Management
        </h2>
      </div>

      {/* Create New Project */}
      {(userRole === 'admin' || userRole === 'client') && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>Add a new project for ticket generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Project ID (e.g., MOBILE)"
                value={newProjectId}
                onChange={e => setNewProjectId(e.target.value.toUpperCase())}
                className="uppercase"
              />
              <Button onClick={handleCreateProject} disabled={loading || !newProjectId.trim()}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Projects</CardTitle>
          <CardDescription>Manage existing projects and their settings</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingProjects
            ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )
            : (
                <div className="space-y-3">
                  {projects.map(project => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{project.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.count || 0}
                            {' '}
                            tickets generated
                          </p>
                        </div>
                        <Badge variant={project.enabled ? 'default' : 'secondary'}>
                          {project.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>

                      {(userRole === 'admin' || userRole === 'client') && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleProject(project.id)}
                          >
                            {project.enabled
                              ? (
                                  <PowerOff className="h-4 w-4" />
                                )
                              : (
                                  <Power className="h-4 w-4" />
                                )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No projects found. Create your first project above.
                    </p>
                  )}
                </div>
              )}
        </CardContent>
      </Card>
    </div>
  )
}

// User Management
const UserManagement: React.FC<{
  onBack: () => void
  inviteGuest: (email: string, projects: string[]) => Promise<void>
  getProjects: () => Promise<Project[]>
}> = ({ onBack, inviteGuest, getProjects }) => {
  const [guestEmail, setGuestEmail] = useState('')
  const [selectedProjects, setSelectedProjects] = useState(['WEB'])
  const [loading, setLoading] = useState(false)
  const [availableProjects, setAvailableProjects] = useState<string[]>([])

  const loadData = useCallback(async () => {
    try {
      const projectsData = await getProjects()
      setAvailableProjects(projectsData.map((p: Project) => p.id))
      // Note: Counter API doesn't provide user listing endpoint
      // Users are managed on the Lambda side
    }
    catch (error) {
      console.error('Failed to load data:', error)
      // Fallback data
      setAvailableProjects(['WEB', 'API', 'MOBILE', 'DOCS'])
    }
  }, [getProjects])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleInviteGuest = async () => {
    if (!guestEmail.trim())
      return
    setLoading(true)
    try {
      await inviteGuest(guestEmail.trim(), selectedProjects)
      setGuestEmail('')
      setSelectedProjects(['WEB'])
      await loadData() // Reload users
    }
    catch (error) {
      console.error('Invite failed:', error)
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight">
          User Management
        </h2>
      </div>

      {/* Invite Guest */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Guest User</CardTitle>
          <CardDescription>Give limited access to specific projects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="email"
            placeholder="guest@company.com"
            value={guestEmail}
            onChange={e => setGuestEmail(e.target.value)}
          />

          <div>
            <label className="text-sm font-medium block mb-2">Project Access:</label>
            <div className="flex flex-wrap gap-2">
              {availableProjects.map(project => (
                <label key={project} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProjects.includes(project)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProjects([...selectedProjects, project])
                      }
                      else {
                        setSelectedProjects(selectedProjects.filter(p => p !== project))
                      }
                    }}
                  />
                  <span className="text-sm">{project}</span>
                </label>
              ))}
            </div>
          </div>

          <Button onClick={handleInviteGuest} disabled={!guestEmail.trim() || loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send Invitation
          </Button>
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Management</CardTitle>
          <CardDescription>
            Invite guests to access specific projects. User management is handled on the Lambda API side.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Active users are managed through the Counter API Lambda service.
              <br />
              Use the invite form above to grant project access to new users.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Settings
const Settings: React.FC<{
  onBack: () => void
  config: Config
  onSave: (key: string) => void
  onReset: (email: string) => void
}> = ({ onBack, config, onSave, onReset }) => {
  const [showKey, setShowKey] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [resetEmail, setResetEmail] = useState('')

  const maskKey = (key: string) => key ? '•'.repeat(key.length - 4) + key.slice(-4) : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight">
          Settings
        </h2>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Current counter API settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Endpoint:</label>
            <code className="block text-sm bg-muted px-2 py-1 rounded mt-1">
              {config.endpoint}
            </code>
          </div>

          <div>
            <label className="text-sm font-medium">API Key:</label>
            <div className="flex items-center space-x-2 mt-1">
              <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                {showKey ? config.api_key : maskKey(config.api_key || '')}
              </code>
              <Button variant="ghost" size="sm" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update API Key */}
      <Card>
        <CardHeader>
          <CardTitle>Update API Key</CardTitle>
          <CardDescription>Replace your current API key</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="New API key"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
          />
          <Button onClick={() => onSave(newKey)} disabled={!newKey.trim()}>
            Update Key
          </Button>
        </CardContent>
      </Card>

      {/* Reset API Key */}
      <Card>
        <CardHeader>
          <CardTitle>Reset API Key</CardTitle>
          <CardDescription>Request a new API key via email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="email"
            placeholder="your@email.com"
            value={resetEmail}
            onChange={e => setResetEmail(e.target.value)}
          />
          <Button variant="outline" onClick={() => onReset(resetEmail)} disabled={!resetEmail.trim()}>
            Request Reset
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Component
export const CounterAPI: React.FC = () => {
  const {
    config,
    loading,
    saveApiKey,
    generateTicket,
    inviteGuest,
    resetApiKey,
    getProjects,
    createProject,
    updateProject,
    deleteProject,
  } = useCounterAPI()

  const [view, setView] = useState<ViewState>('loading')
  const [userRole] = useState<UserRole>('client') // This would come from API

  // Determine initial view
  useEffect(() => {
    if (loading)
      return

    const nextView = !config.api_key_set ? 'setup' : 'dashboard'
    // Use setTimeout to avoid setting state directly during render
    const timer = setTimeout(() => {
      setView(nextView)
    }, 0)

    return () => clearTimeout(timer)
  }, [config.api_key_set, loading])

  const handleSaveKey = async (key: string) => {
    const result = await saveApiKey(key)
    if (result.success) {
      setView('dashboard')
    }
  }

  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Ticket Counter API
        </h1>
      </div>

      {/* Views */}
      {view === 'setup' && (
        <SetupFlow
          onComplete={() => setView('dashboard')}
        />
      )}

      {view === 'dashboard' && (
        <Dashboard
          userRole={userRole}
          onNavigate={setView}
          onGenerateTicket={generateTicket}
          getProjects={getProjects}
        />
      )}

      {view === 'projects' && (
        <ProjectManagement
          onBack={() => setView('dashboard')}
          userRole={userRole}
          getProjects={getProjects}
          createProject={createProject}
          updateProject={updateProject}
          deleteProject={deleteProject}
        />
      )}

      {view === 'users' && (
        <UserManagement
          onBack={() => setView('dashboard')}
          inviteGuest={inviteGuest}
          getProjects={getProjects}
        />
      )}

      {view === 'settings' && (
        <Settings
          onBack={() => setView('dashboard')}
          config={config}
          onSave={handleSaveKey}
          onReset={resetApiKey}
        />
      )}
    </div>
  )
}
