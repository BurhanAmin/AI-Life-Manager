const supabase = require('../config/supabase')

const createGoal = async (req, res) => {
  const { area, description } = req.body
  const { data, error } = await supabase
    .from('goals')
    .insert([{ user_id: req.user.id, area, description }])
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
}

const getGoals = async (req, res) => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', req.user.id)

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
}

const deleteGoal = async (req, res) => {
  const { id } = req.params
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ message: 'Goal deleted' })
}

module.exports = { createGoal, getGoals, deleteGoal }