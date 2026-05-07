import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/colors';

function SettingRow({ icon, label, sub, onPress, destructive }: {
  icon: string; label: string; sub?: string;
  onPress: () => void; destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={row.wrap} onPress={onPress} activeOpacity={0.7}>
      <View style={row.iconBox}>
        <Text style={row.icon}>{icon}</Text>
      </View>
      <View style={row.body}>
        <Text style={[row.label, destructive && row.labelDanger]}>{label}</Text>
        {sub && <Text style={row.sub}>{sub}</Text>}
      </View>
      {!destructive && <Text style={row.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

const row = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card },
  iconBox:    { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  icon:       { fontSize: 18 },
  body:       { flex: 1 },
  label:      { fontSize: 15, fontWeight: '600', color: C.text },
  labelDanger:{ color: C.danger },
  sub:        { fontSize: 12, color: C.textSub, marginTop: 1 },
  chevron:    { fontSize: 22, color: C.textMuted, marginLeft: 8 },
});

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { void supabase.auth.signOut(); } },
    ]);
  }

  return (
    <View style={[screen.root]}>
      <View style={[screen.header, { paddingTop: insets.top + 12 }]}>
        <Text style={screen.title}>Settings</Text>
      </View>

      <View style={screen.section}>
        <Text style={screen.sectionLabel}>Account</Text>
        <View style={screen.card}>
          <SettingRow icon="🏢" label="Business info" sub="Name, address, hours" onPress={() => {}} />
          <View style={screen.divider} />
          <SettingRow icon="🤖" label="AI config" sub="Model, auto-reply, prompts" onPress={() => {}} />
          <View style={screen.divider} />
          <SettingRow icon="📱" label="WhatsApp" sub="Phone number ID, token" onPress={() => {}} />
          <View style={screen.divider} />
          <SettingRow icon="🎤" label="Voice clone" sub="Train your AI voice" onPress={() => {}} />
        </View>
      </View>

      <View style={screen.section}>
        <Text style={screen.sectionLabel}>Workspace</Text>
        <View style={screen.card}>
          <SettingRow icon="📚" label="Knowledge base" sub="Upload PDFs for AI" onPress={() => {}} />
          <View style={screen.divider} />
          <SettingRow icon="⚡" label="Auto rules" sub="Keyword triggers" onPress={() => {}} />
          <View style={screen.divider} />
          <SettingRow icon="🔀" label="Flows" sub="Visual automation" onPress={() => {}} />
        </View>
      </View>

      <View style={screen.section}>
        <Text style={screen.sectionLabel}>Session</Text>
        <View style={screen.card}>
          <SettingRow icon="🚪" label="Sign out" onPress={handleSignOut} destructive />
        </View>
      </View>

      <Text style={[screen.version, { paddingBottom: insets.bottom + 16 }]}>
        FlowChat v1.0 · Revenue Brain
      </Text>
    </View>
  );
}

const screen = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  header:       {
    backgroundColor: C.card,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  title:        { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  section:      { marginTop: 24, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8, marginLeft: 4 },
  card:         { backgroundColor: C.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  divider:      { height: StyleSheet.hairlineWidth, backgroundColor: C.borderLight, marginLeft: 64 },
  version:      { textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 32 },
});
