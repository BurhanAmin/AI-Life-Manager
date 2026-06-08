import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const LIFE_SITUATIONS = ['student', 'working', 'both']
const GOAL_AREAS = ['career', 'fitness', 'learning', 'financial', 'creative']

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [lifeSituation, setLifeSituation] = useState('')
  const [goals, setGoals] = useState([{ area: 'career', description: '' }])
  const [habits, setHabits] = useState([''])

  const addGoal = () => setGoals([...goals, { area: 'career', description: '' }])
  const updateGoal = (i, field, value) => {
    const updated = [...goals]
    updated[i][field] = value
    setGoals(updated)
  }
  const removeGoal = (i) => setGoals(goals.filter((_, idx) => idx !== i))

  const addHabit = () => setHabits([...habits, ''])
  const updateHabit = (i, value) => {
    const updated = [...habits]
    updated[i] = value
    setHabits(updated)
  }
  const removeHabit = (i) => setHabits(habits.filter((_, idx) => idx !== i))

  const handleFinish = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Create user profile
      await api.post('/users', { full_name: fullName, life_situation: lifeSituation })

      // 2. Create goals
      const validGoals = goals.filter(g => g.description.trim())
      await Promise.all(validGoals.map(g => api.post('/goals', g)))

      // 3. Create habits
      const validHabits = habits.filter(h => h.trim())
      await Promise.all(validHabits.map(name => api.post('/habits', { name })))

      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.stepIndicator}>Step {step} of 3</div>

        {step === 1 && (
          <div>
            <h2 style={styles.title}>Let's get to know you</h2>
            <p style={styles.subtitle}>This helps your AI advisor understand your life.</p>
            <input
              style={styles.input}
              placeholder="Your full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
            <p style={styles.label}>What's your current situation?</p>
            <div style={styles.optionGroup}>
              {LIFE_SITUATIONS.map(s => (
                <button
                  key={s}
                  style={{ ...styles.optionBtn, ...(lifeSituation === s ? styles.optionBtnActive : {}) }}
                  onClick={() => setLifeSituation(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <button
              style={styles.nextBtn}
              onClick={() => setStep(2)}
              disabled={!fullName || !lifeSituation}
            >
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={styles.title}>What are your goals?</h2>
            <p style={styles.subtitle}>Add at least one goal across any life area.</p>
            {goals.map((goal, i) => (
              <div key={i} style={styles.goalRow}>
                <select
                  style={styles.select}
                  value={goal.area}
                  onChange={e => updateGoal(i, 'area', e.target.value)}
                >
                  {GOAL_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input
                  style={{ ...styles.input, flex: 1, margin: 0 }}
                  placeholder="Describe your goal..."
                  value={goal.description}
                  onChange={e => updateGoal(i, 'description', e.target.value)}
                />
                {goals.length > 1 && (
                  <button style={styles.removeBtn} onClick={() => removeGoal(i)}>✕</button>
                )}
              </div>
            ))}
            <button style={styles.addBtn} onClick={addGoal}>+ Add goal</button>
            <div style={styles.navRow}>
              <button style={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
              <button
                style={styles.nextBtn}
                onClick={() => setStep(3)}
                disabled={!goals.some(g => g.description.trim())}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={styles.title}>What habits do you want to build?</h2>
            <p style={styles.subtitle}>These will be tracked silently through your daily check-ins.</p>
            {habits.map((habit, i) => (
              <div key={i} style={styles.goalRow}>
                <input
                  style={{ ...styles.input, flex: 1, margin: 0 }}
                  placeholder="e.g. Read 30 minutes, Exercise, No phone after 10pm"
                  value={habit}
                  onChange={e => updateHabit(i, e.target.value)}
                />
                {habits.length > 1 && (
                  <button style={styles.removeBtn} onClick={() => removeHabit(i)}>✕</button>
                )}
              </div>
            ))}
            <button style={styles.addBtn} onClick={addHabit}>+ Add habit</button>
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.navRow}>
              <button style={styles.backBtn} onClick={() => setStep(2)}>← Back</button>
              <button
                style={styles.nextBtn}
                onClick={handleFinish}
                disabled={loading || !habits.some(h => h.trim())}
              >
                {loading ? 'Saving...' : "Let's go →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' },
  card: { background: '#1a1a1a', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' },
  stepIndicator: { color: '#6c63ff', fontSize: '12px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' },
  title: { color: '#fff', fontSize: '22px', fontWeight: '700', marginBottom: '6px' },
  subtitle: { color: '#888', fontSize: '14px', marginBottom: '24px' },
  label: { color: '#aaa', fontSize: '13px', marginBottom: '10px' },
  input: { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' },
  select: { padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#fff', fontSize: '14px', outline: 'none' },
  optionGroup: { display: 'flex', gap: '10px', marginBottom: '24px' },
  optionBtn: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#888', cursor: 'pointer', fontSize: '14px' },
  optionBtnActive: { border: '1px solid #6c63ff', background: '#1e1b3a', color: '#6c63ff' },
  goalRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' },
  removeBtn: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px', padding: '4px' },
  addBtn: { background: 'none', border: '1px dashed #444', color: '#888', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', marginBottom: '24px', marginTop: '4px' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  nextBtn: { padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#6c63ff', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  backBtn: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' },
  error: { color: '#ff4d4d', fontSize: '13px', marginBottom: '12px' }
}