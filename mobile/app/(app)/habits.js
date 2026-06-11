import { useCallback, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../src/lib/api';
import { colors, type, space, radius, font } from '../../src/theme';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const today = todayStr();

  const load = useCallback(async () => {
    setError(null);
    try {
      const [habitsRes, logsRes] = await Promise.all([
        api.get('/api/habits'),
        api.get(`/api/habits/logs?from=${today}&to=${today}`),
      ]);
      setHabits(Array.isArray(habitsRes) ? habitsRes : []);
      const map = {};
      (Array.isArray(logsRes) ? logsRes : []).forEach((l) => { map[l.habit_id] = l.completed; });
      setLogs(map);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const toggle = useCallback(async (habitId) => {
    const newVal = !logs[habitId];
    setLogs((prev) => ({ ...prev, [habitId]: newVal })); // optimistic
    try {
      await api.post('/api/habits/log', { habit_id: habitId, date: today, completed: newVal });
    } catch (e) {
      setLogs((prev) => ({ ...prev, [habitId]: !newVal })); // revert on failure
    }
  }, [logs, today]);

  const done = Object.values(logs).filter(Boolean).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={type.h1}>Habits</Text>
            <Text style={[type.small, { marginTop: 2 }]}>{today} — {done} of {habits.length} complete</Text>
          </View>
          <Text onPress={() => router.back()} style={[type.small, { paddingVertical: 6 }]}>Dashboard</Text>
        </View>

        <View style={{ height: 1, backgroundColor: colors.line, marginVertical: space.md }} />

        {loading ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: space.xl }} />
        ) : error ? (
          <Text style={[type.small, { color: colors.danger }]}>Couldn’t load habits: {error}</Text>
        ) : habits.length === 0 ? (
          <Text style={[type.small]}>No habits yet. Add them during onboarding.</Text>
        ) : (
          habits.map((h) => {
            const isDone = !!logs[h.id];
            return (
              <View key={h.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.md, borderBottomWidth: 1, borderColor: colors.line }}>
                <Text style={{ fontFamily: font.body, fontSize: 15, color: isDone ? colors.muted : colors.ink, textDecorationLine: isDone ? 'line-through' : 'none', flex: 1, marginRight: space.sm }}>
                  {h.name}
                </Text>
                <TouchableOpacity
                  onPress={() => toggle(h.id)}
                  style={{
                    paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1,
                    borderColor: colors.lineStrong,
                    backgroundColor: isDone ? colors.accent : 'transparent',
                  }}
                >
                  <Text style={{ fontFamily: font.bodyMed, fontSize: 12, color: isDone ? colors.accentText : colors.ink }}>
                    {isDone ? 'Done' : 'Mark done'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}