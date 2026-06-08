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

  const sessionLabel = { morning: '🌅 Morning Check-in', evening: '🌙 Evening Debrief', chat: '💬 Chat' }

  useEffect(() => {
    if (!session_id) navigate('/dashboard')
  }, [session_id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await api.post('/sessions/message', {
        session_id,
        message: userMessage
      })
      setMessages(res.data.messages)
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    }
    setLoading(false)
  }

  const endSession = async () => {
    setEnding(true)
    try {
      await api.post('/sessions/end', { session_id })
    } catch (err) {
      console.error(err)
    }
    navigate('/dashboard')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{sessionLabel[type] || '💬 Chat'}</h2>
          <p style={styles.subtitle}>Press End Session when you're done — this saves your summary.</p>
        </div>
        <div style={styles.headerBtns}>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <button style={styles.endBtn} onClick={endSession} disabled={ending}>
            {ending ? 'Saving...' : 'End Session'}
          </button>
        </div>
      </div>

      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Start the conversation — your advisor is ready.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ ...styles.bubble, ...(m.role === 'user' ? styles.userBubble : styles.aiBubble) }}>
            <span style={styles.roleLabel}>{m.role === 'user' ? 'You' : 'Advisor'}</span>
            <p style={styles.messageText}>{m.content}</p>
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.bubble, ...styles.aiBubble }}>
            <span style={styles.roleLabel}>Advisor</span>
            <p style={styles.messageText}>...</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <textarea
          style={styles.input}
          placeholder="Type your message... (Enter to send)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <button style={styles.sendBtn} onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', background: '#0f0f0f', display: 'flex', flexDirection: 'column', maxWidth: '780px', margin: '0 auto', padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { color: '#fff', fontSize: '20px', fontWeight: '700', margin: 0 },
  subtitle: { color: '#555', fontSize: '12px', marginTop: '4px' },
  headerBtns: { display: 'flex', gap: '8px' },
  backBtn: { background: 'none', border: '1px solid #333', color: '#888', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  endBtn: { background: '#6c63ff', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  messages: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px', minHeight: '400px' },
  emptyState: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: '80px' },
  emptyText: { color: '#444', fontSize: '14px' },
  bubble: { padding: '14px 18px', borderRadius: '12px', maxWidth: '80%' },
  userBubble: { background: '#1e1b3a', alignSelf: 'flex-end', border: '1px solid #2d2960' },
  aiBubble: { background: '#1a1a1a', alignSelf: 'flex-start', border: '1px solid #222' },
  roleLabel: { fontSize: '11px', fontWeight: '600', color: '#6c63ff', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
  messageText: { color: '#ddd', fontSize: '14px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' },
  inputRow: { display: 'flex', gap: '10px', alignItems: 'flex-end' },
  input: { flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid #333', background: '#1a1a1a', color: '#fff', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'inherit' },
  sendBtn: { padding: '12px 20px', borderRadius: '10px', border: 'none', background: '#6c63ff', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', height: 'fit-content' }
}