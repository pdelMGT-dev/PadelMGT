import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, TouchableOpacity, Image, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/(main)');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.bg}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Decorative rings */}
        <View style={[styles.ring, styles.ringA]} />
        <View style={[styles.ring, styles.ringB]} />

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/logo-white.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Headline */}
        <Text style={styles.headline}>Bienvenido</Text>
        <Text style={styles.sub}>Ingresá a tu cuenta de PadelMGT</Text>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@correo.com"
            placeholderTextColor={Colors.grey500}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.grey500}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />

          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <Button
            label="Iniciar sesión"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>¿No tenés cuenta?</Text>
          <View style={styles.divLine} />
        </View>

        <Button
          label="Crear cuenta"
          onPress={() => router.push('/(auth)/register')}
          variant="outline"
          fullWidth
        />

        <Text style={styles.terms}>
          Al ingresar aceptás los{' '}
          <Text style={styles.termsLink}>Términos de servicio</Text>
          {' '}y la{' '}
          <Text style={styles.termsLink}>Política de privacidad</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.blueDeep },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  ring: {
    position: 'absolute',
    borderRadius: 200,
    borderWidth: 1,
    borderColor: 'rgba(26,78,216,0.2)',
  },
  ringA: { width: 300, height: 300, top: -100, right: -100 },
  ringB: { width: 180, height: 180, top: -40, right: -40, backgroundColor: 'rgba(26,78,216,0.06)' },
  logoWrap: { alignItems: 'center', marginBottom: 36, marginTop: 20 },
  logo: { height: 36, width: 200 },
  headline: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 34,
    color: Colors.white,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.grey700,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.grey100,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.black,
    borderWidth: 1.5,
    borderColor: Colors.grey200,
    fontFamily: 'Inter_400Regular',
  },
  forgotWrap: { alignItems: 'flex-end', marginTop: 10, marginBottom: 16 },
  forgot: { fontSize: 12, color: Colors.blue, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  divText: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  terms: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 24, lineHeight: 18 },
  termsLink: { color: Colors.blueLight },
});
