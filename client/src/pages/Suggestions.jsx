import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const FILTERS = ['all', 'suggested', 'started', 'finished', 'abandoned']

export default function Suggestions() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [burnout, setBurnout] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const load = async () => {
    const [list, st, bo] = await Promise.all([
      api.get('/suggestions'),
      api.get('/suggestions/stats'),
      api.get('/burnout/status').catch(() => ({ data: null })),
    ])
    setItems(list.data)
    setStats(st.data)
    setBurnout(bo.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const generate = async () => {
    setGenerating(true)
    try {
      await api.post('/suggestions/generate', { count: 5 })
      await load()
    } finally {
      setGenerating(false)
    }
  }

  const setStatus = async (id, status) => {
    const res = await api.patch(`/suggestions/${id}/status`, { status })
    setItems(prev => prev.map(i => (i.id === id ? res.data : i)))
    refreshStats()
  }

  const remove = async (id) => {
    await api.delete(`/suggestions/${id}`)
    setItems(prev => prev.filter(i => i.id !== id))
    refreshStats()
  }

  const refreshStats = async () => {
    const st = await api.get('/suggestions/stats')
    setStats(st.data)
  }

  const shown = filter === 'all' ? items : items.filter(i => i.status === filter)

  if (loading) return <div style={s.loading}>Loading...</div>

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <header style={s.header}>
          <div>
            <h2 style={s.title}>Suggestions</h2>
            <p style={s.subtitle}>Things worth your free time</p>
          </div>
          <div style={s.headerBtns}>
            <button style={s.backBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
            <button style={s.addBtn} onClick={generate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </header>

        <div style={s.divider} />

        {burnout?.recovery && (
          <div style={s.recoveryNote}>
            You're in a recovery window right now — these lean toward rest, not output. {burnout.reason}
          </div>
        )}

        {stats && (
          <div style={s.statsRow}>
            <Stat label="Total" value={stats.total} />
            <Stat label="Finished" value={stats.finished} />
            <Stat label="Abandoned" value={stats.abandoned} />
            <Stat label="Follow-through" value={`${stats.followThroughRate}%`} />
          </div>
        )}

        <div style={s.tabs}>
          {FILTERS.map(f => (
            <button
              key={f}
              style={{ ...s.tab, ...(filter === f ? s.tabActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {shown.length === 0
          ? <p style={s.empty}>Nothing here yet. Hit Generate to get started.</p>
          : shown.map(i => (
            <div key={i.id} style={s.row}>
              <div style={s.left}>
                <span style={s.type}>{i.type}{i.source ? ` · ${i.source}` : ''}</span>
                {i.url
                  ? <a style={s.titleLink} href={i.url} target="_blank" rel="noreferrer">{i.title}</a>
                  : <span style={s.itemTitle}>{i.title}</span>}
                {i.reason && <span style={s.reason}>{i.reason}</span>}
              </div>
              <div style={s.right}>
                <span style={s.status}>{i.status}</span>
                <div style={s.actions}>
                  {i.status === 'suggested' && (
                    <button style={s.action} onClick={() => setStatus(i.id, 'started')}>Start</button>
                  )}
                  {(i.status === 'suggested' || i.status === 'started') && (
                    <button style={s.action} onClick={() => setStatus(i.id, 'finished')}>Finished</button>
                  )}
                  {(i.status === 'suggested' || i.status === 'started') && (
                    <button style={s.action} onClick={() => setStatus(i.id, 'abandoned')}>Abandon</button>
                  )}
                  {i.status === 'abandoned' && (
                    <button style={s.action} onClick={() => setStatus(i.id, 'suggested')}>Restore</button>
                  )}
                  <button style={s.actionMuted} onClick={() => remove(i.id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={s.stat}>
      <span style={s.statValue}>{value}</span>
      <span style={s.statLabel}>{label}</span>
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
  recoveryNote: { background: '#f3f0e8', border: '1px solid #e2ddd4', borderRadius: '8px', padding: '14px 16px', fontSize: '13px', color: '#3a3835', lineHeight: 1.6, marginBottom: '24px' },
  statsRow: { display: 'flex', gap: '28px', marginBottom: '28px' },
  stat: { display: 'flex', flexDirection: 'column', gap: '2px' },
  statValue: { fontFamily: 'Playfair Display, serif', fontSize: '22px', color: '#1a1918' },
  statLabel: { fontSize: '11px', color: '#b0aca6', letterSpacing: '0.4px', textTransform: 'uppercase' },
  tabs: { display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' },
  tab: { padding: '6px 12px', border: '1px solid #e2ddd4', borderRadius: '6px', background: 'transparent', color: '#8a8580', fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize' },
  tabActive: { background: '#1a1918', color: '#faf8f3', borderColor: '#1a1918' },
  empty: { fontSize: '13px', color: '#c0c0b8' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid #f0ede6', gap: '16px' },
  left: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  type: { fontSize: '10px', color: '#b0aca6', letterSpacing: '0.6px', textTransform: 'uppercase' },
  itemTitle: { fontSize: '14px', color: '#1a1918' },
  titleLink: { fontSize: '14px', color: '#1a1918', textDecoration: 'underline', textUnderlineOffset: '3px' },
  reason: { fontSize: '12px', color: '#b0aca6', fontWeight: '300', lineHeight: 1.5 },
  right: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', minWidth: '120px' },
  status: { fontSize: '10px', color: '#8a8580', letterSpacing: '0.6px', textTransform: 'uppercase' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end' },
  action: { background: 'none', border: 'none', fontSize: '11px', color: '#3a3835', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', padding: 0 },
  actionMuted: { background: 'none', border: 'none', fontSize: '11px', color: '#c0c0b8', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', padding: 0 },
}