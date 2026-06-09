import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../lib/api'
import { supabase } from '../lib/supabase'

export default function Chat() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session_id, type, initialMessages } = location.state || {}
  console.log('CHAT STATE:', JSON.stringify(location.state))
  const [messages, setMessages] = useState(initialMessages || [])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ending, setEnding] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [playingIndex, setPlayingIndex] = useState(null)
  const [streamingText, setStreamingText] = useState('')

  const bottomRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioRef = useRef(null)

  const sessionLabel = { morning: 'Morning check-in', evening: 'Evening debrief', chat: 'Open chat' }

  useEffect(() => { if (!session_id) navigate('/dashboard') }, [session_id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamingText, loading])
  useEffect(() => {
  if (initialMessages?.length) setMessages(initialMessages)
}, [])

  const sendMessage = async (messageText) => {
    const text = (messageText || input).trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    setStreamingText('')
    setMessages(prev => [...prev, { role: 'user', content: text }])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const jwt = session?.access_token

      const response = await fetch(`${import.meta.env.VITE_API_URL}/sessions/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
        body: JSON.stringify({ session_id, message: text, stream: true })
      })

      if (!response.ok) throw new Error('Stream request failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.token !== undefined) setStreamingText(prev => prev + parsed.token)
            if (parsed.done) {
              setMessages(prev => [...prev, { role: 'assistant', content: parsed.fullText }])
              setStreamingText('')
              if (voiceMode) speakMessage(parsed.fullText, -1)
            }
          } catch { }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
      setStreamingText('')
    }
    setLoading(false)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = handleRecordingStop
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch (err) { console.error('Mic access denied:', err) }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    setRecording(false)
  }

  const handleRecordingStop = async () => {
    if (audioChunksRef.current.length === 0) return
    setTranscribing(true)
    try {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', blob, 'audio.webm')
      const res = await api.post('/voice/transcribe', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setTranscribing(false)
      if (res.data.transcript) await sendMessage(res.data.transcript)
    } catch {
      setTranscribing(false)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Could not transcribe audio. Please try again.' }])
    }
  }

  const speakMessage = async (text, idx) => {
    try {
      setPlayingIndex(idx)
      const res = await api.post('/voice/speak', { text }, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src) }
      audioRef.current = new Audio(url)
      audioRef.current.onended = () => setPlayingIndex(null)
      audioRef.current.play()
    } catch { setPlayingIndex(null) }
  }

  const pauseAudio = () => { audioRef.current?.pause(); setPlayingIndex(null) }

  const endSession = async () => {
    setEnding(true)
    try { await api.post('/sessions/end', { session_id }) } catch (err) { console.error(err) }
    navigate('/dashboard')
  }

  const allMessages = streamingText
    ? [...messages, { role: 'assistant', content: streamingText, streaming: true }]
    : messages

  return (
    <div style={s.page}>
      <style>{keyframes}</style>
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

        <div style={s.toggleRow}>
          <button style={{ ...s.toggleBtn, ...(voiceMode ? {} : s.toggleActive) }} onClick={() => setVoiceMode(false)}>Text</button>
          <button style={{ ...s.toggleBtn, ...(voiceMode ? s.toggleActive : {}) }} onClick={() => setVoiceMode(true)}>Voice</button>
        </div>

        <div style={s.messages}>
          {allMessages.length === 0 && !loading && (
            <p style={s.emptyState}>Your advisor is ready. Start the conversation.</p>
          )}
          {allMessages.map((m, i) => (
            <div key={i} style={m.role === 'user' ? s.userRow : s.aiRow}>
              <span style={s.roleLabel}>{m.role === 'user' ? 'You' : 'Advisor'}</span>
              <p
                style={{ ...s.messageText, ...(m.streaming ? s.streamingMsg : {}) }}
                dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
              />
              {m.role === 'assistant' && !m.streaming && voiceMode && (
                <button style={s.replayBtn} onClick={() => playingIndex === i ? pauseAudio() : speakMessage(m.content, i)}>
                  {playingIndex === i ? 'Pause' : 'Replay'}
                </button>
              )}
            </div>
          ))}

          {/* Thinking indicator — shows before first token arrives */}
          {loading && !streamingText && !transcribing && (
            <div style={s.aiRow}>
              <span style={s.roleLabel}>Advisor</span>
              <div style={s.thinkingBubble}>
                <span style={{ ...s.dot, animationDelay: '0ms' }} />
                <span style={{ ...s.dot, animationDelay: '160ms' }} />
                <span style={{ ...s.dot, animationDelay: '320ms' }} />
              </div>
            </div>
          )}

          {transcribing && (
            <div style={s.aiRow}>
              <span style={s.roleLabel}>You</span>
              <p style={s.messageText}>Transcribing...</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {voiceMode ? (
          <div style={s.voiceArea}>
            <button
              style={{ ...s.recordBtn, ...(recording ? s.recordBtnActive : {}) }}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={transcribing || loading}
            >
              <MicIcon />
            </button>
            <p style={s.recordHint}>
              {transcribing ? 'Transcribing...' : loading ? 'Thinking...' : recording ? 'Release to send' : 'Hold to speak'}
            </p>
          </div>
        ) : (
          <div style={s.inputArea}>
            <textarea
              style={s.input}
              placeholder="Write a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              rows={2}
            />
            <button style={s.sendBtn} onClick={() => sendMessage()} disabled={loading || !input.trim()}>Send</button>
          </div>
        )}

      </div>
    </div>
  )
}

const MicIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#faf8f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="9" y1="22" x2="15" y2="22" />
  </svg>
)

const keyframes = `
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(26,25,24,0.25); }
    70%  { box-shadow: 0 0 0 12px rgba(26,25,24,0); }
    100% { box-shadow: 0 0 0 0 rgba(26,25,24,0); }
  }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%           { transform: scale(1);   opacity: 1; }
  }
