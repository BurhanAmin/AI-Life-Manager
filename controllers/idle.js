const supabase = require('../config/supabase')
const { assessBurnout } = require('./burnout')

// Tunables — the "waking window" and what counts as a usable free block.
const DAY_START = 8 * 60 // 08:00
const DAY_END = 22 * 60 // 22:00
const MIN_BLOCK = 45 // minutes — anything shorter isn't worth a suggestion
const DEFAULT_DURATION = 60 // assumed event length when no end time is stored

const toMin = (hhmm) => {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}
const toHHMM = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// Core: returns free blocks for a user on a given date (YYYY-MM-DD).
async function computeFreeBlocks(userId, date) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .eq('event_date', date)
  if (error) throw error

  // Only timed events carve the day. All-day rows (event_time = null), e.g.
  // deadlines, are markers, not time blocks — they don't reduce free time.
  const intervals = (data || [])
    .filter((e) => e.event_time)
    .map((e) => {
      const start = toMin(e.event_time)
      // Uses event_end_time if set; otherwise assumes a default length.
      const end = e.event_end_time
        ? toMin(e.event_end_time)
        : start + DEFAULT_DURATION
      return { start, end: Math.min(end, DAY_END) }
    })
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start)

  // Merge overlapping/adjacent busy intervals.
  const merged = []
  for (const iv of intervals) {
    const last = merged[merged.length - 1]
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end)
    else merged.push({ ...iv })
  }

  // Gaps between busy intervals, within the waking window.
  const blocks = []
  let cursor = DAY_START
  for (const iv of merged) {
    if (iv.start > cursor) blocks.push({ start: cursor, end: iv.start })
    cursor = Math.max(cursor, iv.end)
  }
  if (cursor < DAY_END) blocks.push({ start: cursor, end: DAY_END })

  return blocks
    .map((b) => ({ start: toHHMM(b.start), end: toHHMM(b.end), minutes: b.end - b.start }))
    .filter((b) => b.minutes >= MIN_BLOCK)
}

// GET /api/idle/free-blocks?date=YYYY-MM-DD  (authed)
// Just the raw free blocks for a day.
exports.getFreeBlocks = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10)
    const blocks = await computeFreeBlocks(req.user.id, date)
    res.json({ date, blocks })
  } catch (e) {
    console.error('getFreeBlocks error', e)
    res.status(500).json({ error: 'Could not compute free blocks' })
  }
}

// GET /api/idle/check?date=YYYY-MM-DD  (authed)
// The proactive endpoint: is the user idle, and if so, what to surface.
// Returns the biggest free block + one pending suggestion to offer.
// needsGeneration = true means the suggestion queue is empty (call /generate).
exports.checkIdle = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10)
    const blocks = await computeFreeBlocks(req.user.id, date)

    if (!blocks.length)
      return res.json({ idle: false, blocks: [], suggestion: null })

    const recommendedBlock = blocks.reduce((a, b) =>
      b.minutes > a.minutes ? b : a
    )

    const { data: pending } = await supabase
      .from('suggestions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'suggested')
      .order('created_at', { ascending: false })
      .limit(1)

    const burnout = await assessBurnout(req.user.id)

    res.json({
      idle: true,
      blocks,
      recommendedBlock,
      suggestion: pending?.[0] || null,
      needsGeneration: !(pending && pending.length),
      recovery: burnout.recovery, // true => surface rest, not productivity
      mode: burnout.mode,
    })
  } catch (e) {
    console.error('checkIdle error', e)
    res.status(500).json({ error: 'Idle check failed' })
  }
}

// Exported so the burnout step can reuse the free-block math.
exports._computeFreeBlocks = computeFreeBlocks