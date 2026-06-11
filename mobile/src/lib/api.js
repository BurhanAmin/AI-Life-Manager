import Constants from 'expo-constants';
import { supabase } from './supabase';

const { apiUrl } = Constants.expoConfig.extra;

// Wraps the existing Express backend. JWT comes from the live Supabase session,
// so the same auth that the web app uses carries over unchanged.
async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),

  // Phase 3 endpoints, reused as-is by the mobile client:
  burnoutStatus: () => request('/api/burnout/status'),
  suggestions: (status) => request(`/api/suggestions${status ? `?status=${status}` : ''}`),
  suggestionStats: () => request('/api/suggestions/stats'),
  idleCheck: () => request('/api/idle/check'),
};
