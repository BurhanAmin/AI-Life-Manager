import { useCallback, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../src/lib/api';
import { colors, type, space, radius, font } from '../../src/theme';

const FILTERS = ['all', 'suggested', 'started', 'finished', 'abandoned'];

export default function Suggestions() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [burnout, setBurnout] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, st, bo] = await Promise.all([
        api.get('/api/suggestions'),
        api.get('/api/suggestions/stats'),
        api.get('/api/burnout/status').catch(() => null),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setStats(st);
      setBurnout(bo);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const refreshStats = async () => {
    try { setStats(await api.get('/api/suggestions/stats')); } catch {}
  };

  const generate = async () => {
    setGenerating(true);
    try {
      await api.post('/api/suggestions/generate', { count: 5 });
      await load();
    } catch (e) {
      Alert.alert('Could not generate', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (id, status) => {
    const prev = items;
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, status } : i))); // optimistic
    try {
      const updated = await api.patch(`/api/suggestions/${id}/status`, { status });
      if (updated && updated.id) setItems((arr) => arr.map((i) => (i.id === id ? updated : i)));
      refreshStats();
    } catch (e) {
      setItems(prev);
      Alert.alert('Update failed', e.message);
    }
  };

  const remove = (id) => {
    Alert.alert('Remove suggestion', 'Delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const prev = items;
          setItems((arr) => arr.filter((i) => i.id !== id));
          try { await api.del(`/api/suggestions/${id}`); refreshStats(); }
          catch (e) { setItems(prev); Alert.alert('Delete failed', e.message); }
        },
      },
    ]);
  };

  const shown = filter === 'all' ? items : items.filter((i) => i.status === filter);

  const ActionLink = ({ label, onPress, muted }) => (
    <Text onPress={onPress} style={{ fontFamily: font.body, fontSize: 12, color: muted ? colors.muted : colors.inkSoft, textDecorationLine: 'underline' }}>
      {label}
    </Text>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={type.h1}>Suggestions</Text>
            <Text style={[type.small, { marginTop: 2 }]}>Things worth your free time</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Text onPress={() => router.back()} style={[type.small, { paddingVertical: 6 }]}>Dashboard</Text>
            <TouchableOpacity onPress={generate} disabled={generating} style={{ backgroundColor: colors.accent, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.sm, opacity: generating ? 0.5 : 1 }}>
              <Text style={{ fontFamily: font.bodyMed, fontSize: 12, color: colors.accentText }}>{generating ? 'Generating…' : 'Generate'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: colors.line, marginVertical: space.md }} />

        {burnout?.recovery && (
          <View style={{ backgroundColor: '#f3f0e8', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, marginBottom: space.md }}>
            <Text style={[type.body, { fontSize: 13, color: colors.inkSoft }]}>
              You’re in a recovery window — these lean toward rest, not output.{burnout.reason ? ` ${burnout.reason}` : ''}
            </Text>
          </View>
        )}

        {stats && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, marginBottom: space.lg }}>
            {[
              ['Total', stats.total],
              ['Finished', stats.finished],
              ['Abandoned', stats.abandoned],
              ['Follow-through', typeof stats.followThroughRate === 'number' ? `${Math.round(stats.followThroughRate)}%` : '—'],
            ].map(([label, value]) => (
              <View key={label}>
                <Text style={{ fontFamily: font.serif, fontSize: 22, color: colors.ink }}>{value ?? 0}</Text>
                <Text style={[type.label, { fontSize: 11 }]}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.md }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accent : 'transparent' }}>
                <Text style={{ fontFamily: font.body, fontSize: 12, color: active ? colors.accentText : colors.muted, textTransform: 'capitalize' }}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: space.xl }} />
        ) : error ? (
          <Text style={[type.small, { color: colors.danger }]}>Couldn’t load: {error}</Text>
        ) : shown.length === 0 ? (
          <Text style={type.small}>Nothing here yet. Hit Generate to get started.</Text>
        ) : (
          shown.map((i) => (
            <View key={i.id} style={{ paddingVertical: space.md, borderBottomWidth: 1, borderColor: colors.line, gap: 6 }}>
              <Text style={[type.label, { fontSize: 10 }]}>{i.type}{i.source ? ` · ${i.source}` : ''}</Text>
              {i.url ? (
                <Text onPress={() => Linking.openURL(i.url)} style={{ fontFamily: font.body, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' }}>{i.title}</Text>
              ) : (
                <Text style={{ fontFamily: font.body, fontSize: 15, color: colors.ink }}>{i.title}</Text>
              )}
              {i.reason ? <Text style={type.small}>{i.reason}</Text> : null}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={[type.label, { fontSize: 10, color: colors.inkSoft }]}>{i.status}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'flex-end', flex: 1, marginLeft: space.sm }}>
                  {i.status === 'suggested' && <ActionLink label="Start" onPress={() => setStatus(i.id, 'started')} />}
                  {(i.status === 'suggested' || i.status === 'started') && <ActionLink label="Finished" onPress={() => setStatus(i.id, 'finished')} />}
                  {(i.status === 'suggested' || i.status === 'started') && <ActionLink label="Abandon" onPress={() => setStatus(i.id, 'abandoned')} />}
                  {i.status === 'abandoned' && <ActionLink label="Restore" onPress={() => setStatus(i.id, 'suggested')} />}
                  <ActionLink label="Remove" muted onPress={() => remove(i.id)} />
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}