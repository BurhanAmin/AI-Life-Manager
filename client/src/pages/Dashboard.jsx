import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import api from '../lib/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [goals, setGoals] = useState([])
  const [habits, setHabits] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, goalsRes, habitsRes, eventsRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/goals'),
          api.get('/habits'),
          api.get('/calendar?from=' + new Date().toISOString().split('T')[0])
        ])
        setUser(userRes.data)
        setGoals(goalsRes.data)
        setHabits(habitsRes.data)
        setEvents(eventsRes.data)
      } catch (err) {
        console.error(err)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const startSession = async (type) => {
    const res = await api.post('/sessions/start', { type })
    navigate('/chat', { state: { session_id: res.data.id, type } })
  }

  if (loading) return <div style={styles.loading}>Loading...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.greeting}>Hey, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p style={styles.subGreeting}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>Log out</button>
      </div>

      {/* Session Buttons */}
      <div style={styles.sessionRow}>
        <button style={{ ...styles.sessionBtn, background: '#1e3a2f' }} onClick={() => startSession('morning')}>
          <span style={styles.sessionIcon}>🌅</span>
          <span style={styles.sessionLabel}>Morning Check-in</span>
        </button>
        <button style={{ ...styles.sessionBtn, background: '#1e1b3a' }} onClick={() => startSession('chat')}>
          <span style={styles.sessionIcon}>💬</span>
          <span style={styles.sessionLabel}>Chat with Advisor</span>
        </button>
        <button style={{ ...styles.sessionBtn, background: '#3a1e1e' }} onClick={() => startSession('evening')}>
          <span style={styles.sessionIcon}>🌙</span>
          <span style={styles.sessionLabel}>Evening Debrief</span>
        </button>
      </div>

      <div style={styles.grid}>
        {/* Goals */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Your Goals</h3>
          {goals.length === 0 ? <p style={styles.empty}>No goals yet</p> : goals.map(g => (
            <div key={g.id} style={styles.goalItem}>
              <span style={styles.goalArea}>{g.area}</span>
              <span style={styles.goalDesc}>{g.description}</span>
            </div>
          ))}
        </div>

        {/* Habits */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Habits Being Tracked</h3>
          {habits.length === 0 ? <p style={styles.empty}>No habits yet</p> : habits.map(h => (
            <div key={h.id} style={styles.habitItem}>
              <span style={styles.habitDot}>●</span>
              <span style={styles.habitName}>{h.name}</span>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Upcoming Events</h3>
          {events.length === 0 ? <p style={styles.empty}>Nothing scheduled</p> : events.slice(0, 5).map(e => (
            <div key={e.id} style={styles.eventItem}>
              <span style={styles.eventDate}>{e.event_date}</span>
              <span style={styles.eventTitle}>{e.title}</span>
              <span style={styles.eventType}>{e.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', background: '#0f0f0f', padding: '32px', maxWidth: '900px', margin: '0 auto' },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' },
  greeting: { color: '#fff', fontSize: '26px', fontWeight: '700', margin: 0 },
  subGreeting: { color: '#666', fontSize: '14px', marginTop: '4px' },
  logoutBtn: { background: 'none', border: '1px solid #333', color: '#888', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  sessionRow: { display: 'flex', gap: '12px', marginBottom: '32px' },
  sessionBtn: { flex: 1, padding: '20px', borderRadius: '12px', border: '1px solid #333', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  sessionIcon: { fontSize: '24px' },
  sessionLabel: { color: '#fff', fontSize: '13px', fontWeight: '600' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' },
  card: { background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #222' },
  cardTitle: { color: '#fff', fontSize: '15px', fontWeight: '600', marginBottom: '16px', marginTop: 0 },
  empty: { color: '#555', fontSize: '13px' },
  goalItem: { display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '12px' },
  goalArea: { color: '#6c63ff', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  goalDesc: { color: '#ccc', fontSize: '13px' },
  habitItem: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' },
  habitDot: { color: '#6c63ff', fontSize: '8px' },
  habitName: { color: '#ccc', fontSize: '13px' },
  eventItem: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' },
  eventDate: { color: '#666', fontSize: '11px', minWidth: '80px' },
  eventTitle: { color: '#ccc', fontSize: '13px', flex: 1 },
  eventType: { color: '#444', fontSize: '11px' }
}