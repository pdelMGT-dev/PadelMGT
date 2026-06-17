import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { getPlayerClubs, Club } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';

function StarBar({ rating }: { rating: number | null }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <View
          key={s}
          style={[
            styles.starDot,
            s <= (rating ?? 0) ? styles.starFilled : styles.starEmpty,
          ]}
        />
      ))}
    </View>
  );
}

export default function ClubesScreen() {
  const insets = useSafeAreaInsets();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); setRefreshing(false); return; }
    const data = await getPlayerClubs(user.id);
    setClubs(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() { setRefreshing(true); load(); }

  function renderItem({ item }: { item: Club }) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/(main)/clubes/${item.id}` as any)}
      >
        <Card style={styles.card} padded={false}>
          <View style={styles.cardInner}>
            <View style={styles.iconWrap}>
              <Text style={{ fontSize: 24 }}>▦</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.location && (
                <Text style={styles.location} numberOfLines={1}>📍 {item.location}</Text>
              )}
              <View style={styles.metaRow}>
                {item.courts != null && (
                  <Text style={styles.metaChip}>🎾 {item.courts} canchas</Text>
                )}
                {item.members != null && (
                  <Text style={styles.metaChip}>👥 {item.members} miembros</Text>
                )}
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
        <Text style={styles.screenLabel}>MIS CLUBES</Text>
        <Text style={styles.screenTitle}>Mis Clubes</Text>
      </View>

      {/* Sheet */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {loading ? (
          <ActivityIndicator color={Colors.blue} size="large" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={clubs}
            keyExtractor={(c) => c.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>▦</Text>
                <Text style={styles.emptyTitle}>Sin clubes aún</Text>
                <Text style={styles.emptySub}>Todavía no estás asociado a ningún club</Text>
              </View>
            }
          />
        )}
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
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.black },
  location: { fontSize: 11, color: Colors.grey500 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaChip: { fontSize: 10, color: Colors.blueLight, fontWeight: '600' },
  chevron: { fontSize: 22, color: Colors.grey300, lineHeight: 26 },

  starRow: { flexDirection: 'row', gap: 3 },
  starDot: { width: 8, height: 8, borderRadius: 4 },
  starFilled: { backgroundColor: Colors.blue },
  starEmpty: { backgroundColor: Colors.grey200 },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontFamily: 'Oswald_700Bold', fontSize: 22, color: Colors.grey700, marginBottom: 8 },
  emptySub: { fontSize: 13, color: Colors.grey500, textAlign: 'center', lineHeight: 20 },
});
