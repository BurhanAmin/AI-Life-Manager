import { useState, useEffect } from 'react'
import api from '../lib/api'

// Drop into Calendar.jsx:  import GoogleCalendarConnect from '../components/GoogleCalendarConnect'
// then render <GoogleCalendarConnect onSynced={loadEvents} /> near the top of the page.
// onSynced (optional) is called after a successful sync so the page can refresh its list.
export default function GoogleCalendarConnect({ onSynced }) {
  const [status, setStatus] = useState({ connected: false, email: null })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const loadStatus = async () => {
    try {
      const res = await api.get('/google/status')
      setStatus(res.data)
    } catch (_) {
      /* leave default */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    // Surface the result of the OAuth redirect (?google=connected|error)
    const params = new URLSearchParams(window.location.search)
    const g = params.get('google')
    if (g === 'connected') setNote('Google Calendar connected.')
    if (g === 'error') setNote('Connection failed. Please try again.')
    if (g) window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const connect = async () => {
    setBusy(true)
    try {
      const res = await api.get('/google/auth-url')
      window.location.href = res.data.url // hand off to Google consent screen
    } catch (_) {
      setNote('Could not start connection.')
      setBusy(false)
    }
  }

  const sync = async () => {
    setBusy(true)
    setNote('')
    try {
      const res = await api.post('/google/sync')
      setNote(`Synced ${res.data.synced} of ${res.data.total} events.`)
      onSynced?.()
    } catch (_) {
      setNote('Sync failed.')
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      await api.post('/google/disconnect')
      setStatus({ connected: false, email: null })
      setNote('Disconnected.')
      onSynced?.()
    } catch (_) {
      setNote('Could not disconnect.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  return (
    <div style={styles.card}>
      <div style={styles.label}>GOOGLE CALENDAR</div>

      {status.connected ? (
        <>
          <div style={styles.body}>Connected as {status.email}</div>
          <div style={styles.row}>
            <button style={styles.primary} onClick={sync} disabled={busy}>
              {busy ? 'Working…' : 'Sync now'}
            </button>
            <button style={styles.ghost} onClick={disconnect} disabled={busy}>
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={styles.body}>
            Sync your Google Calendar so the advisor can read your real schedule.
          </div>
          <button style={styles.primary} onClick={connect} disabled={busy}>
            {busy ? 'Redirecting…' : 'Connect Google Calendar'}
          </button>
        </>
      )}

      {note && <div style={styles.note}>{note}</div>}
    </div>
  )
}

// Paper theme — matches the locked design system
const styles = {
  card: {
    background: '#fff',
    border: '1px solid #e2ddd4',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
  },
  label: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 11,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: '#b0aca6',
    marginBottom: 10,
  },
  body: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 14,
    color: '#3a3835',
    lineHeight: 1.6,
    marginBottom: 14,
  },
  row: { display: 'flex', gap: 10 },
  primary: {
    padding: '11px 28px',
    background: '#1a1918',
    color: '#faf8f3',
    border: 'none',
    borderRadius: 6,
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  ghost: {
    padding: '11px 28px',
    background: 'transparent',
    color: '#1a1918',
    border: '1px solid #1a1918',
    borderRadius: 6,
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  note: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 12,
    color: '#8a8580',
    marginTop: 12,
  },
}