import WeeklyCalendar from './components/WeeklyCalendar'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>San Francisco Pools Family Swim Schedule</h1>
        <p>Weekly view of family swim hours across San Francisco public pools</p>
        <div className="automation-info">
          <span className="automation-badge">🤖 Automated Updates</span>
          <span className="automation-desc">
            Schedules automatically updated quarterly via GitHub Actions
          </span>
        </div>
      </header>
      <main>
        <WeeklyCalendar />
      </main>
    </div>
  )
}

export default App