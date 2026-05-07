import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { apiCall, type Conversation, type Workspace } from '@/lib/api';
import { C } from '@/lib/colors';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name: string | null, phone: string): string {
  if (!name) return phone.slice(-2);
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#8b5cf6','#06b6d4','#f59e0b','#ec4899','#10b981','#3b82f6'];
function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

function ConversationRow({ item, onPress }: { item: Conversation; onPress: () => void }) {
  const name = item.contact.displayName ?? item.contact.profileName ?? item.contact.waPhone;
  const color = avatarColor(item.contact.id);
  const hasUnread = item.unreadCount > 0;

  return (
    <TouchableOpacity style={row.wrap} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={[row.avatar, { backgroundColor: color }]}>
        <Text style={row.avatarText}>{initials(name, item.contact.waPhone)}</Text>
      </View>

      {/* Content */}
      <View style={row.body}>
        <View style={row.top}>
          <Text style={[row.name, hasUnread && row.nameBold]} numberOfLines={1}>{name}</Text>
          <Text style={row.time}>{timeAgo(item.lastMessageAt)}</Text>
        </View>
        <View style={row.bottom}>
          <Text style={[row.preview, hasUnread && row.previewBold]} numberOfLines={1}>
            {item.lastMessagePreview ?? 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={row.badge}>
              <Text style={row.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* AI indicator */}
      {item.aiEnabled && (
        <View style={row.aiDot} />
      )}
    </TouchableOpacity>
  );
}

const row = StyleSheet.create({
  wrap:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card },
  avatar:      { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  body:        { flex: 1, minWidth: 0 },
  top:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  name:        { fontSize: 15, fontWeight: '500', color: C.text, flex: 1, marginRight: 8 },
  nameBold:    { fontWeight: '700' },
  time:        { fontSize: 12, color: C.textMuted },
  bottom:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview:     { fontSize: 13, color: C.textSub, flex: 1, marginRight: 8 },
  previewBold: { color: C.text, fontWeight: '600' },
  badge:       { backgroundColor: C.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  aiDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginLeft: 6 },
});

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const workspaces = await apiCall<Workspace[]>('/workspaces/me');
      const ws = workspaces[0];
      if (!ws) return;
      setWorkspaceId(ws.id);
      const data = await apiCall<Conversation[]>('/conversations', { workspaceId: ws.id });
      setConversations(data);
    } catch { /* show empty */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Supabase Realtime — new messages update the list
  useEffect(() => {
    if (!workspaceId) return;
    const ch = supabase
      .channel(`mobile-convos-${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' },
        () => { void load(true); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [workspaceId, load]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root]}>
      {/* Header — sits below status bar */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Inbox</Text>
        <View style={styles.headerRight}>
          <View style={[styles.onlineDot, { backgroundColor: C.primary }]} />
          <Text style={styles.onlineText}>AI On</Text>
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            onPress={() => router.push(`/(tabs)/inbox/${item.id}` as never)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void load(true); }}
            tintColor={C.primary}
          />
        }
        contentContainerStyle={conversations.length === 0 ? styles.emptyFlex : undefined}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySub}>Messages from WhatsApp will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  header:      {
    backgroundColor: C.card,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  title:       { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingBottom: 4 },
  onlineDot:   { width: 8, height: 8, borderRadius: 4 },
  onlineText:  { fontSize: 12, fontWeight: '600', color: C.primary },
  sep:         { height: StyleSheet.hairlineWidth, backgroundColor: C.borderLight, marginLeft: 74 },
  emptyFlex:   { flex: 1 },
  emptyWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:   { fontSize: 48, marginBottom: 16 },
  emptyTitle:  { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptySub:    { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
});
