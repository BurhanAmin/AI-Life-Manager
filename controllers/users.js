const supabase = require('../config/supabase')

const createUser = async (req, res) => {
  const { full_name, life_situation } = req.body
  const user_id = req.user.id

  const { data, error } = await supabase
    .from('users')
    .insert([{ id: user_id, full_name, life_situation }])
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
}

const getUser = async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single()

  if (error) return res.status(404).json({ error: 'User not found' })
  res.json(data)
}

module.exports = { createUser, getUser }