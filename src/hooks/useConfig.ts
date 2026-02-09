import { useEffect, useState } from 'react'

interface GlobalConfig {
  counter_api?: {
    enabled?: boolean
    endpoint?: string
    api_key?: string
  }
  dashboard?: {
    port?: number
    autoRefresh?: boolean
    refreshInterval?: number
  }
  discovery?: {
    autoDiscover?: boolean
    searchPaths?: string[]
  }
}

export function useConfig() {
  const [config, setConfig] = useState<GlobalConfig>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/config/global')
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
      else {
        setError('Failed to load global config')
      }
    }
    catch (err) {
      console.error('Failed to load global config:', err)
      setError('Failed to load global config')
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  return {
    config,
    loading,
    error,
    loadConfig,
  }
}
