import { useState, useEffect } from 'react'
import { DashboardInsights } from '@/types/dashboard-insights'

export function useDashboardInsights() {
  const [data, setData] = useState<DashboardInsights | null>(null)
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

      const insightsData = await response.json()
      setData(insightsData)
      setLastUpdated(new Date().toLocaleString())
    } catch (err) {
      console.error('Error loading dashboard insights:', err)
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
    refreshData,
  }
}
