import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function Habits() {
  const navigate = useNavigate()
  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState({})
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const fetchData = async () => {
      const [habitsRes, logsRes] = await Promise.all([
        api.get('/habits'),
        api.get(`/habits/logs?from=${today}&to=${today}`)
      ])
      setHabits(habitsRes.data)
      const logMap = {}
      logsRes.data.forEach(l => { logMap[l.habit_id] = l.completed })
      setLogs(logMap)
      setLoading(false)
    }
    fetchData()
  }, [])

  const toggleHabit = async (habit_id) => {
    const newVal = !logs[habit_id]
    setLogs(prev => ({ ...prev, [habit_id]: newVal }))
    await api.post('/habits/log', { habit_id, date: today, completed: newVal })
  }

  if (loading) return <div style={s.loading}>Loading...</div>

  const done = Object.values(logs).filter(Boolean).length
  const total = habits.length

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <header style={s.header}>
          <div>
            <h2 style={s.title}>Habits</h2>
            <p style={s.subtitle}>{today} &mdash; {done} of {total} complete</p>
          </div>
          <button style={s.backBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
        </header>
        <div style={s.divider} />
        {habits.length === 0
          ? <p style={s.empty}>No habits yet. Add them during onboarding.</p>
          : habits.map(h => (
            <div key={h.id} style={s.habitRow}>
              <span style={{ ...s.habitName, ...(logs[h.id] ? s.habitDone : {}) }}>{h.name}</span>
              <button style={{ ...s.toggleBtn, ...(logs[h.id] ? s.toggleDone : {}) }} onClick={() => toggleHabit(h.id)}>
                {logs[h.id] ? 'Done' : 'Mark done'}
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#faf8f3' },
  inner: { maxWidth: '560px', margin: '0 auto', padding: '48px 32px' },
  loading: { minHeight: '100vh', background: '#faf8f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#8a8580' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: '400', color: '#1a1918', marginBottom: '4px' },
  subtitle: { fontSize: '12px', color: '#b0aca6', fontWeight: '300' },
  backBtn: { background: 'none', border: 'none', fontSize: '12px', color: '#b0aca6', cursor: 'pointer' },
  divider: { borderTop: '1px solid #e2ddd4', marginBottom: '28px' },
  empty: { fontSize: '13px', color: '#c0c0b8' },
  habitRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f0ede6' },
  habitName: { fontSize: '14px', color: '#1a1918' },
  habitDone: { color: '#b0aca6', textDecoration: 'line-through' },
  toggleBtn: { padding: '6px 14px', border: '1px solid #e2ddd4', borderRadius: '6px', background: '#fff', fontSize: '12px', color: '#8a8580', cursor: 'pointer' },
  toggleDone: { border: '1px solid #c8d8c0', background: '#f0f5ee', color: '#6a8f60' }
}