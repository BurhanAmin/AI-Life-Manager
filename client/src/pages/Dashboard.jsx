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
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    fetchData()
  }, [])

  const startSession = async (type) => {
    const res = await api.post('/sessions/start', { type })
    navigate('/chat', { state: { session_id: res.data.id, type , initialMessages: res.data.messages || []} })
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const formatDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) return <div style={s.loading}>Loading...</div>

  return (
    <div style={s.page}>
      <div style={s.inner}>

        <header style={s.header}>
          <div>
            <h1 style={s.greeting}>{greeting()}, {user?.full_name?.split(' ')[0]}.</h1>
            <p style={s.date}>{formatDate()}</p>
          </div>
          <button style={s.logoutBtn} onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}>Sign out</button>
          <button style={s.logoutBtn} onClick={() => navigate('/review')}>Weekly review</button>
        </header>

        <div style={s.divider} />

        <section style={s.section}>
          <p style={s.sectionLabel}>Start a session</p>
          <div style={s.sessionGrid}>
            {[
              { type: 'morning', label: 'Morning check-in', desc: 'Review your day ahead' },
              { type: 'chat', label: 'Open chat', desc: 'Talk to your advisor' },
              { type: 'evening', label: 'Evening debrief', desc: 'Reflect and plan tomorrow' }
            ].map(({ type, label, desc }) => (
              <button key={type} style={s.sessionCard} onClick={() => startSession(type)}>
                <span style={s.sessionLabel}>{label}</span>
                <span style={s.sessionDesc}>{desc}</span>
              </button>
            ))}
          </div>
        </section>

        <div style={s.divider} />

        <div style={s.grid}>
          <section style={s.card}>
            <div style={s.cardHeader}>
              <p style={s.sectionLabel}>Goals</p>
            </div>
            {goals.length === 0
              ? <p style={s.empty}>No goals set.</p>
              : goals.map(g => (
                <div key={g.id} style={s.goalItem}>
                  <span style={s.goalArea}>{g.area}</span>
                  <span style={s.goalDesc}>{g.description}</span>
                </div>
              ))}
          </section>

          <section style={s.card}>
            <div style={s.cardHeader}>
              <p style={s.sectionLabel}>Habits</p>
              <button style={s.cardLink} onClick={() => navigate('/habits')}>Log today</button>
            </div>
            {habits.length === 0
              ? <p style={s.empty}>No habits tracked.</p>
              : habits.map(h => (
                <div key={h.id} style={s.habitItem}>
                  <div style={s.habitDot} />
                  <span style={s.habitName}>{h.name}</span>
                </div>
              ))}
          </section>

          <section style={s.card}>
            <div style={s.cardHeader}>
              <p style={s.sectionLabel}>Upcoming</p>
              <button style={s.cardLink} onClick={() => navigate('/calendar')}>Add event</button>
            </div>
            {events.length === 0
              ? <p style={s.empty}>Nothing scheduled.</p>
              : events.slice(0, 4).map(e => (
                <div key={e.id} style={s.eventItem}>
                  <span style={s.eventDate}>{e.event_date}</span>
                  <span style={s.eventTitle}>{e.title}</span>
                </div>
              ))}
          </section>
        </div>

      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#faf8f3' },
  inner: { maxWidth: '860px', margin: '0 auto', padding: '48px 32px' },
  loading: { minHeight: '100vh', background: '#faf8f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#8a8580' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' },
  greeting: { fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: '400', color: '#1a1918', marginBottom: '6px' },
  date: { fontSize: '13px', color: '#8a8580', fontWeight: '300' },
  logoutBtn: { background: 'none', border: 'none', fontSize: '12px', color: '#b0aca6', cursor: 'pointer', padding: '4px 0' },
  divider: { borderTop: '1px solid #e2ddd4', marginBottom: '32px' },
  section: { marginBottom: '32px' },
  sectionLabel: { fontSize: '11px', color: '#b0aca6', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '14px', fontWeight: '500' },
  sessionGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  sessionCard: { padding: '18px 16px', border: '1px solid #e2ddd4', borderRadius: '8px', background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', transition: 'border-color 0.15s' },
  sessionLabel: { fontSize: '13px', fontWeight: '500', color: '#1a1918' },
  sessionDesc: { fontSize: '11px', color: '#b0aca6', fontWeight: '300' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  card: { background: '#fff', border: '1px solid #e2ddd4', borderRadius: '8px', padding: '20px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardLink: { background: 'none', border: 'none', fontSize: '11px', color: '#8a8580', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' },
  empty: { fontSize: '13px', color: '#c0c0b8' },
  goalItem: { marginBottom: '14px' },
  goalArea: { display: 'block', fontSize: '10px', color: '#b0aca6', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '2px' },
  goalDesc: { fontSize: '13px', color: '#3a3835', lineHeight: '1.5' },
  habitItem: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  habitDot: { width: '4px', height: '4px', borderRadius: '50%', background: '#c0c0b8', flexShrink: 0 },
  habitName: { fontSize: '13px', color: '#3a3835' },
  eventItem: { display: 'flex', gap: '12px', alignItems: 'baseline', marginBottom: '12px' },
  eventDate: { fontSize: '11px', color: '#b0aca6', minWidth: '72px', fontWeight: '300' },
  eventTitle: { fontSize: '13px', color: '#3a3835' }
}