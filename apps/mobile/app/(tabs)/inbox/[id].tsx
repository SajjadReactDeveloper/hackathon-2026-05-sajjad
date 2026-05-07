import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { apiCall, type Message, type Conversation, type Workspace } from '@/lib/api';
import { C } from '@/lib/colors';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Bubble({ msg }: { msg: Message }) {
  const out = msg.direction === 'outbound';
  return (
    <View style={[bubble.row, out && bubble.rowOut]}>
      <View style={[bubble.wrap, out ? bubble.wrapOut : bubble.wrapIn]}>
        {/* AI badge */}
        {msg.aiGenerated && (
          <View style={bubble.aiBadge}>
            <Text style={bubble.aiText}>AI</Text>
          </View>
        )}

        {/* Transcription (voice notes) */}
        {msg.transcription && !msg.textBody && (
          <View style={bubble.transcription}>
            <Text style={[bubble.transcText, out && { color: 'rgba(255,255,255,0.8)' }]}>
              🎤 {msg.transcription}
            </Text>
          </View>
        )}

        {/* Text body */}
        {msg.textBody && (
          <Text style={[bubble.text, out && bubble.textOut]}>
            {msg.textBody}
          </Text>
        )}

        {/* Time */}
        <Text style={[bubble.time, out && bubble.timeOut]}>
          {formatTime(msg.createdAt)}
          {out && msg.aiGenerated ? ' · AI' : ''}
        </Text>
      </View>
    </View>
  );
}

const bubble = StyleSheet.create({
  row:          { paddingHorizontal: 12, paddingVertical: 2, flexDirection: 'row' },
  rowOut:       { justifyContent: 'flex-end' },
  wrap:         { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  wrapIn:       { backgroundColor: C.bubbleIn, borderBottomLeftRadius: 4 },
  wrapOut:      { backgroundColor: C.bubbleOut, borderBottomRightRadius: 4 },
  aiBadge:      {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 4,
  },
  aiText:       { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 },
  transcription:{ marginBottom: 4 },
  transcText:   { fontSize: 13, color: C.textSub, fontStyle: 'italic', lineHeight: 18 },
  text:         { fontSize: 15, color: C.bubbleInText, lineHeight: 21 },
  textOut:      { color: C.bubbleOutText },
  time:         { fontSize: 11, color: C.textMuted, marginTop: 3, alignSelf: 'flex-end' },
  timeOut:      { color: 'rgba(255,255,255,0.65)' },
});

// ─── main component ───────────────────────────────────────────────────────────

export default function ThreadScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages]         = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [workspaceId, setWorkspaceId]   = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [text, setText]                 = useState('');
  const [sending, setSending]           = useState(false);

  const load = useCallback(async () => {
    try {
      const workspaces = await apiCall<Workspace[]>('/workspaces/me');
      const ws = workspaces[0];
      if (!ws) return;
      setWorkspaceId(ws.id);

      const [msgs, conv] = await Promise.all([
        apiCall<Message[]>(`/messages/${conversationId}`, { workspaceId: ws.id }),
        apiCall<Conversation>(`/conversations/${conversationId}`, { workspaceId: ws.id }),
      ]);
      setMessages(msgs);
      setConversation(conv);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [conversationId]);

  useEffect(() => { void load(); }, [load]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Realtime — append new messages instantly
  useEffect(() => {
    if (!workspaceId) return;
    const ch = supabase
      .channel(`mobile-thread-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => [...prev, row]);
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [workspaceId, conversationId]);

  async function handleSend() {
    const body = text.trim();
    if (!body || !workspaceId || sending) return;
    setSending(true);
    setText('');
    try {
      await apiCall(`/messages/send`, {
        method: 'POST',
        body: JSON.stringify({ conversationId, text: body }),
        workspaceId,
      });
    } catch { /* silent — realtime will bring the message anyway */ }
    finally { setSending(false); }
  }

  const contactName =
    conversation?.contact.displayName ??
    conversation?.contact.profileName ??
    conversation?.contact.waPhone ??
    '…';

  // ──── gesture-safe composer ────────────────────────────────────────────────
  // On Android with gesture navigation:
  //   - KeyboardAvoidingView pushes content up when keyboard appears
  //   - When keyboard is hidden, paddingBottom = insets.bottom keeps the
  //     send bar above the gesture navigation strip
  //   - We do NOT add extra padding when keyboard is visible (it handles that)

  const composerPad = Platform.OS === 'android' ? insets.bottom : 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{contactName}</Text>
          {conversation?.aiEnabled && (
            <Text style={styles.headerSub}>AI replies enabled</Text>
          )}
        </View>

        {/* AI toggle */}
        {conversation && workspaceId && (
          <TouchableOpacity
            style={[styles.aiToggle, conversation.aiEnabled && styles.aiToggleOn]}
            onPress={async () => {
              try {
                await apiCall(`/conversations/${conversationId}/toggle-ai`, {
                  method: 'POST',
                  workspaceId,
                });
                setConversation((c) => c ? { ...c, aiEnabled: !c.aiEnabled } : c);
              } catch { /* silent */ }
            }}
          >
            <Text style={[styles.aiToggleText, conversation.aiEnabled && styles.aiToggleTextOn]}>
              AI
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Bubble msg={item} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No messages yet.</Text>
            </View>
          }
        />
      )}

      {/* Composer
          paddingBottom accounts for Android gesture nav strip when keyboard is hidden.
          iOS uses the KeyboardAvoidingView padding behavior instead. */}
      <View style={[styles.composer, { paddingBottom: composerPad + 10 }]}>
        <TextInput
          style={styles.composerInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={C.textMuted}
          multiline
          maxLength={4096}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.sendIcon}>↑</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#eef2f7' },

  header:         {
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    gap: 10,
    ...Platform.select({
      android: { elevation: 3 },
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    }),
  },
  backBtn:        { padding: 4 },
  backIcon:       { fontSize: 32, color: C.primary, lineHeight: 36, marginTop: -4 },
  headerInfo:     { flex: 1 },
  headerName:     { fontSize: 16, fontWeight: '700', color: C.text },
  headerSub:      { fontSize: 11, color: C.primary, fontWeight: '600', marginTop: 1 },
  aiToggle:       {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.bg,
  },
  aiToggleOn:     { backgroundColor: C.primaryLight, borderColor: C.primary },
  aiToggleText:   { fontSize: 12, fontWeight: '700', color: C.textSub },
  aiToggleTextOn: { color: C.primaryDark },

  loadingWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList:    { paddingVertical: 12 },
  emptyWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText:      { color: C.textMuted, fontSize: 14 },

  composer:       {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: C.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    gap: 8,
  },
  composerInput:  {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
    lineHeight: 20,
  },
  sendBtn:        {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 3 },
      ios: { shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    }),
  },
  sendBtnDisabled:{ backgroundColor: C.border, elevation: 0 },
  sendIcon:       { fontSize: 20, color: '#fff', fontWeight: '700', marginTop: -2 },
});
