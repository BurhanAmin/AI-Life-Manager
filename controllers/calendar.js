const supabase = require('../config/supabase')

const createEvent = async (req, res) => {
  const { title, event_date, event_time, event_end_time, type, notes } = req.body
  const { data, error } = await supabase
    .from('calendar_events')
    .insert([
      {
        user_id: req.user.id,
        title,
        event_date,
        event_time,
        event_end_time: event_end_time || null,
        type,
        notes,
      },
    ])
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
}

const getEvents = async (req, res) => {
  const { from, to } = req.query
  let query = supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', req.user.id)
    .order('event_date', { ascending: true })

  if (from) query = query.gte('event_date', from)
  if (to) query = query.lte('event_date', to)

  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
}

const deleteEvent = async (req, res) => {
  const { id } = req.params
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ message: 'Event deleted' })
}

module.exports = { createEvent, getEvents, deleteEvent }