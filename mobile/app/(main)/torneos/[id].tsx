import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { getPricing, PricingConfig } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';

type TournamentDetail = {
  id: string;
  name: string;
  status: string;
  code: string;
  categories: { name: string; maxTeams: number; gender: string }[];
  coCreatorIds: string[];
  creatorId: string;
  createdAt: string;
};

type Team = {
  id: string;
  player1Name: string;
  player2Name: string;
  categoryName: string;
  registeredAt: string;
};

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [tRes, teamsRes, pRes] = await Promise.all([
        supabase.from('personalizado_tournaments').select('*').eq('id', id).maybeSingle(),
        supabase.from('personalizado_teams').select('*').eq('tournamentId', id).order('registeredAt', { ascending: true }),
        getPricing(),
      ]);
      setTournament(tRes.data as TournamentDetail | null);
      setTeams((teamsRes.data ?? []) as Team[]);
      setPricing(pRes);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blue} size="large" />
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Torneo no encontrado</Text>
        <Button label="Volver" onPress={() => router.back()} variant="outline" style={{ marginTop: 16 }} />
      </View>
    );
  }

  const totalTeams = tournament.categories?.reduce((s, c) => s + c.maxTeams, 0) ?? 0;

  const statusLabel: Record<string, string> = {
    open: 'Inscripción abierta',
    closed: 'Cerrado',
    draft: 'Borrador',
    completed: 'Finalizado',
  };

  return (
    <View style={styles.root}>
      {/* Dark header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.ring, styles.ringA]} />
        <View style={[styles.ring, styles.ringB]} />

        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.backLabel}>Torneos</Text>
        </View>

        <View style={styles.tournamentHero}>
          <View style={[styles.statusPill, tournament.status === 'open' && styles.statusOpen]}>
            {tournament.status === 'open' && <View style={styles.liveDot} />}
            <Text style={[styles.statusText, tournament.status === 'open' && styles.statusTextOpen]}>
              {statusLabel[tournament.status] ?? tournament.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.tournamentName}>{tournament.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>📅 {new Date(tournament.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</Text>
            <Text style={styles.meta}>👥 {totalTeams} equipos máx.</Text>
            {tournament.code && <Text style={styles.meta}>🔑 #{tournament.code}</Text>}
          </View>
        </View>
      </View>

      {/* Sheet */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handle} />

        {/* Categories */}
        {tournament.categories?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>CATEGORÍAS</Text>
            <View style={styles.categoriesRow}>
              {tournament.categories.map((cat, i) => (
                <View key={i} style={styles.categoryChip}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryMeta}>{cat.maxTeams} eq. · {cat.gender}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Teams registered */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
          EQUIPOS REGISTRADOS ({teams.length})
        </Text>
        {teams.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyText}>Todavía no hay equipos registrados</Text>
          </Card>
        ) : (
          teams.map((team, idx) => (
            <Card key={team.id} style={styles.teamCard} padded={false}>
              <View style={styles.teamInner}>
                <Text style={styles.teamRank}>#{idx + 1}</Text>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{team.player1Name} / {team.player2Name}</Text>
                  <Text style={styles.teamMeta}>{team.categoryName}</Text>
                </View>
              </View>
            </Card>
          ))
        )}

        {/* CTA — only if open */}
        {tournament.status === 'open' && (
          <Button
            label="Inscribir un equipo"
            onPress={() => Alert.alert('Inscripción', 'Usá el link de inscripción pública')}
            fullWidth
            style={{ marginTop: 16 }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  errorText: { fontSize: 16, color: Colors.grey500, fontWeight: '600' },

  header: { backgroundColor: Colors.blueDeep, paddingHorizontal: 20, paddingBottom: 16, overflow: 'hidden' },
  ring: { position: 'absolute', borderRadius: 200, borderWidth: 1, borderColor: 'rgba(26,78,216,0.18)' },
  ringA: { width: 200, height: 200, top: -60, right: -60 },
  ringB: { width: 120, height: 120, top: -10, right: -10, backgroundColor: 'rgba(26,78,216,0.05)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  backArrow: { color: 'rgba(255,255,255,0.7)', fontSize: 22, lineHeight: 26 },
  backLabel: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },

  tournamentHero: { gap: 8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(26,78,216,0.2)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(111,163,255,0.3)' },
  statusOpen: { backgroundColor: 'rgba(30,170,82,0.15)', borderColor: 'rgba(30,170,82,0.4)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  statusText: { fontSize: 10, fontWeight: '700', color: Colors.blueLight, letterSpacing: 0.8 },
  statusTextOpen: { color: Colors.green },
  tournamentName: { fontFamily: 'Oswald_700Bold', fontSize: 22, color: Colors.white, lineHeight: 26 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  meta: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },

  sheet: { flex: 1, backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28 },
  sheetContent: { paddingHorizontal: 16 },
  handle: { width: 38, height: 4, backgroundColor: Colors.grey200, borderRadius: 100, alignSelf: 'center', marginVertical: 12 },

  sectionTitle: { fontSize: 10, fontWeight: '700', color: Colors.grey300, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },

  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  categoryChip: { backgroundColor: Colors.blue50, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(26,78,216,0.1)' },
  categoryName: { fontSize: 12, fontWeight: '700', color: Colors.blue },
  categoryMeta: { fontSize: 10, color: Colors.grey500, marginTop: 2 },

  emptyCard: { alignItems: 'center', paddingVertical: 28 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 13, color: Colors.grey500, fontWeight: '500' },

  teamCard: { marginBottom: 8 },
  teamInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  teamRank: { fontFamily: 'Oswald_700Bold', fontSize: 18, color: Colors.blueLight, width: 28, textAlign: 'center' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 13, fontWeight: '700', color: Colors.black },
  teamMeta: { fontSize: 10, color: Colors.grey500, marginTop: 2 },
});
