import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getProfile, PlayerProfile } from '../../lib/api';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';

type MenuItem = { icon: string; label: string; sub?: string; onPress: () => void; danger?: boolean };

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then((p) => { setProfile(p); setLoading(false); });
  }, []);

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const menuItems: MenuItem[] = [
    {
      icon: '🏆',
      label: 'Mis Torneos',
      sub: 'Ver torneos personalizados',
      onPress: () => router.push('/(main)/torneos' as any),
    },
    {
      icon: '▦',
      label: 'Mis Clubes',
      sub: 'Ver clubes asociados',
      onPress: () => router.push('/(main)/clubes' as any),
    },
    {
      icon: '🔒',
      label: 'Cambiar contraseña',
      sub: 'Actualizar credenciales',
      onPress: () => Alert.alert('Próximamente', 'Esta funcionalidad estará disponible pronto.'),
    },
    {
      icon: '📋',
      label: 'Términos y privacidad',
      onPress: () => Alert.alert('Términos', 'Ver en la web: padelmgt.com/terms'),
    },
  ];

  return (
    <View style={styles.root}>
      {/* Dark header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.ring, styles.ringA]} />
        <View style={[styles.ring, styles.ringB]} />
        <Text style={styles.screenLabel}>CUENTA</Text>
        <Text style={styles.screenTitle}>Mi Perfil</Text>
      </View>

      {/* Sheet */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handle} />

        {loading ? (
          <ActivityIndicator color={Colors.blue} size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Avatar + name card */}
            <Card style={styles.avatarCard}>
              <View style={styles.avatarRow}>
                <ProfileAvatar
                  name={profile?.full_name ?? ''}
                  avatarUrl={profile?.avatar_url}
                  size={64}
                />
                <View style={styles.avatarInfo}>
                  <Text style={styles.profileName}>{profile?.full_name ?? 'Usuario'}</Text>
                  <Text style={styles.profileEmail}>{profile?.email ?? ''}</Text>
                  {profile?.phone && (
                    <Text style={styles.profilePhone}>📞 {profile.phone}</Text>
                  )}
                </View>
              </View>
            </Card>

            {/* Account details */}
            {(profile?.birth_date || profile?.phone) && (
              <>
                <Text style={styles.sectionTitle}>DATOS PERSONALES</Text>
                <Card style={styles.detailCard} padded={false}>
                  {profile?.birth_date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>🎂</Text>
                      <View>
                        <Text style={styles.detailLabel}>Fecha de nacimiento</Text>
                        <Text style={styles.detailValue}>
                          {new Date(profile.birth_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                  )}
                  {profile?.phone && (
                    <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: Colors.grey200 }]}>
                      <Text style={styles.detailIcon}>📞</Text>
                      <View>
                        <Text style={styles.detailLabel}>Teléfono</Text>
                        <Text style={styles.detailValue}>{profile.phone}</Text>
                      </View>
                    </View>
                  )}
                </Card>
              </>
            )}

            {/* Menu items */}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>ACCESOS RÁPIDOS</Text>
            <Card style={styles.menuCard} padded={false}>
              {menuItems.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.menuRow, i > 0 && styles.menuRowBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <View style={styles.menuText}>
                    <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                      {item.label}
                    </Text>
                    {item.sub && <Text style={styles.menuSub}>{item.sub}</Text>}
                  </View>
                  <Text style={styles.menuChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </Card>

            {/* Logout */}
            <Button
              label="Cerrar sesión"
              onPress={handleLogout}
              variant="outline"
              fullWidth
              style={styles.logoutBtn}
            />

            <Text style={styles.version}>PadelMGT v1.0</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },

  header: { backgroundColor: Colors.blueDeep, paddingHorizontal: 20, paddingBottom: 20, overflow: 'hidden' },
  ring: { position: 'absolute', borderRadius: 200, borderWidth: 1, borderColor: 'rgba(26,78,216,0.18)' },
  ringA: { width: 200, height: 200, top: -60, right: -60 },
  ringB: { width: 120, height: 120, top: -10, right: -10, backgroundColor: 'rgba(26,78,216,0.05)' },
  screenLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  screenTitle: { fontFamily: 'Oswald_700Bold', fontSize: 26, color: Colors.white, letterSpacing: 0.3 },

  sheet: { flex: 1, backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28 },
  sheetContent: { paddingHorizontal: 16 },
  handle: { width: 38, height: 4, backgroundColor: Colors.grey200, borderRadius: 100, alignSelf: 'center', marginVertical: 12 },

  sectionTitle: { fontSize: 10, fontWeight: '700', color: Colors.grey300, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },

  avatarCard: { marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarInfo: { flex: 1 },
  profileName: { fontFamily: 'Oswald_700Bold', fontSize: 20, color: Colors.black },
  profileEmail: { fontSize: 12, color: Colors.grey500, marginTop: 2 },
  profilePhone: { fontSize: 12, color: Colors.blueLight, marginTop: 4 },

  detailCard: { marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  detailIcon: { fontSize: 18 },
  detailLabel: { fontSize: 10, color: Colors.grey300, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, color: Colors.black, fontWeight: '600', marginTop: 2 },

  menuCard: { marginBottom: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuRowBorder: { borderTopWidth: 1, borderTopColor: Colors.grey200 },
  menuIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: Colors.black },
  menuLabelDanger: { color: Colors.error },
  menuSub: { fontSize: 11, color: Colors.grey500, marginTop: 1 },
  menuChevron: { fontSize: 22, color: Colors.grey300, lineHeight: 26 },

  logoutBtn: { marginTop: 20 },
  version: { textAlign: 'center', fontSize: 11, color: Colors.grey300, marginTop: 16 },
});
