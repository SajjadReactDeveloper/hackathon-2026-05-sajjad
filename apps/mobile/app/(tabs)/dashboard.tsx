import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiCall, type DashboardTiles, type Workspace } from '@/lib/api';
import { C } from '@/lib/colors';

function formatPKR(cents: number) {
  if (cents === 0) return 'PKR 0';
  const val = cents / 100;
  if (val >= 1_000_000) return `PKR ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `PKR ${(val / 1_000).toFixed(0)}K`;
  return `PKR ${val.toFixed(0)}`;
}

interface TileConfig {
  key: keyof DashboardTiles;
  label: string;
  sub: string;
  gradient: [string, string];
  format: (v: number) => string;
}

const TILES: TileConfig[] = [
  {
    key: 'todayRevenueCents',
    label: "Today's Revenue",
    sub: 'confirmed orders',
    gradient: ['#22c55e', '#16a34a'],
    format: formatPKR,
  },
  {
    key: 'weekRevenueCents',
    label: 'This Week',
    sub: '7-day revenue',
    gradient: ['#8b5cf6', '#7c3aed'],
    format: formatPKR,
  },
  {
    key: 'totalOrders',
    label: 'Total Orders',
    sub: 'all time',
    gradient: ['#06b6d4', '#0891b2'],
    format: (v) => v.toLocaleString(),
  },
  {
    key: 'aiReplyRate',
    label: 'AI Reply Rate',
    sub: 'automated',
    gradient: ['#ec4899', '#db2777'],
    format: (v) => `${v}%`,
  },
  {
    key: 'openConversations',
    label: 'Open Chats',
    sub: 'awaiting reply',
    gradient: ['#f59e0b', '#d97706'],
    format: (v) => v.toLocaleString(),
  },
  {
    key: 'totalMessages',
    label: 'Messages',
    sub: 'processed total',
    gradient: ['#10b981', '#059669'],
    format: (v) => v.toLocaleString(),
  },
];

function StatCard({ cfg, value }: { cfg: TileConfig; value: number }) {
  return (
    <View style={[tile.wrap, { backgroundColor: cfg.gradient[0] }]}>
      {/* Decorative circles */}
      <View style={tile.circle1} />
      <View style={tile.circle2} />

      <Text style={tile.label}>{cfg.label}</Text>
      <Text style={tile.value}>{cfg.format(value)}</Text>
      <Text style={tile.sub}>{cfg.sub}</Text>
    </View>
  );
}

const tile = StyleSheet.create({
  wrap:    {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    minHeight: 110,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      android: { elevation: 4 },
      ios:     { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    }),
  },
  circle1: {
    position: 'absolute', top: -20, right: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  circle2: {
    position: 'absolute', bottom: -24, right: -8,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  label: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  value: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 30 },
  sub:   { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
});

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData]           = useState<DashboardTiles | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const ws = (await apiCall<Workspace[]>('/workspaces/me'))[0];
      if (!ws) return;
      const tiles = await apiCall<DashboardTiles>('/analytics/tiles', { workspaceId: ws.id });
      setData(tiles);
    } catch { /* show zeros */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const tiles = data ?? {
    todayRevenueCents: 0, weekRevenueCents: 0, monthRevenueCents: 0,
    totalMessages: 0, aiReplyRate: 0, openConversations: 0, totalOrders: 0,
  };

  return (
    <View style={screen.root}>
      {/* Header */}
      <View style={[screen.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={screen.title}>Dashboard</Text>
          <Text style={screen.sub}>Revenue Brain — live metrics</Text>
        </View>
        <View style={screen.liveBadge}>
          <View style={screen.liveDot} />
          <Text style={screen.liveText}>LIVE</Text>
        </View>
      </View>

      {loading ? (
        <View style={screen.center}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={screen.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(true); }}
              tintColor={C.primary}
            />
          }
        >
          {/* Monthly revenue feature tile */}
          <View style={[featureTile.wrap]}>
            <View style={featureTile.circle} />
            <Text style={featureTile.eyebrow}>Monthly Revenue</Text>
            <Text style={featureTile.big}>{formatPKR(tiles.monthRevenueCents)}</Text>
            <Text style={featureTile.sub}>Rolling 30 days · {tiles.totalOrders} orders total</Text>
          </View>

          {/* Grid */}
          <View style={screen.grid}>
            {TILES.map((cfg, i) => (
              <View key={cfg.key} style={screen.gridCell}>
                <StatCard cfg={cfg} value={tiles[cfg.key] as number} />
              </View>
            ))}
          </View>

          {/* AI insight strip */}
          <View style={insightStrip.wrap}>
            <Text style={insightStrip.icon}>🤖</Text>
            <Text style={insightStrip.text}>
              AI handled <Text style={insightStrip.bold}>{tiles.aiReplyRate}%</Text> of messages automatically.
              {tiles.openConversations > 0
                ? ` ${tiles.openConversations} conversation${tiles.openConversations !== 1 ? 's' : ''} still need your attention.`
                : ' All conversations handled.'}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const featureTile = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    borderRadius: 20,
    padding: 22,
    backgroundColor: C.primary,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      android: { elevation: 6 },
      ios:     { shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
    }),
  },
  circle: {
    position: 'absolute', top: -30, right: -30,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  eyebrow:{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  big:    { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  sub:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
});

const insightStrip = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    marginTop: 8,
    backgroundColor: 'rgba(34,197,94,0.07)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  icon: { fontSize: 18 },
  text: { flex: 1, fontSize: 13, color: C.textSub, lineHeight: 19 },
  bold: { fontWeight: '700', color: C.primaryDark },
});

const screen = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.card,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  title:  { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  sub:    { fontSize: 13, color: C.textSub, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingBottom: 4 },
  liveDot:   { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.danger },
  liveText:  { fontSize: 10, fontWeight: '800', color: C.danger, letterSpacing: 0.8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 24 },
  grid:   { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  gridCell: { width: '47%', marginHorizontal: '1.5%' },
});
