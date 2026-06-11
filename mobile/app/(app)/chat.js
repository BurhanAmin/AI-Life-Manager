import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { fetch as expoFetch } from 'expo/fetch';
import Constants from 'expo-constants';
import { supabase } from '../../src/lib/supabase';
import { api } from '../../src/lib/api';
import { colors, type, space, radius, font } from '../../src/theme';

const { apiUrl } = Constants.expoConfig.extra;

const LABEL = { morning: 'Morning check-in', evening: 'Evening debrief', chat: 'Open chat' };

// RN can't render HTML; turn **bold** into nested <Text> segments.
function RichText({ content, style }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={{ fontFamily: font.bodyMed }}>{p.slice(2, -2)}</Text>
        ) : (
          <Text key={i}>{p}</Text>
        )
      )}
    </Text>
  );
}

function ThinkingDots() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 18, alignSelf: 'flex-start' }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted, opacity: d }} />
      ))}
    </View>
  );
}

export default function Chat() {
  const params = useLocalSearchParams();
  const chatType = params.type || 'chat';
  const [sessionId, setSessionId] = useState(params.session_id || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(!params.session_id);

  const scrollRef = useRef(null);

  // Start a session on mount if one wasn't passed in.
  useEffect(() => {
    if (sessionId) return;
    (async () => {
      try {
        const data = await api.startSession(chatType);
        setSessionId(data.session_id || data.id);
        const init = data.initialMessages || data.messages;
        if (Array.isArray(init)) setMessages(init);
        else if (data.message) setMessages([{ role: 'assistant', content: data.message }]);
      } catch (e) {
        Alert.alert('Could not start session', e.message);
        router.back();
      } finally {
        setStarting(false);
      }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, streamingText, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !sessionId) return;
    setInput('');
    setLoading(true);
    setStreamingText('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;

      const res = await expoFetch(`${apiUrl}/api/sessions/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ session_id: sessionId, message: text, stream: true }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let raw = '';
      let gotDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        raw += chunk;
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.token !== undefined) setStreamingText((p) => p + parsed.token);
            if (parsed.done) {
              gotDone = true;
              setMessages((prev) => [...prev, { role: 'assistant', content: parsed.fullText }]);
              setStreamingText('');
            }
          } catch {}
        }
      }

      // Fallback if the backend didn't stream SSE (returned plain JSON or text)
      if (!gotDone) {
        let final = '';
        try {
          const j = JSON.parse(raw);
          final = j.fullText || j.reply || j.message || j.content || '';
        } catch {
          final = raw.trim();
        }
        setMessages((prev) => [...prev, { role: 'assistant', content: final || 'Something went wrong. Please try again.' }]);
        setStreamingText('');
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
      setStreamingText('');
    }
    setLoading(false);
  }, [input, loading, sessionId]);

  const endSession = useCallback(async () => {
    setEnding(true);
    try {
      if (sessionId) await api.endSession(sessionId);
    } catch (e) {
      console.warn(e.message);
    }
    router.back();
  }, [sessionId]);

  const shown = streamingText
    ? [...messages, { role: 'assistant', content: streamingText, streaming: true }]
    : messages;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: space.lg, paddingTop: space.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={type.h2}>{LABEL[chatType] || 'Chat'}</Text>
            <Text style={[type.small, { marginTop: 2 }]}>End the session when done — this saves your summary.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Text onPress={() => router.back()} style={[type.small, { paddingVertical: 6 }]}>Dashboard</Text>
            <TouchableOpacity onPress={endSession} disabled={ending} style={{ backgroundColor: colors.accent, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.sm }}>
              <Text style={{ fontFamily: font.bodyMed, fontSize: 12, color: colors.accentText }}>{ending ? 'Saving…' : 'End session'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: colors.line, marginVertical: space.md, marginHorizontal: space.lg }} />

        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md }}>
          {starting && <Text style={[type.small, { textAlign: 'center', marginTop: space.xl }]}>Starting session…</Text>}
          {!starting && shown.length === 0 && !loading && (
            <Text style={[type.small, { textAlign: 'center', marginTop: space.xl }]}>Your advisor is ready. Start the conversation.</Text>
          )}

          {shown.map((m, i) => (
            <View key={i} style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 6 }}>
              <Text style={[type.label, { fontSize: 10 }]}>{m.role === 'user' ? 'You' : 'Advisor'}</Text>
              <View style={{ maxWidth: '85%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 16 }}>
                <RichText content={m.content} style={[type.body, { fontSize: 14, lineHeight: 22, color: m.streaming ? colors.muted : colors.ink }]} />
              </View>
            </View>
          ))}

          {loading && !streamingText && (
            <View style={{ alignItems: 'flex-start', gap: 6 }}>
              <Text style={[type.label, { fontSize: 10 }]}>Advisor</Text>
              <ThinkingDots />
            </View>
          )}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end', borderTopWidth: 1, borderColor: colors.line, padding: space.md, paddingHorizontal: space.lg }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Write a message…"
            placeholderTextColor={colors.muted}
            multiline
            style={{ flex: 1, maxHeight: 120, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: font.body, fontSize: 14, color: colors.ink }}
          />
          <TouchableOpacity onPress={send} disabled={loading || !input.trim()} style={{ backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.sm, opacity: loading || !input.trim() ? 0.4 : 1 }}>
            <Text style={{ fontFamily: font.bodyMed, fontSize: 13, color: colors.accentText }}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}