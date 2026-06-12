import { useCallback, useState } from 'react';
import { ScrollView, View, Text, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/lib/api';
import { Card, Button } from '../../src/components/ui';
import { colors, type, space, font, radius } from '../../src/theme';

const MODE_LABEL = {
  RECHARGE: 'Recharge',
  'GENTLE PUSH': 'Gentle Push',
  'LOCK IN': 'Lock In',
  'CHECK IN': 'Check In',
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [burnout, setBurnout] = useState(null);
  const [idle, setIdle] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // settle independently so one failing endpoint doesn't blank the screen
      const [b, i, s] = await Promise.allSettled([
        api.burnoutStatus(),
        api.idleCheck(),
        api.suggestionStats(),
      ]);
      if (b.status === 'fulfilled') setBurnout(b.value);
      if (i.status === 'fulfilled') setIdle(i.value);
      if (s.status === 'fulfilled') setStats(s.value);
      const firstErr = [b, i, s].find((r) => r.status === 'rejected');
      if (firstErr) setError(firstErr.reason.message);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const block = idle?.biggestBlock || idle?.block;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        <Text style={type.label}>Today</Text>
        <Text style={[type.h1, { marginBottom: space.sm }]}>Dashboard</Text>

        <View style={{ flexDirection: 'row', gap: space.md, marginBottom: space.lg }}>
          <Text onPress={() => router.push('/(app)/habits')} style={{ fontFamily: font.bodyMed, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' }}>Habits</Text>
          <Text onPress={() => router.push('/(app)/calendar')} style={{ fontFamily: font.bodyMed, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' }}>Calendar</Text>
          <Text onPress={() => router.push('/(app)/suggestions')} style={{ fontFamily: font.bodyMed, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' }}>Suggestions</Text>
          <Text onPress={() => router.push('/(app)/review')} style={{ fontFamily: font.bodyMed, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' }}>Review</Text>
        </View>

        {error && (
          <Card style={{ borderColor: colors.danger }}>
            <Text style={[type.small, { color: colors.danger }]}>
              Couldn’t reach the backend: {error}
            </Text>
            <Text style={[type.small, { marginTop: space.xs }]}>
              Check that the server is running and apiUrl in app.json points to it.
            </Text>
          </Card>
        )}

        <Card>
          <Text style={type.label}>Start a session</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
            {[
              { type: 'morning', label: 'Morning' },
              { type: 'evening', label: 'Evening' },
              { type: 'chat', label: 'Open chat' },
            ].map((s) => (
              <TouchableOpacity
                key={s.type}
                onPress={() => router.push({ pathname: '/(app)/chat', params: { type: s.type } })}
                style={{ borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 16 }}
              >
                <Text style={{ fontFamily: font.bodyMed, fontSize: 13, color: colors.ink }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={type.label}>Mode</Text>
          <Text style={[type.h2, { marginVertical: space.xs }]}>
            {burnout ? MODE_LABEL[burnout.mode] || burnout.mode : '—'}
          </Text>
          {burnout?.reason ? <Text style={type.body}>{burnout.reason}</Text> : null}
          {burnout?.recovery ? (
            <Text style={[type.small, { marginTop: space.xs, color: colors.ink }]}>
              Recovery mode — suggestions favor rest over output.
            </Text>
          ) : null}
        </Card>

        <Card>
          <Text style={type.label}>Free time</Text>
          {block ? (
            <Text style={[type.body, { marginTop: space.xs }]}>
              Biggest free block today: {block.start}–{block.end}
              {idle?.pending?.title ? `  ·  Try: ${idle.pending.title}` : ''}
            </Text>
          ) : (
            <Text style={[type.body, { marginTop: space.xs }]}>No open block detected right now.</Text>
          )}
        </Card>

        <Card>
          <Text style={type.label}>Suggestions</Text>
          {stats ? (
            <Text style={[type.body, { marginTop: space.xs }]}>
              {stats.finished ?? 0} finished · {stats.started ?? 0} in progress · {stats.suggested ?? 0} new
              {typeof stats.followThroughRate === 'number'
                ? `\nFollow-through: ${Math.round(stats.followThroughRate * 100)}%`
                : ''}
            </Text>
          ) : (
            <Text style={[type.body, { marginTop: space.xs }]}>—</Text>
          )}
        </Card>

        <View style={{ marginTop: space.lg }}>
          <Text style={[type.small, { marginBottom: space.sm }]}>{user?.email}</Text>
          <Button
            title="Sign out"
            variant="outline"
            onPress={() => signOut().catch((e) => Alert.alert('Error', e.message))}
          />
        </View>

        <Text style={{ fontFamily: font.body, fontSize: 12, color: colors.muted, marginTop: space.xl, textAlign: 'center' }}>
          Phase 4 · screens porting next: Chat → Habits → Calendar → Suggestions → Review
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}