import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getPersonalizadoTournaments, getPricing, getProfile, PlayerProfile, PricingConfig, Tournament } from '../../lib/api';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { Card } from '../../components/ui/Card';
import { Colors } from '../../constants/colors';

const QUICK_ACTIONS = [
  { id: 'torneos', label: 'Torneos', emoji: '🏆', route: '/(main)/torneos' },
  { id: 'clubes',  label: 'Clubes',  emoji: '▦',  route: '/(main)/clubes' },
  { id: 'familia', label: 'Familia', emoji: '👥', route: null },
  { id: 'stats',   label: 'Stats',   emoji: '📊', route: null },
] as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [p, t, px] = await Promise.all([
      getProfile(),
      getPersonalizadoTournaments(),
      getPricing(),
    ]);
    setProfile(p);
    setTournaments(t.slice(0, 3));
    setPricing(px);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.blue} size="large" />
      </View>
    );
  }

  const tiers = pricing?.tiers ?? [
    { id: 't1', maxTeams: 8,   price: 9 },
    { id: 't2', maxTeams: 16,  price: 19 },
    { id: 't3', maxTeams: 32,  price: 29 },
    { id: 't4', maxTeams: null, price: 49 },
  ];

  return (
    <View style={styles.root}>
      {/* ── Dark header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.ring, styles.ringA]} />
        <View style={[styles.ring, styles.ringB]} />

        {/* Logo row */}
        <View style={styles.headerRow}>
          <Image source={require('../../assets/logo-white.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerRight}>
            <View style={styles.notifWrap}>
              <Text style={styles.notifIcon}>🔔</Text>
              <View style={styles.notifDot} />
            </View>
            <ProfileAvatar
              name={profile?.full_name}
              avatarUrl={profile?.avatar_url}
              online
            />
          </View>
        </View>

        {/* Stats glass card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsGreeting}>Bienvenido de vuelta</Text>
          <Text style={styles.statsName}>{profile?.full_name ?? 'Jugador'}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{tournaments.length}</Text>
              <Text style={styles.statLbl}>Torneos</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>—</Text>
              <Text style={styles.statLbl}>Equipos</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>★ —</Text>
              <Text style={styles.statLbl}>Rating</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Bottom sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handle} />

        {/* Quick actions */}
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.actionItem}
              activeOpacity={0.75}
              onPress={() => a.route ? router.push(a.route as any) : null}
            >
              <Text style={styles.actionEmoji}>{a.emoji}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Torneo Personalizado pricing card */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingGlow} />
          <Text style={styles.pricingEyebrow}>⚡ Torneo Personalizado</Text>
          <Text style={styles.pricingTitle}>Abrí la inscripción</Text>
          <View style={styles.tiersRow}>
            {tiers.map((tier, i) => {
              const isHighlight = i === 2;
              const label = tier.maxTeams ? `≤${tier.maxTeams}` : `+${tiers[tiers.length - 2]?.maxTeams ?? 32}`;
              return (
                <View key={tier.id} style={[styles.tier, isHighlight && styles.tierHL]}>
                  <Text style={[styles.tierPrice, isHighlight && styles.tierPriceHL]}>${tier.price}</Text>
                  <Text style={[styles.tierLbl, isHighlight && styles.tierLblHL]}>{label} eq.</Text>
                </View>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.createTournamentBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(main)/torneos')}
          >
            <Text style={styles.createTournamentBtnText}>Crear torneo →</Text>
          </TouchableOpacity>
        </View>

        {/* Recent tournaments */}
        {tournaments.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Mis torneos recientes</Text>
              <TouchableOpacity onPress={() => router.push('/(main)/torneos')}>
                <Text style={styles.sectionLink}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            {tournaments.map((t) => (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/(main)/torneos/${t.id}` as any)}
              >
                <Card style={styles.tournamentCard} padded={false}>
                  <View style={styles.tournamentCardInner}>
                    <View style={styles.tournamentIcon}>
                      <Text style={{ fontSize: 22 }}>🏆</Text>
                    </View>
                    <View style={styles.tournamentInfo}>
                      <Text style={styles.tournamentName} numberOfLines={1}>{t.name}</Text>
                      <Text style={styles.tournamentMeta}>
                        {t.format} · {t.code ? `#${t.code}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, t.status === 'open' && styles.statusChipOpen]}>
                      <Text style={[styles.statusChipText, t.status === 'open' && styles.statusChipTextOpen]}>
                        {t.status === 'open' ? 'ABIERTO' : t.status === 'draft' ? 'BORRADOR' : t.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Logout (bottom) */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },

  // Header
  header: { backgroundColor: Colors.blueDeep, paddingHorizontal: 20, paddingBottom: 16, overflow: 'hidden' },
  ring: { position: 'absolute', borderRadius: 200, borderWidth: 1, borderColor: 'rgba(26,78,216,0.18)' },
  ringA: { width: 220, height: 220, top: -70, right: -70 },
  ringB: { width: 130, height: 130, top: -20, right: -20, backgroundColor: 'rgba(26,78,216,0.05)' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logo: { height: 26, width: 140 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifWrap: { position: 'relative' },
  notifIcon: { fontSize: 20, opacity: 0.4 },
  notifDot: { position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.blueLight, borderWidth: 1.5, borderColor: Colors.blueDeep },

  // Stats card
  statsCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 22, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  statsGreeting: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.38)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  statsName: { fontFamily: 'Oswald_700Bold', fontSize: 20, color: Colors.white, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 8, alignItems: 'center' },
  statVal: { fontFamily: 'Oswald_700Bold', fontSize: 20, color: Colors.blueLight, lineHeight: 22 },
  statLbl: { fontSize: 8, fontWeight: '600', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 2, letterSpacing: 0.5 },

  // Sheet
  sheet: { flex: 1, backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28 },
  sheetContent: { paddingHorizontal: 16, paddingTop: 14 },
  handle: { width: 38, height: 4, backgroundColor: Colors.grey200, borderRadius: 100, alignSelf: 'center', marginBottom: 16 },

  // Quick actions
  actionsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  actionItem: { flex: 1, backgroundColor: Colors.blue50, borderRadius: 16, paddingVertical: 11, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(26,78,216,0.07)' },
  actionEmoji: { fontSize: 22 },
  actionLabel: { fontSize: 8, fontWeight: '600', color: Colors.grey500, letterSpacing: 0.3 },

  // Pricing
  pricingCard: { backgroundColor: Colors.blueDeep, borderRadius: 20, padding: 14, marginBottom: 18, overflow: 'hidden' },
  pricingGlow: { position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.blueLight, opacity: 0.1 },
  pricingEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: Colors.blueLight, marginBottom: 3, textTransform: 'uppercase' },
  pricingTitle: { fontFamily: 'Oswald_700Bold', fontSize: 16, color: Colors.white, marginBottom: 10 },
  tiersRow: { flexDirection: 'row', gap: 5, marginBottom: 10 },
  tier: { flex: 1, borderRadius: 10, padding: 7, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tierHL: { backgroundColor: Colors.blueLight, borderColor: Colors.blueLight },
  tierPrice: { fontFamily: 'Oswald_700Bold', fontSize: 15, color: Colors.white, lineHeight: 17 },
  tierPriceHL: { color: Colors.blueDeep },
  tierLbl: { fontSize: 7, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  tierLblHL: { color: 'rgba(10,22,56,0.6)' },
  createTournamentBtn: { backgroundColor: Colors.blue, borderRadius: 100, paddingVertical: 10, alignItems: 'center' },
  createTournamentBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },

  // Tournaments
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.black },
  sectionLink: { fontSize: 11, fontWeight: '600', color: Colors.blue },
  tournamentCard: { marginBottom: 8 },
  tournamentCardInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  tournamentIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.blue50, alignItems: 'center', justifyContent: 'center' },
  tournamentInfo: { flex: 1 },
  tournamentName: { fontSize: 13, fontWeight: '700', color: Colors.black },
  tournamentMeta: { fontSize: 10, color: Colors.grey500, marginTop: 2 },
  statusChip: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: Colors.grey100, borderWidth: 1, borderColor: Colors.grey200 },
  statusChipOpen: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  statusChipText: { fontSize: 9, fontWeight: '700', color: Colors.grey500, letterSpacing: 0.5 },
  statusChipTextOpen: { color: Colors.green },

  // Logout
  logoutBtn: { marginTop: 24, alignItems: 'center', paddingVertical: 12 },
  logoutText: { fontSize: 13, color: Colors.grey500, fontWeight: '500' },
});
