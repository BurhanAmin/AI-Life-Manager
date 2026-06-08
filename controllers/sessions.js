const supabase = require('../config/supabase')
const { buildContext } = require('../config/claude')
const { buildSystemPrompt } = require('../config/prompt')

const startSession = async (req, res) => {
  const { type } = req.body // 'morning', 'evening', or 'chat'
  const userId = req.user.id

  const { data, error } = await supabase
    .from('sessions')
    .insert([{ user_id: userId, type, messages: [] }])
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
}

const sendMessage = async (req, res) => {
  const { session_id, message } = req.body
  const userId = req.user.id

  // 1. Fetch current session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', userId)
    .single()

  if (sessionError || !session) return res.status(404).json({ error: 'Session not found' })

  // 2. Build context + system prompt
  const context = await buildContext(userId)
  const systemPrompt = buildSystemPrompt(context)

  // 3. Append user message to history
  const updatedMessages = [...session.messages, { role: 'user', content: message }]

  // 4. Call Claude API
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

  // 5. Save full updated conversation to DB
  const finalMessages = [...updatedMessages, { role: 'assistant', content: assistantMessage }]

  await supabase
    .from('sessions')
    .update({ messages: finalMessages })
    .eq('id', session_id)

  res.json({ reply: assistantMessage, messages: finalMessages })
}

const endSession = async (req, res) => {
  const { session_id } = req.body
  const userId = req.user.id

  // 1. Fetch the session
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', userId)
    .single()

  if (!session) return res.status(404).json({ error: 'Session not found' })

  // 2. Ask Claude to summarize the session and update rolling summary
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

  // 3. Upsert rolling summary
  await supabase
    .from('rolling_summary')
    .upsert([{ user_id: userId, summary: parsed.summary, patterns: parsed.patterns, last_updated: new Date().toISOString() }], { onConflict: 'user_id' })

  // 4. Mark session with summary
  await supabase
    .from('sessions')
    .update({ summary: parsed.summary })
    .eq('id', session_id)

  res.json({ message: 'Session ended', summary: parsed.summary })
}

module.exports = { startSession, sendMessage, endSession }