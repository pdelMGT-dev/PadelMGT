import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style, fullWidth }: Props) {
  const variantStyle = styles[variant];
  const textStyle = textStyles[variant];

  return (
    <TouchableOpacity
      style={[styles.base, variantStyle, fullWidth && { width: '100%' }, (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
    >
      {loading
        ? <ActivityIndicator size="small" color={variant === 'primary' ? Colors.white : Colors.blue} />
        : <Text style={[styles.label, textStyle]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: { backgroundColor: Colors.blue },
  secondary: { backgroundColor: Colors.blueDeep },
  ghost: { backgroundColor: Colors.blue50 },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.blue },
  disabled: { opacity: 0.5 },
  label: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
});

const textStyles = StyleSheet.create({
  primary: { color: Colors.white },
  secondary: { color: Colors.white },
  ghost: { color: Colors.blue },
  outline: { color: Colors.blue },
});
