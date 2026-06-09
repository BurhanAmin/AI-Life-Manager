import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function Review() {
  const navigate = useNavigate()
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await api.get('/review/latest')
        setReview(res.data)
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    fetchLatest()
  }, [])

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await api.post('/review/generate')
      setReview(res.data)
    } catch (err) { console.error(err) }
    setGenerating(false)
  }

  // Split the summary into sections by the known headers
  const renderSummary = (text) => {
    if (!text) return null
    const headers = ['WINS', 'SLIPPED', 'PATTERN', 'NEXT WEEK']
    const parts = []
    let remaining = text

    headers.forEach((h, i) => {
      const start = remaining.indexOf(h)
      if (start === -1) return
      const nextHeader = headers.slice(i + 1).map(nh => remaining.indexOf(nh)).filter(idx => idx > start)
      const end = nextHeader.length ? Math.min(...nextHeader) : remaining.length
      const body = remaining.slice(start + h.length, end).replace(/^[\s—:-]+/, '').trim()
      parts.push({ header: h, body })
    })

    if (parts.length === 0) return <p style={s.body}>{text}</p>

    return parts.map(({ header, body }) => (
      <div key={header} style={s.section}>
        <p style={s.sectionLabel}>{header}</p>
        <p style={s.body}>{body}</p>
      </div>
    ))
  }

  const formatWeek = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }

  if (loading) return <div style={s.loading}>Loading...</div>

  return (
    <div style={s.page}>
      <div style={s.inner}>

        <header style={s.header}>
          <div>
            <h1 style={s.title}>Weekly Review</h1>
            {review && <p style={s.subtitle}>Week of {formatWeek(review.week_start)}</p>}
          </div>
          <button style={s.backBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
        </header>

        <div style={s.divider} />

        {!review ? (
          <div style={s.empty}>
            <p style={s.emptyText}>No review yet for this week.</p>
            <button style={s.primaryBtn} onClick={generate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate this week\u2019s review'}
            </button>
          </div>
        ) : (
          <>
            <div style={s.card}>
              {renderSummary(review.summary)}
            </div>
            <button style={s.ghostBtn} onClick={generate} disabled={generating}>
              {generating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </>
        )}

      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#faf8f3' },
  inner: { maxWidth: '680px', margin: '0 auto', padding: '48px 32px' },
  loading: { minHeight: '100vh', background: '#faf8f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#8a8580' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '400', color: '#1a1918', marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: '#8a8580', fontWeight: '300' },
  backBtn: { background: 'none', border: 'none', fontSize: '12px', color: '#b0aca6', cursor: 'pointer' },
  divider: { borderTop: '1px solid #e2ddd4', marginBottom: '32px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '60px' },
  emptyText: { fontSize: '14px', color: '#b0aca6' },
  card: { background: '#fff', border: '1px solid #e2ddd4', borderRadius: '8px', padding: '28px', marginBottom: '20px' },
  section: { marginBottom: '24px' },
  sectionLabel: { fontSize: '11px', color: '#b0aca6', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' },
  body: { fontSize: '14px', color: '#3a3835', lineHeight: '1.7', margin: 0 },
  primaryBtn: { padding: '11px 28px', border: '1px solid #1a1918', borderRadius: '6px', background: '#1a1918', color: '#faf8f3', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  ghostBtn: { padding: '11px 28px', border: '1px solid #1a1918', borderRadius: '6px', background: 'transparent', color: '#1a1918', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }
}