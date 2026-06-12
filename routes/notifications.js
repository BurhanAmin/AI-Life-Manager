

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js'; // adjust path to your admin client
import { requireAuth } from '../middleware/auth.js'; // adjust to your existing middleware

const router = express.Router();

// 1) SQL — run once in Supabase:
//
// create table if not exists push_tokens (
//   id uuid primary key default gen_random_uuid(),
//   user_id uuid not null references auth.users(id) on delete cascade,
//   token text not null,
//   platform text,
//   updated_at timestamptz default now(),
//   unique (user_id, token)
// );

// Mobile app calls this after permission is granted.
router.post('/register-token', requireAuth, async (req, res) => {
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const { error } = await supabaseAdmin
      .from('push_tokens')
      .upsert(
        { user_id: req.user.id, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      );
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

// ---------------------------------------------------------------------------
// 2) Sender helper — import where you trigger notifications (cron, etc.)
// Uses Expo's push API directly, so no extra dependency is required.

export async function sendPushToUser(userId, { title, body, data }) {
  const { data: rows, error } = await supabaseAdmin
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);
  if (error || !rows?.length) return;

  const messages = rows.map((r) => ({
    to: r.token,
    sound: 'default',
    title,
    body,
    data: data || {},
  }));

  const resp = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = await resp.json();

  // Prune tokens Expo reports as no longer registered (e.g. app uninstalled).
  const receipts = result?.data || [];
  const dead = receipts
    .map((rcpt, i) => (rcpt.status === 'error' && rcpt.details?.error === 'DeviceNotRegistered' ? messages[i].to : null))
    .filter(Boolean);
  if (dead.length) {
    await supabaseAdmin.from('push_tokens').delete().in('token', dead);
  }
  return result;
}

