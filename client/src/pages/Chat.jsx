import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../lib/api'

export default function Chat() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session_id, type } = location.state || {}
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ending, setEnding] = useState(false)
  const bottomRef = useRef(null)

  const sessionLabel = { morning: 'Morning check-in', evening: 'Evening debrief', chat: 'Open chat' }

  useEffect(() => { if (!session_id) navigate('/dashboard') }, [session_id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    try {
      const res = await api.post('/sessions/message', { session_id, message: userMessage })
      setMessages(res.data.messages)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  const endSession = async () => {
    setEnding(true)
    try { await api.post('/sessions/end', { session_id }) } catch (err) { console.error(err) }
    navigate('/dashboard')
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>

        <header style={s.header}>
          <div>
            <h2 style={s.title}>{sessionLabel[type] || 'Chat'}</h2>
            <p style={s.subtitle}>End the session when you're done — this saves your summary.</p>
          </div>
          <div style={s.headerBtns}>
            <button style={s.backBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
            <button style={s.endBtn} onClick={endSession} disabled={ending}>
              {ending ? 'Saving...' : 'End session'}
            </button>
          </div>
        </header>

        <div style={s.divider} />

        <div style={s.messages}>
          {messages.length === 0 && (
            <p style={s.emptyState}>Your advisor is ready. Start the conversation.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} style={m.role === 'user' ? s.userRow : s.aiRow}>
              <span style={s.roleLabel}>{m.role === 'user' ? 'You' : 'Advisor'}</span>
              <p style={s.messageText} dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          ))}
          {loading && (
            <div style={s.aiRow}>
              <span style={s.roleLabel}>Advisor</span>
              <p style={s.messageText}>...</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={s.inputArea}>
          <textarea
            style={s.input}
            placeholder="Write a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            rows={2}
          />
          <button style={s.sendBtn} onClick={sendMessage} disabled={loading || !input.trim()}>Send</button>
        </div>

      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#faf8f3' },
  inner: { maxWidth: '680px', margin: '0 auto', padding: '48px 32px', display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '400', color: '#1a1918', marginBottom: '4px' },
  subtitle: { fontSize: '12px', color: '#b0aca6', fontWeight: '300' },
  headerBtns: { display: 'flex', gap: '10px', alignItems: 'center' },
  backBtn: { background: 'none', border: 'none', fontSize: '12px', color: '#b0aca6', cursor: 'pointer' },
  endBtn: { padding: '8px 18px', border: '1px solid #1a1918', borderRadius: '6px', background: '#1a1918', color: '#faf8f3', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
  divider: { borderTop: '1px solid #e2ddd4', marginBottom: '32px' },
  messages: { flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '400px', marginBottom: '32px' },
  emptyState: { fontSize: '13px', color: '#c0c0b8', textAlign: 'center', marginTop: '80px' },
  userRow: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },
  aiRow: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' },
  roleLabel: { fontSize: '10px', color: '#b0aca6', letterSpacing: '0.8px', textTransform: 'uppercase' },
  messageText: { maxWidth: '85%', fontSize: '14px', color: '#1a1918', lineHeight: '1.7', background: '#fff', border: '1px solid #e2ddd4', borderRadius: '8px', padding: '12px 16px', margin: 0 },
  inputArea: { display: 'flex', gap: '10px', alignItems: 'flex-end', borderTop: '1px solid #e2ddd4', paddingTop: '20px' },
  input: { flex: 1, padding: '12px', border: '1px solid #e2ddd4', borderRadius: '6px', background: '#fff', fontSize: '14px', color: '#1a1918', outline: 'none', resize: 'none', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.5' },
  sendBtn: { padding: '10px 20px', border: '1px solid #1a1918', borderRadius: '6px', background: '#1a1918', color: '#faf8f3', fontSize: '13px', fontWeight: '500', cursor: 'pointer', height: 'fit-content' }
}