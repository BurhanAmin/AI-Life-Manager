import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function Calendar() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', event_date: '', event_time: '', event_end_time: '', type: 'other', notes: '' })
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const fetchEvents = async () => {
    const res = await api.get(`/calendar?from=${today}`)
    setEvents(res.data)
    setLoading(false)
  }

  useEffect(() => { fetchEvents() }, [])

  const handleAdd = async () => {
    if (!form.title || !form.event_date) return
    setSaving(true)
    await api.post('/calendar', form)
    setForm({ title: '', event_date: '', event_time: '', event_end_time: '', type: 'other', notes: '' })
    setShowForm(false)
    await fetchEvents()
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await api.delete(`/calendar/${id}`)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  if (loading) return <div style={s.loading}>Loading...</div>

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <header style={s.header}>
          <div>
            <h2 style={s.title}>Calendar</h2>
            <p style={s.subtitle}>Upcoming events your advisor can see</p>
          </div>
          <div style={s.headerBtns}>
            <button style={s.backBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
            <button style={s.addBtn} onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Add event'}</button>
          </div>
        </header>

        <div style={s.divider} />

        {showForm && (
          <div style={s.form}>
            <div style={s.formGrid}>
              <div style={s.field}>
                <label style={s.label}>Title</label>
                <input style={s.input} placeholder="Event name" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Type</label>
                <select style={s.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="exam">Exam</option>
                  <option value="deadline">Deadline</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Date</label>
                <input style={s.input} type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Start time (optional)</label>
                <input style={s.input} type="time" value={form.event_time} onChange={e => setForm({ ...form, event_time: e.target.value })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>End time (optional)</label>
                <input style={s.input} type="time" value={form.event_end_time} onChange={e => setForm({ ...form, event_end_time: e.target.value })} />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Notes (optional)</label>
              <input style={s.input} placeholder="Any extra context..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button style={s.saveBtn} onClick={handleAdd} disabled={saving}>{saving ? 'Saving...' : 'Save event'}</button>
          </div>
        )}

        {events.length === 0
          ? <p style={s.empty}>No upcoming events.</p>
          : events.map(e => (
            <div key={e.id} style={s.eventRow}>
              <div style={s.eventLeft}>
                <span style={s.eventType}>{e.type}</span>
                <span style={s.eventTitle}>{e.title}</span>
                {e.notes && <span style={s.eventNotes}>{e.notes}</span>}
              </div>
              <div style={s.eventRight}>
                <span style={s.eventDate}>
                  {e.event_date}
                  {e.event_time ? ` · ${e.event_time}${e.event_end_time ? `–${e.event_end_time}` : ''}` : ''}
                </span>
                <button style={s.deleteBtn} onClick={() => handleDelete(e.id)}>Remove</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#faf8f3' },
  inner: { maxWidth: '680px', margin: '0 auto', padding: '48px 32px' },
  loading: { minHeight: '100vh', background: '#faf8f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#8a8580' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: '400', color: '#1a1918', marginBottom: '4px' },
  subtitle: { fontSize: '12px', color: '#b0aca6', fontWeight: '300' },
  headerBtns: { display: 'flex', gap: '10px', alignItems: 'center' },
  backBtn: { background: 'none', border: 'none', fontSize: '12px', color: '#b0aca6', cursor: 'pointer' },
  addBtn: { padding: '8px 18px', border: '1px solid #1a1918', borderRadius: '6px', background: '#1a1918', color: '#faf8f3', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
  divider: { borderTop: '1px solid #e2ddd4', marginBottom: '28px' },
  form: { background: '#fff', border: '1px solid #e2ddd4', borderRadius: '8px', padding: '24px', marginBottom: '28px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', color: '#b0aca6', letterSpacing: '0.4px' },
  input: { padding: '9px 12px', border: '1px solid #e2ddd4', borderRadius: '6px', background: '#faf8f3', fontSize: '13px', color: '#1a1918', outline: 'none', width: '100%', boxSizing: 'border-box' },
  saveBtn: { padding: '9px 24px', border: '1px solid #1a1918', borderRadius: '6px', background: '#1a1918', color: '#faf8f3', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
  empty: { fontSize: '13px', color: '#c0c0b8' },
  eventRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid #f0ede6' },
  eventLeft: { display: 'flex', flexDirection: 'column', gap: '3px' },
  eventType: { fontSize: '10px', color: '#b0aca6', letterSpacing: '0.6px', textTransform: 'uppercase' },
  eventTitle: { fontSize: '14px', color: '#1a1918' },
  eventNotes: { fontSize: '12px', color: '#b0aca6', fontWeight: '300' },
  eventRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
  eventDate: { fontSize: '12px', color: '#b0aca6', fontWeight: '300' },
  deleteBtn: { background: 'none', border: 'none', fontSize: '11px', color: '#c0c0b8', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }
}