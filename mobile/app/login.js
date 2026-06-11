import { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { Button, Field } from '../src/components/ui';
import { colors, type, space, font } from '../src/theme';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password) return Alert.alert('Missing info', 'Enter email and password.');
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('Auth error', error.message);
    else if (mode === 'signup') Alert.alert('Check your inbox', 'Confirm your email, then sign in.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, paddingHorizontal: space.lg, justifyContent: 'center' }}
      >
        <Text style={[type.h1, { marginBottom: space.xs }]}>AI Life Manager</Text>
        <Text style={[type.body, { marginBottom: space.xl }]}>
          {mode === 'signin' ? 'Welcome back.' : 'Create your account.'}
        </Text>

        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />

        <View style={{ marginTop: space.sm }}>
          <Button title={mode === 'signin' ? 'Sign in' : 'Sign up'} onPress={submit} loading={loading} />
        </View>

        <Text
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          style={{ fontFamily: font.body, fontSize: 14, color: colors.muted, marginTop: space.lg, textAlign: 'center' }}
        >
          {mode === 'signin' ? 'No account? Sign up' : 'Have an account? Sign in'}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
