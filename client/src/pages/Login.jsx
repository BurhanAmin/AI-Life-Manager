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
      if (error) return setError(error.message), setLoading(false)
      navigate('/onboarding')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return setError(error.message), setLoading(false)
      navigate('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>AI Life Manager</h1>
        <p style={styles.subtitle}>{isSignup ? 'Create your account' : 'Welcome back'}</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <p style={styles.toggle}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span style={styles.link} onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? 'Log in' : 'Sign up'}
          </span>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' },
  card: { background: '#1a1a1a', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' },
  title: { color: '#ffffff', fontSize: '24px', fontWeight: '700', marginBottom: '4px', textAlign: 'center' },
  subtitle: { color: '#888', fontSize: '14px', marginBottom: '32px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '12px 16px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#fff', fontSize: '14px', outline: 'none' },
  button: { padding: '12px', borderRadius: '8px', border: 'none', background: '#6c63ff', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
  error: { color: '#ff4d4d', fontSize: '13px', margin: '0' },
  toggle: { color: '#888', fontSize: '13px', textAlign: 'center', marginTop: '20px' },
  link: { color: '#6c63ff', cursor: 'pointer', fontWeight: '600' }
}