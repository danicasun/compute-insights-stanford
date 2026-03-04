import { useState, useEffect } from 'react'
import { SlurmData } from '@/types/slurm'

export function useSlurmData() {
  const [data, setData] = useState<SlurmData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/slurm-data')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const slurmData = await response.json()
      
      // Return the raw SLURM data directly since it already matches our interface
      setData(slurmData)
      setLastUpdated(new Date().toLocaleString())
    } catch (err) {
      console.error('Error loading SLURM data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    await loadData()
  }

  useEffect(() => {
    loadData()
  }, [])

  return {
    data,
    loading,
    error,
    lastUpdated,
    refreshData
  }
}
