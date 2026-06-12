import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { api } from '../lib/api';
import { colors, type, space, radius, font } from '../theme';

// Mirrors the web GoogleCalendarConnect. Auto-syncs on mount when connected.
// onSynced: called after a successful sync so the parent can refresh its list.
export default function GoogleCalendarConnect({ onSynced }) {
  const [status, setStatus] = useState({ connected: false, email: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const runSync = async ({ silent } = {}) => {
    if (!silent) { setBusy(true); setNote(''); }
    try {
      const res = await api.googleSync();
      setNote(`Synced ${res.synced} of ${res.total} events.`);
      onSynced?.();
    } catch {
      if (!silent) setNote('Sync failed.');
    } finally {
      if (!silent) setBusy(false);
    }
  };

  const refreshStatus = async () => {
    const res = await api.googleStatus();
    setStatus(res);
    return res;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.googleStatus();
        if (cancelled) return;
        setStatus(res);
        if (res.connected) await runSync({ silent: true });
      } catch {
        /* leave default */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const connect = async () => {
    setBusy(true);
    setNote('');
    try {
      // App deep link Google will ultimately return to. Linking.createURL picks
      // the right scheme automatically (ailifemanager:// in a build, exp:// in Go).
      const returnUrl = Linking.createURL('google-callback');
      const { url } = await api.googleAuthUrl(returnUrl);

      const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);
      if (result.type === 'success' && result.url) {
        const { queryParams } = Linking.parse(result.url);
        if (queryParams?.google === 'connected') {
          setNote('Google Calendar connected.');
          await refreshStatus();
          await runSync({ silent: true });
        } else {
          setNote('Connection failed. Please try again.');
        }
      } else {
        setNote(''); // user dismissed the browser
      }
    } catch {
      setNote('Could not start connection.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await api.googleDisconnect();
      setStatus({ connected: false, email: null });
      setNote('Disconnected.');
      onSynced?.();
    } catch {
      setNote('Could not disconnect.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, marginBottom: space.lg }}>
      <Text style={[type.label, { fontSize: 11, marginBottom: space.xs }]}>Google Calendar</Text>

      {status.connected ? (
        <>
          <Text style={[type.body, { fontSize: 14, marginBottom: space.sm }]}>Connected as {status.email}</Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <TouchableOpacity onPress={() => runSync()} disabled={busy} style={{ backgroundColor: colors.accent, paddingVertical: 11, paddingHorizontal: 22, borderRadius: radius.sm, opacity: busy ? 0.5 : 1 }}>
              <Text style={{ fontFamily: font.bodyMed, fontSize: 13, color: colors.accentText }}>{busy ? 'Working…' : 'Sync now'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={disconnect} disabled={busy} style={{ borderWidth: 1, borderColor: colors.lineStrong, paddingVertical: 11, paddingHorizontal: 22, borderRadius: radius.sm }}>
              <Text style={{ fontFamily: font.bodyMed, fontSize: 13, color: colors.ink }}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={[type.body, { fontSize: 14, marginBottom: space.sm }]}>Sync your Google Calendar so the advisor can read your real schedule.</Text>
          <TouchableOpacity onPress={connect} disabled={busy} style={{ backgroundColor: colors.accent, paddingVertical: 11, paddingHorizontal: 22, borderRadius: radius.sm, alignSelf: 'flex-start', opacity: busy ? 0.5 : 1 }}>
            <Text style={{ fontFamily: font.bodyMed, fontSize: 13, color: colors.accentText }}>{busy ? 'Redirecting…' : 'Connect Google Calendar'}</Text>
          </TouchableOpacity>
        </>
      )}

      {note ? <Text style={[type.small, { marginTop: space.sm }]}>{note}</Text> : null}
    </View>
  );
}