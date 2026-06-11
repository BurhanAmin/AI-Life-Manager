import { Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { colors, type, space, radius, font } from '../theme';

export function Button({ title, onPress, loading, variant = 'solid', disabled }) {
  const solid = variant === 'solid';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={{
        backgroundColor: solid ? colors.accent : 'transparent',
        borderWidth: solid ? 0 : 1,
        borderColor: colors.lineStrong,
        paddingVertical: 14,
        borderRadius: radius.sm,
        alignItems: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={solid ? colors.accentText : colors.ink} />
      ) : (
        <Text style={{ fontFamily: font.bodyMed, fontSize: 15, color: solid ? colors.accentText : colors.ink }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function Field({ label, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize }) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={[type.label, { marginBottom: space.xs }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        style={{
          borderBottomWidth: 1,
          borderColor: colors.lineStrong,
          paddingVertical: 8,
          fontFamily: font.body,
          fontSize: 16,
          color: colors.ink,
        }}
      />
    </View>
  );
}

export function Card({ children, style }) {
  return (
    <View
      style={[
        { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, marginBottom: space.sm },
        style,
      ]}
    >
      {children}
    </View>
  );
}
