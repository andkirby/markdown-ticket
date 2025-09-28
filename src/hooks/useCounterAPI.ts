import { useState, useEffect } from 'react';

interface CounterAPIConfig {
  enabled: boolean;
  endpoint: string;
  api_key?: string;
  api_key_set?: boolean;
}

interface GenerateTicketResponse {
  ticketId: string;
  nextNumber: number;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'testing';

export const useCounterAPI = () => {
  const [config, setConfig] = useState<CounterAPIConfig>({
    enabled: false,
    endpoint: '',
    api_key: undefined,
    api_key_set: false
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/counter/config');
      if (response.ok) {
        const data = await response.json();
        const mappedConfig = {
          enabled: data.enabled,
          endpoint: data.endpoint,
          api_key: data.api_key_set ? data.api_key_preview : undefined,
          api_key_set: data.api_key_set
        };
        setConfig(mappedConfig);
        if (data.api_key_set) {
          await testConnection();
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const saveApiKey = async (apiKey: string, endpoint?: string) => {
    setLoading(true);
    try {
      const newConfig = {
        enabled: true,
        endpoint: endpoint || config.endpoint || 'https://api.yourapp.com',
        api_key: apiKey
      };

      const response = await fetch('/api/counter/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      if (response.ok) {
        setConfig(newConfig);
        await testConnection();
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      return { success: false, error: 'Failed to save API key' };
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!config.api_key || !config.endpoint) return;

    setConnectionStatus('testing');
    try {
      const response = await fetch('/api/counter/test-connection', {
        method: 'POST'
      });

      const result = await response.json();
      setConnectionStatus(result.success ? 'connected' : 'disconnected');
      return result.success;
    } catch (error) {
      setConnectionStatus('disconnected');
      return false;
    }
  };

  const generateTicket = async (projectId: string): Promise<GenerateTicketResponse> => {
    if (!config.api_key || !config.endpoint) {
      throw new Error('No API key configured');
    }

    const response = await fetch('/api/counter/generate-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ projectId: projectId.toUpperCase() })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to generate ticket: ${error}`);
    }

    return response.json();
  };

  const inviteGuest = async (email: string, projects: string[]) => {
    const response = await fetch('/api/counter/invite-guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guestEmail: email,
        projectAccess: projects
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to invite guest: ${error}`);
    }

    return response.json();
  };

  const resetApiKey = async (email: string) => {
    const response = await fetch('/api/counter/request-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to request reset: ${error}`);
    }

    return response.json();
  };

  const completeReset = async (resetToken: string, email: string) => {
    const response = await fetch('/api/counter/complete-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: resetToken })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to complete reset: ${error}`);
    }

    const result = await response.json();

    // Automatically save the new API key
    if (result.apiKey) {
      await saveApiKey(result.apiKey);
    }

    return result;
  };

  const inviteAdmin = async (adminKey: string, email: string, name: string) => {
    const response = await fetch('/api/counter/invite-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        adminKey, 
        clientEmail: email, 
        clientName: name 
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to invite admin: ${error}`);
    }

    return response.json();
  };

  const registerClient = async (token: string) => {
    const response = await fetch('/api/counter/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to register: ${error}`);
    }

    const result = await response.json();

    // Save the API key from registration
    if (result.apiKey) {
      await saveApiKey(result.apiKey);
    }

    return result;
  };

  const getProjects = async () => {
    const response = await fetch('/api/counter/projects');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // If API key is invalid, don't retry automatically
      if (response.status === 401 && errorData.code === 'INVALID_API_KEY') {
        throw new Error(`API key invalid - please configure a valid client API key`);
      }
      
      throw new Error(`Failed to get projects: ${JSON.stringify(errorData)}`);
    }
    return response.json();
  };

  const createProject = async (projectData: { id: string; name?: string }) => {
    const response = await fetch('/api/counter/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: projectData.id,
        initialCount: 0
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create project: ${error}`);
    }
    return response.json();
  };

  const updateProject = async (projectId: string, updates: { enabled?: boolean }) => {
    const response = await fetch(`/api/counter/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update project: ${error}`);
    }
    return response.json();
  };

  const deleteProject = async (projectId: string) => {
    const response = await fetch(`/api/counter/projects/${projectId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete project: ${error}`);
    }
    return response.json();
  };

  return {
    config,
    connectionStatus,
    loading,
    loadConfig,
    saveApiKey,
    testConnection,
    generateTicket,
    inviteGuest,
    resetApiKey,
    completeReset,
    inviteAdmin,
    registerClient,
    getProjects,
    createProject,
    updateProject,
    deleteProject
  };
};
