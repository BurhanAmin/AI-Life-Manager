const supabase = require('../config/supabase')
const { buildContext } = require('../config/claude')

// Monday of the current week as YYYY-MM-DD
const getWeekStart = () => {
  const now = new Date()
  const day = now.getDay() // 0 = Sun
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  return monday.toISOString().split('T')[0]
}

const generateReview = async (req, res) => {
  const userId = req.user.id
  const weekStart = getWeekStart()
  const weekStartISO = weekStart + 'T00:00:00.000Z'

  try {
    // Pull this week's sessions + habit logs
    const [sessionsRes, logsRes, context] = await Promise.all([
      supabase.from('sessions').select('type, summary, messages, created_at').eq('user_id', userId).gte('created_at', weekStartISO),
      supabase.from('habit_logs').select('*, habits(name)').eq('user_id', userId).gte('date', weekStart),
      buildContext(userId)
    ])

    const sessions = sessionsRes.data || []
    const logs = logsRes.data || []

    // Habit completion breakdown
    const grouped = {}
    logs.forEach(l => {
      const name = l.habits?.name || l.habit_id
      if (!grouped[name]) grouped[name] = { done: 0, total: 0 }
      grouped[name].total++
      if (l.completed) grouped[name].done++
    })
    const habitText = Object.entries(grouped).map(([n, { done, total }]) => `- ${n}: ${done}/${total}`).join('\n') || 'No habit logs this week.'

    const sessionText = sessions.map(s => `[${s.type}] ${s.summary || '(no summary)'}`).join('\n') || 'No sessions this week.'

    const prompt = `You are reviewing ${context.user?.full_name || 'the user'}'s week. Be direct, warm, honest — same voice as their advisor.

SESSIONS THIS WEEK:
${sessionText}

HABIT COMPLETION THIS WEEK:
${habitText}

ROLLING SUMMARY:
${context.rollingSummary?.summary || 'None'}

Write a weekly review with four short sections, plain text with these exact headers:
WINS — what actually went well
SLIPPED — what they let slide, no sugarcoating
PATTERN — one behavioral pattern worth noticing
NEXT WEEK — one concrete focus

Keep the whole thing under 250 words. No preamble, start at WINS.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Claude API error' })

    const summary = data.content[0].text

    // Upsert — one review per user per week
    const { data: saved, error } = await supabase
      .from('weekly_reviews')
      .upsert([{ user_id: userId, week_start: weekStart, summary }], { onConflict: 'user_id,week_start' })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json(saved)
  } catch (err) {
    console.error('Review error:', err)
    res.status(500).json({ error: 'Failed to generate review' })
  }
}

const getLatestReview = async (req, res) => {
  const userId = req.user.id
  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data || null)
}

module.exports = { generateReview, getLatestReview }