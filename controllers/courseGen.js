const Anthropic = require('@anthropic-ai/sdk')
const supabase = require('../config/supabase')
const { insertSuggestions } = require('./suggestions')
const { assessBurnout } = require('./burnout')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6' // locked model string — see Phase 1 handoff

// POST /api/suggestions/generate  (authed)
// Body (optional): { count }  default 5, clamped 1..10
// Uses the user's goals + interests + rolling summary to generate fresh
// course/video suggestions and stores them in the suggestions table.
exports.generateSuggestions = async (req, res) => {
  try {
    const count = Math.min(Math.max(parseInt(req.body?.count) || 5, 1), 10)

    // Gather context defensively — pass whatever exists to Claude.
    const [userRes, goalsRes, summaryRes, recentRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', req.user.id).single(),
      supabase.from('goals').select('*').eq('user_id', req.user.id),
      supabase
        .from('rolling_summary')
        .select('*')
        .eq('user_id', req.user.id)
        .maybeSingle(),
      supabase
        .from('suggestions')
        .select('title')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    const user = userRes.data || {}
    const goals = goalsRes.data || []
    const summary = summaryRes.data || null
    const recentTitles = (recentRes.data || []).map((r) => r.title)

    // If the user is in a recovery state, suggest rest — not study.
    const burnout = await assessBurnout(req.user.id)

    const productivityPrompt = [
      'You suggest learning resources (courses and videos) for a personal life-management app.',
      "Suggestions must connect to the user's actual goals and interests — never generic filler.",
      '',
      'Return ONLY a JSON array. No prose, no markdown, no code fences. Each item:',
      '{',
      '  "type": "course" | "video",',
      '  "title": short specific resource title,',
      '  "source": "youtube" | "coursera" | "udemy" | "other",',
      '  "url": a SEARCH url on that platform (e.g. https://www.youtube.com/results?search_query=...',
      '         or https://www.coursera.org/search?query=...). Do NOT invent specific video/course IDs.',
      '  "reason": one sentence tying it to a specific goal or interest of this user',
      '}',
      `Return exactly ${count} items. Vary type and source. Do not repeat anything in the AVOID list.`,
    ].join('\n')

    const recoveryPrompt = [
      'This user is showing signs of needing recovery, not more output.',
      'Suggest restful, restorative ACTIVITIES that fit their interests — e.g. a walk,',
      'a hobby, light reading, time with people, a proper break. Do NOT suggest courses or study.',
      '',
      'Return ONLY a JSON array. No prose, no markdown, no code fences. Each item:',
      '{',
      '  "type": "activity",',
      '  "title": short specific restful activity,',
      '  "source": "other",',
      '  "url": null,',
      '  "reason": one warm sentence that frames this as earned rest, tied to their situation',
      '}',
      `Return exactly ${count} items. Do not repeat anything in the AVOID list.`,
    ].join('\n')

    const systemPrompt = burnout.recovery ? recoveryPrompt : productivityPrompt

    const userPrompt = [
      `USER PROFILE:\n${JSON.stringify(user, null, 2)}`,
      `GOALS:\n${JSON.stringify(goals, null, 2)}`,
      summary
        ? `RECENT PATTERNS / ROLLING SUMMARY:\n${JSON.stringify(summary, null, 2)}`
        : 'RECENT PATTERNS: none yet',
      recentTitles.length
        ? `AVOID (already suggested):\n- ${recentTitles.join('\n- ')}`
        : 'AVOID: nothing yet',
    ].join('\n\n')

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .replace(/```json|```/g, '')
      .trim()

    let items
    try {
      items = JSON.parse(raw)
    } catch (_) {
      console.error('generateSuggestions: bad JSON from model:', raw)
      return res.status(502).json({ error: 'Model returned unparseable output' })
    }

    if (!Array.isArray(items)) items = []
    // Keep only well-formed items
    items = items
      .filter((i) => i && i.title)
      .map((i) => ({
        type: ['video', 'activity'].includes(i.type) ? i.type : 'course',
        title: String(i.title).slice(0, 200),
        url: i.url || null,
        source: i.source || 'other',
        reason: i.reason || null,
      }))

    if (!items.length)
      return res.status(502).json({ error: 'No valid suggestions generated' })

    const inserted = await insertSuggestions(req.user.id, items)
    res.status(201).json(inserted)
  } catch (e) {
    console.error('generateSuggestions error', e)
    res.status(500).json({ error: 'Could not generate suggestions' })
  }
}