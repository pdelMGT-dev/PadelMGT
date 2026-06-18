import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getPersonalizadoTournaments, Tournament } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';

const STATUS_LABEL: Record<string, string> = {
  open:      'Inscripción abierta',
  closed:    'Inscripción cerrada',
  draft:     'Borrador',
  completed: 'Finalizado',
};

const STATUS_COLOR: Record<string, string> = {
  open:      Colors.green,
  closed:    Colors.grey500,
  draft:     Colors.blueLight,
  completed: Colors.grey700,
};

export default function TorneosScreen() {
  const insets = useSafeAreaInsets();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getPersonalizadoTournaments();
    setTournaments(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() { setRefreshing(true); load(); }

  function renderItem({ item }: { item: Tournament }) {
    const statusColor = STATUS_COLOR[item.status] ?? Colors.grey500;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/(main)/torneos/${item.id}` as any)}
      >
        <Card style={styles.card} padded={false}>
          <View style={styles.cardInner}>
            <View style={styles.iconWrap}>
              <Text style={{ fontSize: 24 }}>🏆</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.code && (
                <Text style={styles.code}>#{item.code}</Text>
              )}
              <View style={[styles.statusPill, { borderColor: statusColor + '40', backgroundColor: statusColor + '14' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      {/* Dark header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.ring, styles.ringA]} />
        <View style={[styles.ring, styles.ringB]} />
        <Text style={styles.screenLabel}>MIS TORNEOS</Text>
        <Text style={styles.screenTitle}>Torneos Personalizados</Text>
      </View>

      {/* Sheet */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {loading ? (
          <ActivityIndicator color={Colors.blue} size="large" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={tournaments}
            keyExtractor={(t) => t.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🏆</Text>
                <Text style={styles.emptyTitle}>Sin torneos aún</Text>
                <Text style={styles.emptySub}>Creá tu primer Torneo Personalizado desde la web</Text>
              </View>
            }
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 72 }]}
          activeOpacity={0.85}
          onPress={() => {}}
        >
          <Text style={styles.fabPlus}>+</Text>
        </TouchableOpacity>
      </View>
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

  sheet: { flex: 1, backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, overflow: 'hidden' },
  handle: { width: 38, height: 4, backgroundColor: Colors.grey200, borderRadius: 100, alignSelf: 'center', marginVertical: 12 },
  list: { paddingHorizontal: 16 },

  card: { marginBottom: 10 },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.blue50, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.black },
  code: { fontSize: 11, color: Colors.blueLight, fontWeight: '600' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start' },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  chevron: { fontSize: 22, color: Colors.grey300, lineHeight: 26 },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontFamily: 'Oswald_700Bold', fontSize: 22, color: Colors.grey700, marginBottom: 8 },
  emptySub: { fontSize: 13, color: Colors.grey500, textAlign: 'center', lineHeight: 20 },

  fab: { position: 'absolute', right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 },
  fabPlus: { color: Colors.white, fontSize: 28, fontWeight: '300', lineHeight: 34 },
});
