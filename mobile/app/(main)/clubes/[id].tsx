import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { getClubRating, setClubRating } from '../../../lib/api';
import { StarRating } from '../../../components/ui/StarRating';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Colors } from '../../../constants/colors';

type ClubDetail = {
  id: string;
  name: string;
  location?: string;
  courts?: number;
  members?: number;
  plan?: string;
  mapsUrl?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
};

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [rating, setRating] = useState<{ average: number | null; count: number; myRating: number | null }>({ average: null, count: 0, myRating: null });
  const [myRating, setMyRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [clubRes, ratingRes] = await Promise.all([
        supabase.from('clubs').select('*').eq('id', id).maybeSingle(),
        getClubRating(id),
      ]);
      setClub(clubRes.data as ClubDetail | null);
      setRating(ratingRes);
      setMyRating(ratingRes.myRating ?? 0);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleRatingChange(star: number) {
    setMyRating(star);
    setSavingRating(true);
    try {
      await setClubRating(id, star);
      const updated = await getClubRating(id);
      setRating(updated);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la calificación');
    } finally {
      setSavingRating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blue} size="large" />
      </View>
    );
  }

  if (!club) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Club no encontrado</Text>
        <Button label="Volver" onPress={() => router.back()} variant="outline" style={{ marginTop: 16 }} />
      </View>
    );
  }

  const ratingStars = Math.round(rating.average ?? 0);

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
          <Text style={styles.backLabel}>Mis Clubes</Text>
        </View>

        <View style={styles.clubHero}>
          <View style={styles.clubIconWrap}>
            <Text style={{ fontSize: 28 }}>▦</Text>
          </View>
          <Text style={styles.clubName}>{club.name}</Text>
          {club.location && (
            <Text style={styles.clubLocation}>📍 {club.location}</Text>
          )}

          {/* Average rating display */}
          {rating.average != null && (
            <View style={styles.avgRatingRow}>
              <StarRating value={ratingStars} size={16} readonly />
              <Text style={styles.avgRatingText}>
                {rating.average.toFixed(1)} · {rating.count} {rating.count === 1 ? 'calificación' : 'calificaciones'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Sheet */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handle} />

        {/* Info grid */}
        {(club.courts != null || club.members != null || club.plan) && (
          <>
            <Text style={styles.sectionTitle}>INFORMACIÓN</Text>
            <View style={styles.infoGrid}>
              {club.courts != null && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoValue}>{club.courts}</Text>
                  <Text style={styles.infoLabel}>Canchas</Text>
                </View>
              )}
              {club.members != null && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoValue}>{club.members}</Text>
                  <Text style={styles.infoLabel}>Miembros</Text>
                </View>
              )}
              {club.plan && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoValue}>{club.plan}</Text>
                  <Text style={styles.infoLabel}>Plan</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Description */}
        {club.description && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>DESCRIPCIÓN</Text>
            <Card style={styles.descCard}>
              <Text style={styles.descText}>{club.description}</Text>
            </Card>
          </>
        )}

        {/* Contact */}
        {(club.phone || club.email || club.website || club.mapsUrl) && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>CONTACTO</Text>
            <View style={styles.contactList}>
              {club.phone && (
                <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${club.phone}`)}>
                  <Text style={styles.contactIcon}>📞</Text>
                  <Text style={styles.contactText}>{club.phone}</Text>
                </TouchableOpacity>
              )}
              {club.email && (
                <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${club.email}`)}>
                  <Text style={styles.contactIcon}>✉️</Text>
                  <Text style={styles.contactText}>{club.email}</Text>
                </TouchableOpacity>
              )}
              {club.mapsUrl && (
                <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(club.mapsUrl!)}>
                  <Text style={styles.contactIcon}>🗺️</Text>
                  <Text style={styles.contactText}>Ver en mapa</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* My rating */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>TU CALIFICACIÓN</Text>
        <Card style={styles.ratingCard}>
          <Text style={styles.ratingPrompt}>¿Cómo calificás este club?</Text>
          <View style={styles.ratingRow}>
            <StarRating
              value={myRating}
              onChange={handleRatingChange}
              size={32}
            />
            {savingRating && (
              <ActivityIndicator color={Colors.blue} size="small" style={{ marginLeft: 8 }} />
            )}
          </View>
          {myRating > 0 && (
            <Text style={styles.ratingConfirm}>
              {['', '⭐ Muy malo', '⭐⭐ Malo', '⭐⭐⭐ Regular', '⭐⭐⭐⭐ Bueno', '⭐⭐⭐⭐⭐ Excelente'][myRating]}
            </Text>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  errorText: { fontSize: 16, color: Colors.grey500, fontWeight: '600' },

  header: { backgroundColor: Colors.blueDeep, paddingHorizontal: 20, paddingBottom: 20, overflow: 'hidden' },
  ring: { position: 'absolute', borderRadius: 200, borderWidth: 1, borderColor: 'rgba(26,78,216,0.18)' },
  ringA: { width: 200, height: 200, top: -60, right: -60 },
  ringB: { width: 120, height: 120, top: -10, right: -10, backgroundColor: 'rgba(26,78,216,0.05)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  backArrow: { color: 'rgba(255,255,255,0.7)', fontSize: 22, lineHeight: 26 },
  backLabel: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },

  clubHero: { gap: 6 },
  clubIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 4 },
  clubName: { fontFamily: 'Oswald_700Bold', fontSize: 24, color: Colors.white },
  clubLocation: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  avgRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  avgRatingText: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },

  sheet: { flex: 1, backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28 },
  sheetContent: { paddingHorizontal: 16 },
  handle: { width: 38, height: 4, backgroundColor: Colors.grey200, borderRadius: 100, alignSelf: 'center', marginVertical: 12 },

  sectionTitle: { fontSize: 10, fontWeight: '700', color: Colors.grey300, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },

  infoGrid: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  infoBox: { flex: 1, backgroundColor: Colors.blue50, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(26,78,216,0.08)' },
  infoValue: { fontFamily: 'Oswald_700Bold', fontSize: 22, color: Colors.blue },
  infoLabel: { fontSize: 10, color: Colors.grey500, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  descCard: { marginBottom: 4 },
  descText: { fontSize: 13, color: Colors.grey700, lineHeight: 20 },

  contactList: { gap: 2 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: Colors.grey100, borderRadius: 12, marginBottom: 6 },
  contactIcon: { fontSize: 16 },
  contactText: { fontSize: 13, color: Colors.blue, fontWeight: '600' },

  ratingCard: { alignItems: 'center', paddingVertical: 20 },
  ratingPrompt: { fontSize: 13, color: Colors.grey700, fontWeight: '600', marginBottom: 14 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingConfirm: { fontSize: 12, color: Colors.grey500, marginTop: 10 },
});
