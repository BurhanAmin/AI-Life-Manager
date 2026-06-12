import { useCallback, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../src/lib/api';
import GoogleCalendarConnect from '../../src/components/GoogleCalendarConnect';
import { colors, type, space, radius, font } from '../../src/theme';

const TYPES = ['exam', 'deadline', 'meeting', 'other'];
const todayStr = () => new Date().toISOString().split('T')[0];
const EMPTY = (d) => ({ title: '', event_date: d, event_time: '', event_end_time: '', type: 'other', notes: '' });

export default function Calendar() {
  const today = todayStr();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY(today));

  const fetchEvents = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/api/calendar?from=${today}`);
      setEvents(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchEvents(); }, [fetchEvents]));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.title.trim() || !form.event_date.trim()) {
      return Alert.alert('Missing info', 'Title and date are required.');
    }
    setSaving(true);
    try {
      // strip empty optional fields so the backend stores nulls, not ""
      const payload = { ...form };
      ['event_time', 'event_end_time', 'notes'].forEach((k) => { if (!payload[k]) delete payload[k]; });
      await api.post('/api/calendar', payload);
      setForm(EMPTY(today));
      setShowForm(false);
      await fetchEvents();
    } catch (e) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Remove event', 'Delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const prev = events;
          setEvents((es) => es.filter((e) => e.id !== id)); // optimistic
          try {
            await api.del(`/api/calendar/${id}`);
          } catch (e) {
            setEvents(prev);
            Alert.alert('Could not delete', e.message);
          }
        },
      },
    ]);
  };

  const Field = ({ label, value, onChangeText, placeholder }) => (
    <View style={{ marginBottom: space.sm }}>
      <Text style={[type.label, { fontSize: 11, marginBottom: 4 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9, fontFamily: font.body, fontSize: 14, color: colors.ink }}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={type.h1}>Calendar</Text>
            <Text style={[type.small, { marginTop: 2 }]}>Upcoming events your advisor can see</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Text onPress={() => router.back()} style={[type.small, { paddingVertical: 6 }]}>Dashboard</Text>
            <TouchableOpacity onPress={() => setShowForm((v) => !v)} style={{ backgroundColor: colors.accent, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.sm }}>
              <Text style={{ fontFamily: font.bodyMed, fontSize: 12, color: colors.accentText }}>{showForm ? 'Cancel' : 'Add event'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: colors.line, marginVertical: space.md }} />

        <GoogleCalendarConnect onSynced={fetchEvents} />

        {showForm && (
          <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, marginBottom: space.lg }}>
            <Field label="Title" value={form.title} onChangeText={(v) => set('title', v)} placeholder="Event name" />

            <Text style={[type.label, { fontSize: 11, marginBottom: 4 }]}>Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.sm }}>
              {TYPES.map((t) => {
                const active = form.type === t;
                return (
                  <TouchableOpacity key={t} onPress={() => set('type', t)} style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: active ? colors.accent : 'transparent' }}>
                    <Text style={{ fontFamily: font.bodyMed, fontSize: 12, color: active ? colors.accentText : colors.ink, textTransform: 'capitalize' }}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Field label="Date" value={form.event_date} onChangeText={(v) => set('event_date', v)} placeholder="YYYY-MM-DD" />
            <Field label="Start time (optional)" value={form.event_time} onChangeText={(v) => set('event_time', v)} placeholder="HH:MM" />
            <Field label="End time (optional)" value={form.event_end_time} onChangeText={(v) => set('event_end_time', v)} placeholder="HH:MM" />
            <Field label="Notes (optional)" value={form.notes} onChangeText={(v) => set('notes', v)} placeholder="Any extra context…" />

            <TouchableOpacity onPress={handleAdd} disabled={saving} style={{ backgroundColor: colors.accent, paddingVertical: 12, borderRadius: radius.sm, alignItems: 'center', marginTop: space.xs, opacity: saving ? 0.5 : 1 }}>
              <Text style={{ fontFamily: font.bodyMed, fontSize: 13, color: colors.accentText }}>{saving ? 'Saving…' : 'Save event'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: space.xl }} />
        ) : error ? (
          <Text style={[type.small, { color: colors.danger }]}>Couldn’t load events: {error}</Text>
        ) : events.length === 0 ? (
          <Text style={type.small}>No upcoming events.</Text>
        ) : (
          events.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: space.md, borderBottomWidth: 1, borderColor: colors.line }}>
              <View style={{ flex: 1, marginRight: space.sm, gap: 3 }}>
                <Text style={[type.label, { fontSize: 10 }]}>{e.type}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 15, color: colors.ink }}>{e.title}</Text>
                {e.notes ? <Text style={type.small}>{e.notes}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <Text style={[type.small, { textAlign: 'right' }]}>
                  {e.event_date}
                  {e.event_time ? ` · ${e.event_time}${e.event_end_time ? `–${e.event_end_time}` : ''}` : ''}
                </Text>
                <Text onPress={() => handleDelete(e.id)} style={{ fontFamily: font.body, fontSize: 12, color: colors.muted, textDecorationLine: 'underline' }}>Remove</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}