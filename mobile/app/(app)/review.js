import { useCallback, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../src/lib/api';
import { colors, type, space, radius, font } from '../../src/theme';

const HEADERS = ['WINS', 'SLIPPED', 'PATTERN', 'NEXT WEEK'];

function parseSummary(text) {
  if (!text) return [];
  const parts = [];
  HEADERS.forEach((h, i) => {
    const start = text.indexOf(h);
    if (start === -1) return;
    const laterIdx = HEADERS.slice(i + 1).map((nh) => text.indexOf(nh)).filter((idx) => idx > start);
    const end = laterIdx.length ? Math.min(...laterIdx) : text.length;
    const body = text.slice(start + h.length, end).replace(/^[\s—:-]+/, '').trim();
    parts.push({ header: h, body });
  });
  return parts;
}

function formatWeek(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export default function Review() {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/review/latest');
      setReview(res || null);
    } catch {
      setReview(null); // no review yet is an expected state
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/api/review/generate');
      setReview(res);
    } catch {}
    setGenerating(false);
  };

  const sections = review ? parseSummary(review.summary) : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={type.h1}>Weekly Review</Text>
            {review ? <Text style={[type.small, { marginTop: 2 }]}>Week of {formatWeek(review.week_start)}</Text> : null}
          </View>
          <Text onPress={() => router.back()} style={[type.small, { paddingVertical: 6 }]}>Dashboard</Text>
        </View>

        <View style={{ height: 1, backgroundColor: colors.line, marginVertical: space.md }} />

        {loading ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: space.xl }} />
        ) : !review ? (
          <View style={{ alignItems: 'center', gap: space.lg, marginTop: space.xl }}>
            <Text style={type.small}>No review yet for this week.</Text>
            <TouchableOpacity onPress={generate} disabled={generating} style={{ backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: radius.sm, opacity: generating ? 0.5 : 1 }}>
              <Text style={{ fontFamily: font.bodyMed, fontSize: 13, color: colors.accentText }}>{generating ? 'Generating…' : 'Generate this week’s review'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.lg, marginBottom: space.md }}>
              {sections.length === 0 ? (
                <Text style={[type.body, { fontSize: 14, lineHeight: 24 }]}>{review.summary}</Text>
              ) : (
                sections.map(({ header, body }) => (
                  <View key={header} style={{ marginBottom: space.md }}>
                    <Text style={[type.label, { fontSize: 11, marginBottom: 8 }]}>{header}</Text>
                    <Text style={[type.body, { fontSize: 14, lineHeight: 24, color: colors.inkSoft }]}>{body}</Text>
                  </View>
                ))
              )}
            </View>
            <TouchableOpacity onPress={generate} disabled={generating} style={{ borderWidth: 1, borderColor: colors.lineStrong, paddingVertical: 12, paddingHorizontal: 24, borderRadius: radius.sm, alignSelf: 'flex-start', opacity: generating ? 0.5 : 1 }}>
              <Text style={{ fontFamily: font.bodyMed, fontSize: 13, color: colors.ink }}>{generating ? 'Regenerating…' : 'Regenerate'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}