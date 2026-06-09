const supabase = require('../config/supabase')
const { buildContext } = require('../config/claude')
const { buildSystemPrompt } = require('../config/prompt')

const startSession = async (req, res) => {
  const { type } = req.body
  const userId = req.user.id

  const { data, error } = await supabase
    .from('sessions')
    .insert([{ user_id: userId, type, messages: [] }])
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  // Morning check-in: AI opens the conversation
  if (type === 'morning') {
    try {
      const context = await buildContext(userId)
      context.sessionType = type
      const systemPrompt = buildSystemPrompt(context)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          system: systemPrompt,
          messages: [{ role: 'user', content: '__morning_open__' }]
        })
      })

      const claudeData = await response.json()
      const openingMessage = claudeData.content?.[0]?.text

      if (openingMessage) {
        const messages = [{ role: 'assistant', content: openingMessage }]
        await supabase.from('sessions').update({ messages }).eq('id', data.id)
        return res.status(201).json({ ...data, messages })
      }
    } catch (err) {
      console.error('Morning open error:', err)
    }
  }

  res.status(201).json(data)
}
const detectMood = async (message) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        system: `Classify the emotional/motivational state in the user's message into exactly one of: RECHARGE (drained, low, burnt out, needs rest/gentleness), GENTLE PUSH (flat, drifting, mild stuckness), LOCK IN (driven, focused, wants to go hard), CHECK IN (neutral, informational, no strong signal). Reply with ONLY the label, nothing else.`,
        messages: [{ role: 'user', content: message }]
      })
    })
    const data = await response.json()
    const label = data.content?.[0]?.text?.trim().toUpperCase()
    return ['RECHARGE', 'GENTLE PUSH', 'LOCK IN', 'CHECK IN'].includes(label) ? label : null
  } catch (err) {
    console.error('Mood detect error:', err)
    return null
  }
}

const sendMessage = async (req, res) => {
  const { session_id, message, stream = false } = req.body
  const userId = req.user.id

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', userId)
    .single()

  if (sessionError || !session) return res.status(404).json({ error: 'Session not found' })

  const context = await buildContext(userId)
  context.sessionType = session.type
  context.sensedMood = await detectMood(message)
  const systemPrompt = buildSystemPrompt(context)
  const updatedMessages = [...session.messages, { role: 'user', content: message }]

  // ── Streaming mode ─────────────────────────────────────────
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        stream: true,
        system: systemPrompt,
        messages: updatedMessages
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(500).json({ error: err.error?.message || 'Claude API error' })
    }

    let fullText = ''

    for await (const chunk of response.body) {
      const lines = Buffer.from(chunk).toString('utf8').split('\n').filter(Boolean)
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const data = line.replace('data: ', '').trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            const token = parsed.delta.text
            fullText += token
            res.write(`data: ${JSON.stringify({ token })}\n\n`)
          }
        } catch { /* skip malformed chunks */ }
      }
    }

    // Save to DB after stream completes
    const finalMessages = [...updatedMessages, { role: 'assistant', content: fullText }]
    await supabase.from('sessions').update({ messages: finalMessages }).eq('id', session_id)

    res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`)
    res.end()
    return
  }

  // ── Non-streaming mode (fallback) ──────────────────────────
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: updatedMessages
    })
  })

  const claudeData = await response.json()
  if (!response.ok) return res.status(500).json({ error: claudeData.error?.message || 'Claude API error' })

  const assistantMessage = claudeData.content[0].text
  const finalMessages = [...updatedMessages, { role: 'assistant', content: assistantMessage }]

  await supabase.from('sessions').update({ messages: finalMessages }).eq('id', session_id)
  res.json({ reply: assistantMessage, messages: finalMessages })
}

const endSession = async (req, res) => {
  const { session_id } = req.body
  const userId = req.user.id

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', userId)
    .single()

  if (!session) return res.status(404).json({ error: 'Session not found' })

  const context = await buildContext(userId)
  const conversationText = session.messages
    .map(m => `${m.role === 'user' ? 'User' : 'Advisor'}: ${m.content}`)
    .join('\n')

  const summaryResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Here is a conversation between a user and their AI life advisor:\n\n${conversationText}\n\nExisting summary: ${context.rollingSummary?.summary || 'None'}\n\nUpdate the rolling summary (max 200 words) to include key insights from this session. Also note any behavioral patterns in 1-2 sentences. Respond in JSON: { "summary": "...", "patterns": "..." }`
      }]
    })
  })

  const summaryData = await summaryResponse.json()
  const raw = summaryData.content[0].text.replace(/```json|```/g, '').trim()

  let parsed = {}
  try { parsed = JSON.parse(raw) } catch (e) { parsed = { summary: raw, patterns: '' } }

  await supabase
    .from('rolling_summary')
    .upsert([{ user_id: userId, summary: parsed.summary, patterns: parsed.patterns, last_updated: new Date().toISOString() }], { onConflict: 'user_id' })

  await supabase.from('sessions').update({ summary: parsed.summary }).eq('id', session_id)

  res.json({ message: 'Session ended', summary: parsed.summary })
}

module.exports = { startSession, sendMessage, endSession }