import WeeklyCalendar from './components/WeeklyCalendar'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>San Francisco Pools Family Swim Schedule</h1>
      </header>
      <main>
        <WeeklyCalendar />
      </main>
    </div>
  )
}

export default App