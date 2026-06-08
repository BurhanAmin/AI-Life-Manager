import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      navigate('/onboarding')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <h1 style={s.wordmark}>Advisor</h1>
          <p style={s.tagline}>Your personal life advisor</p>
        </div>
        <div style={s.divider} />
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p style={s.error}>{error}</p>}
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p style={s.toggle}>
          {isSignup ? 'Already have an account? ' : 'No account yet? '}
          <span style={s.link} onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? 'Sign in' : 'Create one'}
          </span>
        </p>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#faf8f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  container: { width: '100%', maxWidth: '360px' },
  header: { marginBottom: '28px' },
  wordmark: { fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: '500', color: '#1a1918', marginBottom: '6px' },
  tagline: { fontSize: '13px', color: '#8a8580', fontWeight: '300' },
  divider: { borderTop: '1px solid #e2ddd4', marginBottom: '28px' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: '#8a8580', fontWeight: '400', letterSpacing: '0.3px' },
  input: { padding: '10px 12px', border: '1px solid #e2ddd4', borderRadius: '6px', background: '#fff', fontSize: '14px', color: '#1a1918', outline: 'none' },
  btn: { marginTop: '4px', padding: '11px', border: '1px solid #1a1918', borderRadius: '6px', background: '#1a1918', color: '#faf8f3', fontSize: '13px', fontWeight: '500', cursor: 'pointer', letterSpacing: '0.2px' },
  error: { fontSize: '12px', color: '#c0392b' },
  toggle: { marginTop: '20px', fontSize: '12px', color: '#8a8580', textAlign: 'center' },
  link: { color: '#1a1918', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }
}