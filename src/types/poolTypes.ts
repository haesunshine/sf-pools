export interface PoolSession {
  pool: string
  startTime: string // "09:00" format
  endTime: string   // "10:30" format
  day: number       // 0-6 (Monday to Sunday)
  sessionType?: string // "Family Swim", "Open Swim", etc.
}

export interface Pool {
  name: string
  color: string
  sessions: PoolSession[]
}

export interface ScheduleData {
  pools: Pool[]
  lastUpdated: Date
}