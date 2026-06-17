import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  name?: string;
  avatarUrl?: string;
  online?: boolean;
  size?: number;
}

export function ProfileAvatar({ name, avatarUrl, online = false, size = 38 }: Props) {
  const initials = name
    ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  return (
    <View style={{ width: size, height: size }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View style={[styles.circle, styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
        </View>
      )}
      {online && (
        <View style={[styles.onlineDot, { bottom: 0, right: 0 }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 2,
    borderColor: 'rgba(111,163,255,0.4)',
  },
  placeholder: {
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.white,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.green,
    borderWidth: 1.5,
    borderColor: Colors.blueDeep,
  },
});
