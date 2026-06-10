const supabase = require('../config/supabase')

// Mirrors the thresholds of computeTone() in config/prompt.js, but is
// self-contained so it can be reused by idle detection and course generation.
const BURNOUT_KEYWORDS = [
  'exhausted',
  'burnt out',
  'burned out',
  'burnout',
  'drained',
  'overwhelmed',
  "can't focus",
  'cant focus',
  'no energy',
  'running on empty',
  'spread thin',
  "can't cope",
  'cant cope',
  'too much going on',
  'breaking down',
]

const iso = (d) => d.toISOString().slice(0, 10)

// Returns a burnout/tone assessment for a user.
// { mode, reason, rate, completedCount, possibleCount, burnoutSignal, recovery }
async function assessBurnout(userId) {
  const today = new Date()
  const from = new Date()
  from.setDate(today.getDate() - 6) // 7-day window inclusive

  const [habitsRes, logsRes, summaryRes] = await Promise.all([
    supabase.from('habits').select('id').eq('user_id', userId).eq('active', true),
    supabase
      .from('habit_logs')
      .select('completed,date')
      .eq('user_id', userId)
      .gte('date', iso(from))
      .lte('date', iso(today)),
    supabase
      .from('rolling_summary')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const activeHabits = (habitsRes.data || []).length
  const completedCount = (logsRes.data || []).filter((l) => l.completed).length
  const possibleCount = activeHabits * 7 // missed days count as incomplete
  const rate = possibleCount > 0 ? completedCount / possibleCount : null

  // Scan the rolling summary for burnout language.
  const summaryText = summaryRes.data
    ? JSON.stringify(summaryRes.data).toLowerCase()
    : ''
  const burnoutSignal = BURNOUT_KEYWORDS.some((k) => summaryText.includes(k))

  // Data baseline.
  let mode, reason
  if (rate === null) {
    mode = 'CHECK IN'
    reason = 'No habit data yet to read.'
  } else if (rate < 0.3) {
    mode = 'RECHARGE'
    reason = `Habit completion is low (${Math.round(rate * 100)}% over 7 days).`
  } else if (rate < 0.75) {
    mode = 'GENTLE PUSH'
    reason = `Habit completion is moderate (${Math.round(rate * 100)}% over 7 days).`
  } else {
    mode = 'LOCK IN'
    reason = `Habit completion is strong (${Math.round(rate * 100)}% over 7 days).`
  }

  // A burnout signal in the summary overrides the data baseline toward recovery.
  if (burnoutSignal) {
    mode = 'RECHARGE'
    reason = 'Burnout language detected in recent summaries — prioritising recovery.'
  }

  return {
    mode,
    reason,
    rate: rate === null ? null : Math.round(rate * 100),
    completedCount,
    possibleCount,
    burnoutSignal,
    recovery: mode === 'RECHARGE',
  }
}

// GET /api/burnout/status  (authed)
exports.getStatus = async (req, res) => {
  try {
    const result = await assessBurnout(req.user.id)
    res.json(result)
  } catch (e) {
    console.error('burnout getStatus error', e)
    res.status(500).json({ error: 'Could not assess burnout' })
  }
}

exports.assessBurnout = assessBurnout