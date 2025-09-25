import { useMemo, useState, useEffect } from 'react'
import type { PoolSession } from '../types/poolTypes'
import { DataLoader } from '../services/dataLoader'
import './WeeklyCalendar.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Pool colors for different facilities
const POOL_COLORS = {
  'Balboa': '#FF6B6B',
  'Coffman': '#A8E6CF',
  'Garfield': '#96CEB4',
  'Hamilton': '#45B7D1',
  'Mission': '#FECA57',
  'MLK': '#FFB347',
  'North Beach': '#9B59B6',
  'Rossi': '#4ECDC4',
  'Sava': '#FF9FF3'
} as const

type Pool = keyof typeof POOL_COLORS

const WeeklyCalendar: React.FC = () => {
  const [loadedSessions, setLoadedSessions] = useState<PoolSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [metadata, setMetadata] = useState<{
    lastUpdated: string
    totalPools: number
    totalSessions: number
  } | null>(null)

  // Load static schedule data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [sessions, meta] = await Promise.all([
          DataLoader.getAllSessions(),
          DataLoader.getMetadata()
        ])

        setLoadedSessions(sessions)
        setMetadata(meta)
      } catch (error) {
        console.error('Failed to load schedule data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])
  // Generate time slots every 30 minutes from 6:00 AM to 10:00 PM
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }, [])

  // Sample data to demonstrate the calendar layout with overlapping sessions
  const sampleSessions: PoolSession[] = [
    // Monday - overlap example
    { pool: 'Balboa', startTime: '09:00', endTime: '11:00', day: 0 },
    { pool: 'Rossi', startTime: '10:00', endTime: '12:00', day: 0 }, // Overlaps with Balboa
    { pool: 'Hamilton', startTime: '14:00', endTime: '16:30', day: 0 },

    // Tuesday
    { pool: 'Rossi', startTime: '10:30', endTime: '12:00', day: 1 },
    { pool: 'Mission', startTime: '15:00', endTime: '17:00', day: 1 },
    { pool: 'Garfield', startTime: '16:00', endTime: '18:00', day: 1 }, // Overlaps with Mission

    // Wednesday - triple overlap
    { pool: 'Garfield', startTime: '08:00', endTime: '10:00', day: 2 },
    { pool: 'Balboa', startTime: '13:30', endTime: '15:30', day: 2 },
    { pool: 'King', startTime: '14:00', endTime: '16:00', day: 2 }, // Overlaps with Balboa
    { pool: 'Sava', startTime: '14:30', endTime: '16:30', day: 2 }, // Triple overlap

    // Thursday
    { pool: 'Sava', startTime: '11:00', endTime: '13:00', day: 3 },
    { pool: 'Coffman', startTime: '16:00', endTime: '18:00', day: 3 },

    // Friday
    { pool: 'King', startTime: '09:30', endTime: '11:30', day: 4 },
    { pool: 'Rossi', startTime: '14:30', endTime: '16:00', day: 4 },

    // Saturday - multiple overlaps
    { pool: 'Balboa', startTime: '10:00', endTime: '12:30', day: 5 },
    { pool: 'Hamilton', startTime: '11:00', endTime: '13:00', day: 5 }, // Overlaps with Balboa
    { pool: 'Rossi', startTime: '12:30', endTime: '13:30', day: 5 }, // Overlaps with Hamilton
    { pool: 'Mission', startTime: '15:30', endTime: '17:30', day: 5 },
    { pool: 'Coffman', startTime: '16:00', endTime: '18:00', day: 5 }, // Overlaps with Mission

    // Sunday
    { pool: 'Garfield', startTime: '11:00', endTime: '14:00', day: 6 },
    { pool: 'Sava', startTime: '14:30', endTime: '16:30', day: 6 },
  ]

  // Use loaded sessions from static data
  const allPoolSessions = useMemo(() => {
    return loadedSessions.map(session => ({
      ...session,
      pool: session.pool as Pool // Ensure pool name matches our color scheme
    }))
  }, [loadedSessions])

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const getSessionsForDayAndTime = (day: number, time: string) => {
    return allPoolSessions.filter(session => {
      if (session.day !== day) return false

      const sessionStart = session.startTime
      const sessionEnd = session.endTime

      return time >= sessionStart && time < sessionEnd
    })
  }

  if (isLoading) {
    return (
      <div className="weekly-calendar">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading pool schedules...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="weekly-calendar">

      {/* Pool Legend */}
      <div className="pool-legend">
        <div className="legend-items">
          {Object.entries(POOL_COLORS).map(([pool, color]) => (
            <div key={pool} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: color }}></div>
              <span>{pool}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Time column header */}
        <div className="time-header">Time</div>

        {/* Day headers */}
        {DAYS.map((day) => (
          <div key={day} className="day-header">
            {day}
          </div>
        ))}

        {/* Time slots and calendar cells */}
        {timeSlots.map((time) => (
          <div key={time} className="time-row">
            {/* Time label */}
            <div className="time-label">
              {formatTime(time)}
            </div>

            {/* Day cells */}
            {DAYS.map((_, dayIndex) => {
              const sessions = getSessionsForDayAndTime(dayIndex, time)
              return (
                <div key={`${dayIndex}-${time}`} className="calendar-cell">
                  {sessions.length === 1 ? (
                    // Single session - full cell
                    <div
                      className="pool-session"
                      style={{ backgroundColor: POOL_COLORS[sessions[0].pool as Pool] || '#cccccc' }}
                    >
                      {sessions[0].pool}
                    </div>
                  ) : sessions.length > 1 ? (
                    // Multiple sessions - split the cell
                    <div className="session-container">
                      {sessions.map((session, sessionIndex) => (
                        <div
                          key={sessionIndex}
                          className="pool-session overlapping"
                          style={{
                            backgroundColor: POOL_COLORS[session.pool as Pool] || '#cccccc',
                            width: `${100 / sessions.length}%`,
                            left: `${(sessionIndex * 100) / sessions.length}%`
                          }}
                          title={`${session.pool}: ${formatTime(session.startTime)} - ${formatTime(session.endTime)}`}
                        >
                          {sessions.length <= 3 ? session.pool : session.pool.substring(0, 3)}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default WeeklyCalendar