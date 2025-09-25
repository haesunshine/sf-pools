import type { PoolSession } from '../types/poolTypes'

export interface ScheduleData {
  lastUpdated: string
  totalPools: number
  totalSessions: number
  pools: Array<{
    poolName: string
    sessions: PoolSession[]
    lastUpdated: string
    source: string
    error?: string
  }>
}

export class DataLoader {
  private static cache: ScheduleData | null = null
  private static lastFetch: number = 0
  private static readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Load schedule data from static JSON file
   */
  static async loadScheduleData(): Promise<ScheduleData> {
    // Return cached data if still fresh
    if (this.cache && (Date.now() - this.lastFetch) < this.CACHE_DURATION) {
      return this.cache
    }

    try {
      const response = await fetch('/data/all-schedules.json')

      if (!response.ok) {
        throw new Error(`Failed to load schedule data: ${response.status}`)
      }

      const data: ScheduleData = await response.json()

      // Cache the data
      this.cache = data
      this.lastFetch = Date.now()

      console.log(`📊 Loaded ${data.totalPools} pools with ${data.totalSessions} total sessions`)
      console.log(`📅 Last updated: ${new Date(data.lastUpdated).toLocaleDateString()}`)

      return data

    } catch (error) {
      console.error('❌ Error loading schedule data:', error)

      // Return empty data structure if loading fails
      return {
        lastUpdated: new Date().toISOString(),
        totalPools: 0,
        totalSessions: 0,
        pools: []
      }
    }
  }

  /**
   * Get all sessions flattened from all pools
   */
  static async getAllSessions(): Promise<PoolSession[]> {
    const data = await this.loadScheduleData()

    return data.pools.flatMap(pool => pool.sessions)
  }

  /**
   * Get sessions for a specific pool
   */
  static async getPoolSessions(poolName: string): Promise<PoolSession[]> {
    const data = await this.loadScheduleData()

    const pool = data.pools.find(p =>
      p.poolName.toLowerCase().includes(poolName.toLowerCase())
    )

    return pool?.sessions || []
  }

  /**
   * Get metadata about when data was last updated
   */
  static async getMetadata(): Promise<{
    lastUpdated: string
    totalPools: number
    totalSessions: number
    poolNames: string[]
  }> {
    const data = await this.loadScheduleData()

    return {
      lastUpdated: data.lastUpdated,
      totalPools: data.totalPools,
      totalSessions: data.totalSessions,
      poolNames: data.pools.map(p => p.poolName)
    }
  }

  /**
   * Clear cache to force refresh on next load
   */
  static clearCache(): void {
    this.cache = null
    this.lastFetch = 0
  }
}