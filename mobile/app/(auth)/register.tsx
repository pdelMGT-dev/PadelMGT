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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Campos incompletos', 'Completá todos los campos. Mínimo 6 caracteres en contraseña.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Cuenta creada',
        'Revisá tu correo para confirmar el registro.',
        [{ text: 'Ok', onPress: () => router.replace('/(auth)/login') }],
      );
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.bg}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.ring, styles.ringA]} />
        <View style={[styles.ring, styles.ringB]} />

        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>Volver</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/logo-white.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.headline}>Crear cuenta</Text>
        <Text style={styles.sub}>Empezá a gestionar tus torneos de pádel</Text>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Luis González"
            placeholderTextColor={Colors.grey500}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
          />

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Correo electrónico</Text>
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
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={Colors.grey500}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <Button
            label="Crear cuenta"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            style={{ marginTop: 20 }}
          />
        </View>

        <Text style={styles.terms}>
          Al registrarte aceptás los{' '}
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
  ring: { position: 'absolute', borderRadius: 200, borderWidth: 1, borderColor: 'rgba(26,78,216,0.2)' },
  ringA: { width: 260, height: 260, top: -80, right: -80 },
  ringB: { width: 160, height: 160, top: -30, right: -30, backgroundColor: 'rgba(26,78,216,0.06)' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backArrow: { color: 'rgba(255,255,255,0.6)', fontSize: 22, lineHeight: 26 },
  backLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '500' },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { height: 32, width: 180 },
  headline: { fontFamily: 'Oswald_700Bold', fontSize: 30, color: Colors.white, letterSpacing: 0.5, textAlign: 'center' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 6, marginBottom: 24 },
  card: { backgroundColor: Colors.white, borderRadius: 24, padding: 22, marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.grey700, marginBottom: 8, letterSpacing: 0.3 },
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
  terms: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4, lineHeight: 18 },
  termsLink: { color: Colors.blueLight },
});
