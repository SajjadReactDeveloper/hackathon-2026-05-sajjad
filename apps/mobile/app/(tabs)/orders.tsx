import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiCall, type Order, type Workspace } from '@/lib/api';
import { C } from '@/lib/colors';

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: 'rgba(245,158,11,0.12)',  color: '#d97706', label: 'Pending'   },
  confirmed:  { bg: 'rgba(59,130,246,0.12)',  color: '#2563eb', label: 'Confirmed' },
  shipped:    { bg: 'rgba(139,92,246,0.12)',  color: '#7c3aed', label: 'Shipped'   },
  delivered:  { bg: 'rgba(34,197,94,0.12)',   color: '#16a34a', label: 'Delivered' },
  cancelled:  { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626', label: 'Cancelled' },
};

function fraudColor(score: number) {
  if (score >= 70) return { bg: C.dangerLight,  color: C.danger  };
  if (score >= 40) return { bg: C.warningLight, color: C.warning };
  return { bg: 'rgba(34,197,94,0.1)', color: C.primaryDark };
}

function formatPKR(cents: string | number) {
  const n = typeof cents === 'string' ? parseInt(cents, 10) : cents;
  return `PKR ${(n / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

function OrderCard({ order }: { order: Order }) {
  const status = STATUS_COLORS[order.status] ?? STATUS_COLORS['pending']!;
  const fraud  = fraudColor(order.fraudScore);
  const name   = order.contact.displayName ?? order.contact.profileName ?? order.contact.waPhone;

  return (
    <View style={card.wrap}>
      {/* Top row */}
      <View style={card.header}>
        <View style={card.headerLeft}>
          <Text style={card.orderNum}>ORD-{String(order.orderNumber).padStart(4, '0')}</Text>
          <View style={[card.badge, { backgroundColor: status.bg }]}>
            <Text style={[card.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={card.headerRight}>
          <View style={[card.fraudBadge, { backgroundColor: fraud.bg }]}>
            <Text style={[card.fraudText, { color: fraud.color }]}>Risk {order.fraudScore}</Text>
          </View>
          <Text style={card.time}>{timeAgo(order.createdAt)}</Text>
        </View>
      </View>

      {/* Customer */}
      <Text style={card.customer} numberOfLines={1}>{name}</Text>

      {/* Items */}
      {order.items.slice(0, 3).map((item, i) => (
        <View key={i} style={card.itemRow}>
          <Text style={card.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={card.itemQty}>×{item.quantity}</Text>
          <Text style={card.itemPrice}>{formatPKR(item.lineTotalCents)}</Text>
        </View>
      ))}
      {order.items.length > 3 && (
        <Text style={card.moreItems}>+{order.items.length - 3} more items</Text>
      )}

      {/* Total */}
      <View style={card.footer}>
        <Text style={card.via}>via {order.createdVia.replace('_', ' ')}</Text>
        <Text style={card.total}>{formatPKR(order.totalCents)}</Text>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  wrap:       {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select?.({
      android: { elevation: 2 },
      ios:     { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    }),
  },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight:{ alignItems: 'flex-end', gap: 3 },
  orderNum:   { fontSize: 14, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
  badge:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  fraudBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  fraudText:  { fontSize: 10, fontWeight: '700' },
  time:       { fontSize: 11, color: C.textMuted },
  customer:   { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 10 },
  itemRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  itemName:   { flex: 1, fontSize: 13, color: C.text },
  itemQty:    { fontSize: 13, color: C.textSub, marginHorizontal: 8 },
  itemPrice:  { fontSize: 13, fontWeight: '600', color: C.text },
  moreItems:  { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  footer:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderLight },
  via:        { fontSize: 11, color: C.textMuted, textTransform: 'capitalize' },
  total:      { fontSize: 16, fontWeight: '800', color: C.primaryDark },
});

import { Platform } from 'react-native';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders]       = useState<Order[]>([]);
  const [workspaceId, setWsId]    = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const ws = (await apiCall<Workspace[]>('/workspaces/me'))[0];
      if (!ws) return;
      setWsId(ws.id);
      const data = await apiCall<Order[]>('/orders', { workspaceId: ws.id });
      setOrders(data);
    } catch { /* show empty */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <View style={screen.root}>
      <View style={[screen.header, { paddingTop: insets.top + 12 }]}>
        <Text style={screen.title}>Orders</Text>
        <Text style={screen.sub}>{orders.length} total</Text>
      </View>

      {loading ? (
        <View style={screen.center}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(true); }}
              tintColor={C.primary}
            />
          }
          contentContainerStyle={[screen.list, orders.length === 0 && screen.listEmpty]}
          ListEmptyComponent={
            <View style={screen.emptyWrap}>
              <Text style={screen.emptyIcon}>📦</Text>
              <Text style={screen.emptyTitle}>No orders yet</Text>
              <Text style={screen.emptySub}>Orders created via voice notes or AI will appear here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const screen = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  header:     {
    backgroundColor: C.card,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  title:      { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  sub:        { fontSize: 13, color: C.textSub, marginTop: 2 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { paddingTop: 8, paddingBottom: 16 },
  listEmpty:  { flex: 1 },
  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:  { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
});
