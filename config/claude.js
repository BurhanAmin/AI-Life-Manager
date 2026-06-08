const supabase = require('./supabase')

const buildContext = async (userId) => {
  const today = new Date().toISOString().split('T')[0]
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [userRes, goalsRes, habitsRes, logsRes, calendarRes, summaryRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('goals').select('*').eq('user_id', userId),
    supabase.from('habits').select('*').eq('user_id', userId).eq('active', true),
    supabase.from('habit_logs').select('*, habits(name)').eq('user_id', userId).gte('date', twoWeeksAgo).lte('date', today),
    supabase.from('calendar_events').select('*').eq('user_id', userId).gte('event_date', today).order('event_date', { ascending: true }).limit(10),
    supabase.from('rolling_summary').select('*').eq('user_id', userId).single()
  ])

  return {
    user: userRes.data,
    goals: goalsRes.data,
    habits: habitsRes.data,
    habitLogs: logsRes.data,
    upcomingEvents: calendarRes.data,
    rollingSummary: summaryRes.data
  }
}

module.exports = { buildContext }