`

const s = {
  page: { minHeight: '100vh', background: '#faf8f3' },
  inner: { maxWidth: '680px', margin: '0 auto', padding: '48px 32px', display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: '400', color: '#1a1918', marginBottom: '4px' },
  subtitle: { fontSize: '12px', color: '#b0aca6', fontWeight: '300' },
  headerBtns: { display: 'flex', gap: '10px', alignItems: 'center' },
  backBtn: { background: 'none', border: 'none', fontSize: '12px', color: '#b0aca6', cursor: 'pointer' },
  endBtn: { padding: '8px 18px', border: '1px solid #1a1918', borderRadius: '6px', background: '#1a1918', color: '#faf8f3', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
  divider: { borderTop: '1px solid #e2ddd4', marginBottom: '24px' },
  toggleRow: { display: 'flex', marginBottom: '28px', border: '1px solid #e2ddd4', borderRadius: '6px', overflow: 'hidden', width: 'fit-content' },
  toggleBtn: { padding: '7px 20px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', fontWeight: '400', background: '#fff', color: '#8a8580', border: 'none', cursor: 'pointer', letterSpacing: '0.3px' },
  toggleActive: { background: '#1a1918', color: '#faf8f3', fontWeight: '500' },
  messages: { flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '400px', marginBottom: '32px' },
  emptyState: { fontSize: '13px', color: '#c0c0b8', textAlign: 'center', marginTop: '80px' },
  userRow: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },
  aiRow: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' },
  roleLabel: { fontSize: '10px', color: '#b0aca6', letterSpacing: '0.8px', textTransform: 'uppercase' },
  messageText: { maxWidth: '85%', fontSize: '14px', color: '#1a1918', lineHeight: '1.7', background: '#fff', border: '1px solid #e2ddd4', borderRadius: '8px', padding: '12px 16px', margin: 0 },
  streamingMsg: { color: '#8a8580' },
  replayBtn: { fontSize: '11px', color: '#b0aca6', background: 'none', border: 'none', cursor: 'pointer', padding: '0', textDecoration: 'underline' },
  thinkingBubble: { display: 'flex', alignItems: 'center', gap: '5px', background: '#fff', border: '1px solid #e2ddd4', borderRadius: '8px', padding: '14px 18px' },
  dot: { display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#c0c0b8', animation: 'bounce 1.2s infinite ease-in-out' },
  inputArea: { display: 'flex', gap: '10px', alignItems: 'flex-end', borderTop: '1px solid #e2ddd4', paddingTop: '20px' },
  input: { flex: 1, padding: '12px', border: '1px solid #e2ddd4', borderRadius: '6px', background: '#fff', fontSize: '14px', color: '#1a1918', outline: 'none', resize: 'none', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.5' },
  sendBtn: { padding: '10px 20px', border: '1px solid #1a1918', borderRadius: '6px', background: '#1a1918', color: '#faf8f3', fontSize: '13px', fontWeight: '500', cursor: 'pointer', height: 'fit-content' },
  voiceArea: { borderTop: '1px solid #e2ddd4', paddingTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  recordBtn: { width: '56px', height: '56px', borderRadius: '50%', background: '#1a1918', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s' },
  recordBtnActive: { animation: 'pulse-ring 1.2s ease-out infinite' },
  recordHint: { fontSize: '12px', color: '#b0aca6', letterSpacing: '0.3px' }
}