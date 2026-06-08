const supabase = require('../config/supabase')

const createHabit = async (req, res) => {
  const { name } = req.body
  const { data, error } = await supabase
    .from('habits')
    .insert([{ user_id: req.user.id, name }])
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
}

const getHabits = async (req, res) => {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('active', true)

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
}

const logHabit = async (req, res) => {
  const { habit_id, date, completed } = req.body
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert([{ habit_id, user_id: req.user.id, date, completed }], { onConflict: 'habit_id,date' })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
}

const getHabitLogs = async (req, res) => {
  const { from, to } = req.query
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*, habits(name)')
    .eq('user_id', req.user.id)
    .gte('date', from)
    .lte('date', to)

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
}

module.exports = { createHabit, getHabits, logHabit, getHabitLogs }