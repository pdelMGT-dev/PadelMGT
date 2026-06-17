import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? Colors.white : 'rgba(255,255,255,0.3)';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ display: 'none' }} />
  );
}

// SVG-like icons using View/Text (works on native)
function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? Colors.white : 'rgba(255,255,255,0.3)';
  const icons: Record<string, string> = {
    home:     '⌂',
    torneos:  '⚑',
    clubes:   '▦',
    perfil:   '◉',
  };
  return (
    <Text style={{ fontSize: 18, color, lineHeight: 22 }}>{icons[name] ?? '●'}</Text>
  );
}

function PillTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const routes = state.routes;

  return (
    <View style={[styles.navWrap, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.pillNav}>
        {routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label = options.tabBarLabel ?? options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          // FAB slot (middle, between torneos and clubes)
          if (route.name === '__fab__') {
            return (
              <View key="fab" style={styles.fabWrap}>
                <TouchableOpacity style={styles.fab} onPress={() => {}} activeOpacity={0.85}>
                  <Text style={styles.fabPlus}>+</Text>
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.navItem, isFocused && styles.navItemActive]}
              onPress={onPress}
              activeOpacity={0.75}
            >
              <NavIcon name={route.name} active={isFocused} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MainLayout() {
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="torneos" options={{ title: 'Torneos', href: '/torneos' }} />
      <Tabs.Screen name="clubes" options={{ title: 'Clubes', href: '/clubes' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  navWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  pillNav: {
    backgroundColor: Colors.blueDeep,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    height: 54,
    shadowColor: Colors.blueDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(26,78,216,0.3)',
  },
  navItem: {
    width: 42,
    height: 38,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: { backgroundColor: Colors.blue },
  fabWrap: { width: 60, alignItems: 'center' },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  fabPlus: { color: Colors.white, fontSize: 28, fontWeight: '300', lineHeight: 34 },
});
