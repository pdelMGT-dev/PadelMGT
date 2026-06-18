import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = 28, readonly = false }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange?.(star)}
          disabled={readonly}
          activeOpacity={0.7}
          style={[styles.star, { width: size + 4, height: size + 4 }]}
        >
          <View style={[
            styles.starInner,
            { width: size, height: size, borderRadius: size / 2 },
            star <= value ? styles.filled : styles.empty,
          ]}>
            <View style={[styles.starShape, { borderColor: star <= value ? Colors.white : Colors.blue }]} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  star: { alignItems: 'center', justifyContent: 'center' },
  starInner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  filled: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  empty: {
    backgroundColor: Colors.white,
    borderColor: Colors.bluePale,
  },
  starShape: {
    width: 12,
    height: 12,
  },
});
