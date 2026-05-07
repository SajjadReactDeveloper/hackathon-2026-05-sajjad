import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { C } from '@/lib/colors';

// ─── icons ────────────────────────────────────────────────────────────────────

function InboxIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[icon.wrap, focused && icon.wrapActive]}>
      <View style={[icon.dot, { backgroundColor: focused ? C.primary : 'transparent' }, focused && icon.dotActive]} />
      {/* Chat bubble SVG path approximated with Views */}
      <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[icon.bubble, focused && icon.bubbleFocused]} />
        <View style={[icon.bubbleTail, focused && icon.bubbleTailFocused]} />
      </View>
    </View>
  );
}

// Use simple letter-based labels as icon stand-ins — clean and readable
const TAB_ICONS: Record<string, { label: string; emoji: string }> = {
  inbox:     { label: 'Inbox',     emoji: '💬' },
  orders:    { label: 'Orders',    emoji: '📦' },
  dashboard: { label: 'Dashboard', emoji: '📊' },
  settings:  { label: 'Settings',  emoji: '⚙️' },
};

// ─── custom tab bar ───────────────────────────────────────────────────────────
// Renders behind the Android gesture navigation bar.
// paddingBottom = max(insets.bottom, 4) keeps items above the gesture zone.
// The bar background fills the full area including behind the gesture bar.

function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // On Android with gesture navigation, insets.bottom is typically 24–34dp.
  // We add that as padding so tappable areas stay above the gesture zone.
  // We add 8dp of visible padding on top of the inset for breathing room.
  const bottomPad = Math.max(insets.bottom, 0) + 8;

  return (
    <View style={[bar.container, { paddingBottom: bottomPad }]}>
      {/* Separator */}
      <View style={bar.separator} />

      <View style={bar.row}>
        {state.routes.map((route: { key: string; name: string }, index: number) => {
          const { options } = descriptors[route.key] ?? {};
          const focused = state.index === index;
          const config = TAB_ICONS[route.name] ?? { label: route.name, emoji: '•' };

          function onPress() {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          function onLongPress() {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          }

          return (
            <TouchableOpacity
              key={route.key}
              style={bar.tab}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? config.label}
            >
              {/* Active pill background */}
              {focused && <View style={bar.activePill} />}

              {/* Icon */}
              <Text style={[bar.icon, focused && bar.iconFocused]}>
                {config.emoji}
              </Text>

              {/* Label */}
              <Text
                style={[bar.label, focused && bar.labelFocused]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const bar = StyleSheet.create({
  container: {
    backgroundColor: C.card,
    // Extend background behind Android gesture nav bar
    // (the SafeArea inset adds space ABOVE the bar already)
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
      },
    }),
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  row: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    position: 'relative',
    minHeight: 52,
    justifyContent: 'center',
  },
  activePill: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    bottom: 0,
    backgroundColor: C.primaryLight,
    borderRadius: 14,
  },
  icon:        { fontSize: 20, marginBottom: 2 },
  iconFocused: { },
  label:       { fontSize: 10, fontWeight: '600', color: C.textMuted, letterSpacing: 0.1 },
  labelFocused:{ color: C.primaryDark, fontWeight: '700' },
});

const icon = StyleSheet.create({
  wrap:          { },
  wrapActive:    { },
  dot:           { },
  dotActive:     { },
  bubble:        { width: 18, height: 14, borderRadius: 6, borderWidth: 2, borderColor: C.textMuted },
  bubbleFocused: { borderColor: C.primary },
  bubbleTail:    { width: 6, height: 6, borderRadius: 2, backgroundColor: C.textMuted, marginTop: -3, marginLeft: -6 },
  bubbleTailFocused: { backgroundColor: C.primary },
});

// ─── layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
