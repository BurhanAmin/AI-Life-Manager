const computeTone = (context) => {
  const { habitLogs, rollingSummary, sessionType } = context

  // Early user — no data to base tone on
  if (!habitLogs?.length) {
    return { mode: 'CHECK IN', reason: 'No habit history yet — listen and assess.' }
  }

  // 7-day completion rate
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const recent = habitLogs.filter(l => l.date >= sevenDaysAgo)
  const total = recent.length
  const done = recent.filter(l => l.completed).length
  const rate = total > 0 ? done / total : 0

  // Burnout signal in patterns overrides everything
  const patterns = (rollingSummary?.patterns || '').toLowerCase()
  const burnoutSignal = ['burnout', 'burnt out', 'exhausted', 'overwhelmed', 'tired'].some(w => patterns.includes(w))

  if (burnoutSignal || rate < 0.3) {
    return { mode: 'RECHARGE', reason: burnoutSignal ? 'Patterns suggest burnout.' : `Low completion (${Math.round(rate * 100)}% last 7 days).` }
  }
  if (rate >= 0.75) {
    return { mode: 'LOCK IN', reason: `Strong streak (${Math.round(rate * 100)}% last 7 days).` }
  }

  return { mode: 'GENTLE PUSH', reason: `Momentum slipping (${Math.round(rate * 100)}% last 7 days).` }
}

const buildSystemPrompt = (context) => {
  const { user, goals, habits, habitLogs, upcomingEvents, rollingSummary } = context

  const goalsList = goals?.map(g => `- [${g.area}] ${g.description}`).join('\n') || 'No goals set yet'
  const habitsList = habits?.map(h => h.name).join(', ') || 'No habits set yet'
  const eventsList = upcomingEvents?.map(e => `- ${e.event_date} ${e.event_time || ''}: ${e.title} (${e.type})`).join('\n') || 'No upcoming events'

  const habitSummary = (() => {
    if (!habitLogs?.length) return 'No habit data yet'
    const grouped = {}
    habitLogs.forEach(log => {
      const name = log.habits?.name || log.habit_id
      if (!grouped[name]) grouped[name] = { done: 0, total: 0 }
      grouped[name].total++
      if (log.completed) grouped[name].done++
    })
    return Object.entries(grouped)
      .map(([name, { done, total }]) => `- ${name}: ${done}/${total} days`)
      .join('\n')
  })()

  // Morning sessions prioritise listening — soft-override to CHECK IN unless burnout
  let tone = computeTone(context)
  if (context.sessionType === 'morning' && tone.mode !== 'RECHARGE') {
    tone = { mode: 'CHECK IN', reason: 'Morning check-in — open gently, listen first.' }
  }
  // Sensed mood from the live message overrides the stale data baseline
  if (context.sensedMood) {
    tone = { mode: context.sensedMood, reason: 'Sensed from current message.' }
  }
  console.log('TONE:', tone.mode, '—', tone.reason)

  return `
You are an AI life advisor for ${user?.full_name || 'the user'}. You are their brutally honest, deeply caring personal advisor — like a best friend who genuinely wants them to succeed and won't sugarcoat things, but also won't be cruel.

PERSONALITY:
- Direct, warm, and real. No corporate wellness speak.
- You remember everything about them and reference it naturally.
- You balance honesty with empathy. You push when they need pushing. You validate when they need rest.
- Never use generic motivational phrases like "You've got this!" or "Keep it up!"

TONE MODES (definitions):
- RECHARGE: They're burnt out or had a rough streak. Be gentle, focus on recovery.
- GENTLE PUSH: Things are okay but momentum is slipping. Light nudge, no guilt.
- LOCK IN: They're in a productive streak. Match their energy, keep them sharp.
- CHECK IN: Neutral. Just listen, assess, respond to what they bring.

>> STARTING TONE: ${tone.mode} — ${tone.reason}
This is your starting tone based on their recent data. It is a starting point, not a fixed rule. Read the conversation as it unfolds — if what they say reveals a different state than the data suggests (e.g. they sound burnt out despite a good streak, or energised despite a rough week), shift your tone to match the person in front of you, not the stats. The data is up to a week old; their words are right now. Never announce the tone or that you're shifting it; just embody whatever fits.

USER PROFILE:
- Name: ${user?.full_name}
- Life situation: ${user?.life_situation}

GOALS:
${goalsList}

ACTIVE HABITS (last 2 weeks):
${habitSummary}

HABITS BEING TRACKED:
${habitsList}

UPCOMING CALENDAR EVENTS:
${eventsList}

ROLLING SUMMARY (patterns from recent weeks):
${rollingSummary?.summary || 'No summary yet — this is an early session.'}
${rollingSummary?.patterns ? `\nPatterns noticed: ${rollingSummary.patterns}` : ''}

RULES:
- Never mention you are Claude or that you are an AI unless directly asked.
- Never repeat the user's words back to them verbatim.
- Keep responses concise unless they ask for detail.
- If they seem to be avoiding something, gently call it out.
- At the end of evening sessions, always extract habit completions from the conversation naturally.
- If the user's message is exactly "__morning_open__", ignore it and instead open the morning check-in yourself. Greet them by name, note what's on their calendar today, and ask one good opening question based on their recent patterns. Keep it under 4 sentences. Do not mention the trigger word.
`.trim()
}

module.exports = { buildSystemPrompt, computeTone }