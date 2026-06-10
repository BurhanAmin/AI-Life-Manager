const supabase = require('../config/supabase')

const VALID_STATUS = ['suggested', 'started', 'finished', 'abandoned']

// GET /api/suggestions?status=suggested  (authed)
// Lists the user's suggestions, newest first. Optional ?status filter.
exports.listSuggestions = async (req, res) => {
  try {
    let q = supabase
      .from('suggestions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (req.query.status) {
      if (!VALID_STATUS.includes(req.query.status))
        return res.status(400).json({ error: 'Invalid status filter' })
      q = q.eq('status', req.query.status)
    }

    const { data, error } = await q
    if (error) throw error
    res.json(data)
  } catch (e) {
    console.error('listSuggestions error', e)
    res.status(500).json({ error: 'Could not load suggestions' })
  }
}

// POST /api/suggestions  (authed)
// Body: { type, title, url?, source?, reason? }
exports.createSuggestion = async (req, res) => {
  try {
    const { type, title, url, source, reason } = req.body
    if (!type || !title)
      return res.status(400).json({ error: 'type and title are required' })

    const { data, error } = await supabase
      .from('suggestions')
      .insert({
        user_id: req.user.id,
        type,
        title,
        url: url || null,
        source: source || null,
        reason: reason || null,
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (e) {
    console.error('createSuggestion error', e)
    res.status(500).json({ error: 'Could not create suggestion' })
  }
}

// PATCH /api/suggestions/:id/status  (authed)
// Body: { status: 'started' | 'finished' | 'abandoned' | 'suggested' }
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body
    if (!VALID_STATUS.includes(status))
      return res
        .status(400)
        .json({ error: `status must be one of ${VALID_STATUS.join(', ')}` })

    const { data, error } = await supabase
      .from('suggestions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id) // scope to owner
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Suggestion not found' })
    res.json(data)
  } catch (e) {
    console.error('updateStatus error', e)
    res.status(500).json({ error: 'Could not update status' })
  }
}

// DELETE /api/suggestions/:id  (authed)
exports.deleteSuggestion = async (req, res) => {
  try {
    const { error } = await supabase
      .from('suggestions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)

    if (error) throw error
    res.json({ deleted: true })
  } catch (e) {
    console.error('deleteSuggestion error', e)
    res.status(500).json({ error: 'Could not delete suggestion' })
  }
}

// GET /api/suggestions/stats  (authed)
// Answers the Phase 3 validation question: are suggestions followed or ignored?
// -> { total, suggested, started, finished, abandoned, followThroughRate }
exports.getStats = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('status')
      .eq('user_id', req.user.id)
    if (error) throw error

    const counts = { suggested: 0, started: 0, finished: 0, abandoned: 0 }
    for (const row of data) counts[row.status] = (counts[row.status] || 0) + 1

    const total = data.length
    const acted = counts.started + counts.finished + counts.abandoned
    // Of suggestions the user engaged with at all, how many were finished?
    const followThroughRate = acted
      ? Math.round((counts.finished / acted) * 100)
      : 0

    res.json({ total, ...counts, followThroughRate })
  } catch (e) {
    console.error('getStats error', e)
    res.status(500).json({ error: 'Could not load stats' })
  }
}

// Reusable helper for the course-generation engine (next step).
// Bulk-inserts AI-generated suggestions for a user. Returns inserted rows.
exports.insertSuggestions = async (userId, items = []) => {
  if (!items.length) return []
  const rows = items.map((i) => ({
    user_id: userId,
    type: i.type || 'course',
    title: i.title,
    url: i.url || null,
    source: i.source || null,
    reason: i.reason || null,
  }))
  const { data, error } = await supabase
    .from('suggestions')
    .insert(rows)
    .select()
  if (error) throw error
  return data
}