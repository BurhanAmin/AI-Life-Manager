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
  const updateGoal = (i, field, value) => { const u = [...goals]; u[i][field] = value; setGoals(u) }
  const removeGoal = (i) => setGoals(goals.filter((_, idx) => idx !== i))
  const addHabit = () => setHabits([...habits, ''])
  const updateHabit = (i, value) => { const u = [...habits]; u[i] = value; setHabits(u) }
  const removeHabit = (i) => setHabits(habits.filter((_, idx) => idx !== i))

  const handleFinish = async () => {
    setLoading(true); setError('')
    try {
      await api.post('/users', { full_name: fullName, life_situation: lifeSituation })
      await Promise.all(goals.filter(g => g.description.trim()).map(g => api.post('/goals', g)))
      await Promise.all(habits.filter(h => h.trim()).map(name => api.post('/habits', { name })))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.stepRow}>
          {[1,2,3].map(n => (
            <div key={n} style={{ ...s.stepDot, ...(step === n ? s.stepDotActive : step > n ? s.stepDotDone : {}) }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 style={s.title}>Let's get to know you</h2>
            <p style={s.subtitle}>This helps your advisor understand your life context.</p>
            <div style={s.field}>
              <label style={s.label}>Your name</label>
              <input style={s.input} placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Current situation</label>
              <div style={s.optionRow}>
                {LIFE_SITUATIONS.map(sit => (
                  <button key={sit} style={{ ...s.optionBtn, ...(lifeSituation === sit ? s.optionBtnActive : {}) }} onClick={() => setLifeSituation(sit)}>
                    {sit.charAt(0).toUpperCase() + sit.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button style={s.btn} onClick={() => setStep(2)} disabled={!fullName || !lifeSituation}>Continue</button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={s.title}>What are you working toward?</h2>
            <p style={s.subtitle}>Add goals across any areas of your life.</p>
            {goals.map((goal, i) => (
              <div key={i} style={s.goalRow}>
                <select style={s.select} value={goal.area} onChange={e => updateGoal(i, 'area', e.target.value)}>
                  {GOAL_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Describe this goal..." value={goal.description} onChange={e => updateGoal(i, 'description', e.target.value)} />
                {goals.length > 1 && <button style={s.removeBtn} onClick={() => removeGoal(i)}>×</button>}
              </div>
            ))}
            <button style={s.addBtn} onClick={addGoal}>+ Add another goal</button>
            <div style={s.navRow}>
              <button style={s.backBtn} onClick={() => setStep(1)}>Back</button>
              <button style={s.btn} onClick={() => setStep(3)} disabled={!goals.some(g => g.description.trim())}>Continue</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={s.title}>Habits you want to build</h2>
            <p style={s.subtitle}>These are tracked quietly through your daily conversations.</p>
            {habits.map((habit, i) => (
              <div key={i} style={s.goalRow}>
                <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="e.g. Read for 30 minutes" value={habit} onChange={e => updateHabit(i, e.target.value)} />
                {habits.length > 1 && <button style={s.removeBtn} onClick={() => removeHabit(i)}>×</button>}
              </div>
            ))}
            <button style={s.addBtn} onClick={addHabit}>+ Add another habit</button>
            {error && <p style={s.error}>{error}</p>}
            <div style={s.navRow}>
              <button style={s.backBtn} onClick={() => setStep(2)}>Back</button>
              <button style={s.btn} onClick={handleFinish} disabled={loading || !habits.some(h => h.trim())}>
                {loading ? 'Saving...' : 'Get started'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#faf8f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  container: { width: '100%', maxWidth: '480px' },
  stepRow: { display: 'flex', gap: '6px', marginBottom: '32px' },
  stepDot: { width: '24px', height: '3px', borderRadius: '2px', background: '#e2ddd4' },
  stepDotActive: { background: '#1a1918' },
  stepDotDone: { background: '#8a8580' },
  title: { fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: '500', color: '#1a1918', marginBottom: '8px' },
  subtitle: { fontSize: '13px', color: '#8a8580', fontWeight: '300', marginBottom: '28px', lineHeight: '1.6' },
  field: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '12px', color: '#8a8580', marginBottom: '8px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e2ddd4', borderRadius: '6px', background: '#fff', fontSize: '14px', color: '#1a1918', outline: 'none', marginBottom: '0' },
  select: { padding: '10px 12px', border: '1px solid #e2ddd4', borderRadius: '6px', background: '#fff', fontSize: '13px', color: '#1a1918', outline: 'none' },
  optionRow: { display: 'flex', gap: '8px' },
  optionBtn: { padding: '9px 18px', borderRadius: '6px', border: '1px solid #e2ddd4', background: '#fff', fontSize: '13px', color: '#8a8580', cursor: 'pointer' },
  optionBtnActive: { border: '1px solid #1a1918', background: '#1a1918', color: '#faf8f3' },
  goalRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' },
  removeBtn: { background: 'none', border: 'none', color: '#c0c0b8', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px' },
  addBtn: { background: 'none', border: '1px dashed #d0ccc4', color: '#8a8580', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginBottom: '28px', marginTop: '4px' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btn: { padding: '11px 28px', border: '1px solid #1a1918', borderRadius: '6px', background: '#1a1918', color: '#faf8f3', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  backBtn: { background: 'none', border: 'none', color: '#8a8580', cursor: 'pointer', fontSize: '13px' },
  error: { fontSize: '12px', color: '#c0392b', marginBottom: '12px' }
}