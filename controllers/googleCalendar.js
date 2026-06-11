const crypto = require('crypto')
const { google } = require('googleapis')
const { createOAuthClient, SCOPES } = require('../config/google')
const supabase = require('../config/supabase')

// State is a signed token so the public /callback can trust which user it belongs to.
// Falls back to the service role key if you don't set a dedicated secret.
const STATE_SECRET =
  process.env.OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

function signState(userId) {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, t: Date.now() })
  ).toString('base64url')
  const sig = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(payload)
    .digest('base64url')
  return `${payload}.${sig}`
}

function verifyState(state) {
  if (!state || !state.includes('.')) return null
  const [payload, sig] = state.split('.')
  const expected = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(payload)
    .digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
  if (Date.now() - data.t > 10 * 60 * 1000) return null // 10 min expiry
  return data.uid
}

// Build an OAuth client loaded with the user's stored tokens.
// Persists silently refreshed access tokens back to Supabase.
async function getClientForUser(userId) {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error || !data) return null

  const client = createOAuthClient()
  client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.expiry_date,
    token_type: data.token_type,
    scope: data.scope,
  })

  client.on('tokens', async (t) => {
    const update = { updated_at: new Date().toISOString() }
    if (t.access_token) update.access_token = t.access_token
    if (t.expiry_date) update.expiry_date = t.expiry_date
    if (t.refresh_token) update.refresh_token = t.refresh_token // only on re-consent
    await supabase.from('google_tokens').update(update).eq('user_id', userId)
  })

  return client
}

// GET /api/google/auth-url  (authed) -> { url }
exports.getAuthUrl = async (req, res) => {
  try {
    const client = createOAuthClient()
    const url = client.generateAuthUrl({
      access_type: 'offline', // request a refresh token
      prompt: 'consent', // force refresh token every time (safe for re-connects)
      scope: SCOPES,
      state: signState(req.user.id),
    })
    res.json({ url })
  } catch (e) {
    console.error('auth-url error', e)
    res.status(500).json({ error: 'Could not build auth URL' })
  }
}

// GET /api/google/callback  (PUBLIC - Google redirects the browser here)
exports.oauthCallback = async (req, res) => {
  try {
    const userId = verifyState(req.query.state)
    if (!userId)
      return res.redirect(`${CLIENT_URL}/calendar?google=error&reason=state`)

    const client = createOAuthClient()
    const { tokens } = await client.getToken(req.query.code)
    client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data: profile } = await oauth2.userinfo.get()

    const row = {
      user_id: userId,
      access_token: tokens.access_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
      connected_email: profile.email,
      updated_at: new Date().toISOString(),
    }
    // Only overwrite the refresh token if Google returned a new one.
    if (tokens.refresh_token) row.refresh_token = tokens.refresh_token

    await supabase
      .from('google_tokens')
      .upsert(row, { onConflict: 'user_id' })

    res.redirect(`${CLIENT_URL}/calendar?google=connected`)
  } catch (e) {
    console.error('google callback error', e)
    res.redirect(`${CLIENT_URL}/calendar?google=error`)
  }
}

// GET /api/google/status  (authed) -> { connected, email }
exports.status = async (req, res) => {
  const { data } = await supabase
    .from('google_tokens')
    .select('connected_email')
    .eq('user_id', req.user.id)
    .single()
  res.json({ connected: !!data, email: data?.connected_email || null })
}

// POST /api/google/sync  (authed) -> { synced, total }
// Pulls the next 14 days of primary-calendar events into calendar_events.
exports.syncCalendar = async (req, res) => {
  try {
    const client = await getClientForUser(req.user.id)
    if (!client)
      return res.status(400).json({ error: 'Google Calendar not connected' })

    const calendar = google.calendar({ version: 'v3', auth: client })
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    })

    const events = data.items || []
    let synced = 0

    for (const ev of events) {
      if (ev.status === 'cancelled') continue
      const start = ev.start?.dateTime || ev.start?.date
      if (!start) continue
      const isAllDay = !ev.start?.dateTime

      const row = {
        user_id: req.user.id,
        title: ev.summary || '(no title)',
        event_date: start.slice(0, 10),
        event_time: isAllDay ? null : ev.start.dateTime.slice(11, 16),
        event_end_time:
          isAllDay || !ev.end?.dateTime ? null : ev.end.dateTime.slice(11, 16),
        type: 'google',
        notes: ev.location || null,
        source: 'google',
        google_event_id: ev.id,
      }

      const { error } = await supabase
        .from('calendar_events')
        .upsert(row, { onConflict: 'user_id,google_event_id' })
      if (error) console.error('row upsert failed:', error, '\nrow was:', row)
      if (!error) synced++
    }

    res.json({ synced, total: events.length })
  } catch (e) {
    console.error('sync error', e)
    res.status(500).json({ error: 'Sync failed' })
  }
}

// POST /api/google/disconnect  (authed)
exports.disconnect = async (req, res) => {
  const client = await getClientForUser(req.user.id)
  if (client) {
    try {
      await client.revokeCredentials()
    } catch (_) {
      /* token may already be invalid; ignore */
    }
  }
  await supabase.from('google_tokens').delete().eq('user_id', req.user.id)
  // Optional: also clear synced google events
  await supabase
    .from('calendar_events')
    .delete()
    .eq('user_id', req.user.id)
    .eq('source', 'google')
  res.json({ disconnected: true })
}

// GET /api/google/freebusy?date=YYYY-MM-DD  (authed) -> { busy: [{start,end}], timeMin, timeMax }
// Used by Phase 3 idle detection to find free blocks in a day.
exports.getFreeBusy = async (req, res) => {
  try {
    const client = await getClientForUser(req.user.id)
    if (!client)
      return res.status(400).json({ error: 'Google Calendar not connected' })

    const calendar = google.calendar({ version: 'v3', auth: client })
    const base = req.query.date ? new Date(req.query.date) : new Date()
    const dayStart = new Date(base)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(base)
    dayEnd.setHours(23, 59, 59, 999)

    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: 'primary' }],
      },
    })

    res.json({
      busy: data.calendars?.primary?.busy || [],
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
    })
  } catch (e) {
    console.error('freebusy error', e)
    res.status(500).json({ error: 'Free/busy lookup failed' })
  }
}

// Exported for reuse by the suggestions/idle-detection controller later.
exports._getClientForUser = getClientForUser