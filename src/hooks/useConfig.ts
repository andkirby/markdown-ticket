import type { GlobalConfig } from '@mdt/domain-contracts'
import { useEffect, useState } from 'react'

export function useConfig() {
  const [config, setConfig] = useState<GlobalConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/config/global')
      if (response.ok) {
        const data: GlobalConfig = await response.json()
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
