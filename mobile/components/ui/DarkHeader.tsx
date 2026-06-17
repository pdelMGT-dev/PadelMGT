import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

interface Props {
  showLogo?: boolean;
  title?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
}

export function DarkHeader({ showLogo = true, title, onBack, rightElement, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Decorative rings */}
      <View style={[styles.ring, styles.ringA]} />
      <View style={[styles.ring, styles.ringB]} />

      {/* Top row */}
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
        ) : showLogo ? (
          <Image
            source={require('../../assets/logo-white.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.titleText}>{title}</Text>
        )}

        <View style={styles.rightSlot}>
          {rightElement}
        </View>
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.blueDeep,
    paddingHorizontal: 20,
    paddingBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderRadius: 200,
    borderWidth: 1,
    borderColor: 'rgba(26,78,216,0.18)',
  },
  ringA: { width: 220, height: 220, top: -70, right: -70 },
  ringB: { width: 130, height: 130, top: -20, right: -20, backgroundColor: 'rgba(26,78,216,0.05)' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: { height: 26, width: 140 },
  titleText: {
    fontWeight: '700',
    fontSize: 18,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backArrow: { color: 'rgba(255,255,255,0.7)', fontSize: 22, lineHeight: 26 },
  rightSlot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
